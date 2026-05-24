const Candidate = require('../models/Candidate');
const Drive = require('../models/Drive');
const AssessmentTest = require('../models/AssessmentTest');
const emailQueue = require('../queues/emailQueue');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { clearCache } = require('../middleware/cacheMiddleware');
const cacheManager = require('../utils/cache/cacheManager');

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const { validateResponses } = require('../utils/validation/dynamicValidator');

exports.registerCandidate = async (req, res) => {
    try {
        const {
            email, driveId, responses
        } = req.body;

        // Backward compatibility: Extract core fields if they exist at top level or in responses
        let { name, contact, university, cgpa, academicPerformance } = req.body;

        // Final CGPA resolution
        const finalCgpa = cgpa || academicPerformance || (responses && (responses.cgpa || responses.academicPerformance));

        // Check if drive exists
        const drive = await Drive.findById(driveId).lean();
        if (!drive) {
            return res.status(404).json({ msg: 'Assessment Drive not found' });
        }

        // Check if drive has ended
        if (drive.endTime && new Date(drive.endTime) < new Date()) {
            return res.status(400).json({ msg: 'Registration for this drive has closed' });
        }

        // Check if candidate already registered for THIS drive
        let candidate = await Candidate.findOne({ email, drive: driveId }).lean();
        if (candidate) {
            return res.status(400).json({ msg: 'You have already registered for this drive' });
        }

        // --- NEW: DYNAMIC FORM VALIDATION ---
        if (drive.formSchema && drive.formSchema.length > 0) {
            if (!responses) {
                return res.status(400).json({ msg: 'Application data (responses) is required' });
            }
            const validationErrors = validateResponses(drive.formSchema, responses);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    msg: 'Validation Failed',
                    errors: validationErrors.map(e => ({ msg: e.msg, path: e.fieldId }))
                });
            }
        }

        const safeNumber = (val) => {
            const num = Number(val);
            return isNaN(num) ? undefined : num;
        };

        // Static fields for backward compatibility, mapped from responses if needed
        const mappedName = name || responses?.fullName || responses?.name;
        const mappedContact = contact || responses?.phone || responses?.contact;
        const mappedUniversity = university || responses?.university || responses?.college || drive.university;

        candidate = new Candidate({
            ...req.body, // Catch-all for other optional fields
            name: mappedName,
            email,
            contact: mappedContact,
            university: mappedUniversity,
            cgpa: safeNumber(finalCgpa),
            academicPerformance: safeNumber(finalCgpa),
            responses: responses || {},
            drive: driveId
        });

        await candidate.save();

        // Clear related caches immediately for real-time reflection
        if (drive.createdBy) {
            const cachePattern = `candidates:admin:${drive.createdBy.toString()}`;
            await cacheManager.clearPattern(cachePattern);
        }
        await cacheManager.clearPattern('dashboard');
        
        await Promise.all([
            clearCache('/api/candidates'),
            clearCache('/api/drives'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: 'Registration successful', candidate });
    } catch (err) {
        console.error('Registration Error:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Validation Failed', errors: messages });
        }
        res.status(500).json({ msg: 'Internal Server Error', error: err.message });
    }
};

exports.saveDraft = async (req, res) => {
    try {
        const { email, driveId } = req.body;

        // Whitelist allowed fields to prevent mass assignment
        const allowedFields = [
            'name', 'email', 'contact', 'whatsapp', 'currentCity', 'homeState',
            'educationLevel', 'yearOfStudy', 'semester', 'expectedGraduationYear',
            'major', 'academicPerformance', 'backlogs', 'university',
            'workExperience', 'currentCompany', 'currentRole', 'noticePeriod',
            'currentCTC', 'expectedCTC',
            'internshipExperience', 'internshipCompany',
            'internshipDuration', 'internshipRole', 'technicalSkills',
            'portfolioLink', 'linkedinProfile', 'cgpa'
        ];
        const sanitizedData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                sanitizedData[field] = req.body[field];
            }
        }

        // Find existing draft if any
        let candidate = await Candidate.findOne({ email, drive: driveId, isShortlisted: false });

        if (candidate) {
            // Update existing with only allowed fields
            Object.assign(candidate, sanitizedData);
            await candidate.save();
        } else {
            // Create new draft
            candidate = new Candidate({
                ...sanitizedData,
                drive: driveId
            });
            await candidate.save();
        }

        // Clear related caches
        await Promise.all([
            clearCache('/api/candidates'),
            clearCache('/api/drives'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: 'Draft saved successfully', candidate });
    } catch (err) {
        console.error('Draft Save Error:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ msg: 'Draft Validation Failed', errors: messages });
        }
        res.status(500).json({ msg: 'Internal Server Error', error: err.message });
    }
};

exports.getCandidatesByDrive = async (req, res) => {
    try {
        const drive = await Drive.findById(req.params.driveId);
        if (!drive) return res.status(404).json({ msg: 'Drive not found' });
        
        if (drive.createdBy && drive.createdBy.toString() !== req.admin.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const cacheKey = `candidates:drive:${req.params.driveId}:p${page}:l${limit}`;
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const [total, candidates] = await Promise.all([
            Candidate.countDocuments({ drive: req.params.driveId }),
            Candidate.find({ drive: req.params.driveId })
                .select('-responses')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const response = {
            candidates,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
        };

        await cacheManager.set(cacheKey, response, 60);
        res.json(response);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const buildQueryFilters = require('../utils/buildQueryFilters');

exports.getAllCandidates = async (req, res) => {
    try {
        const drivesCacheKey = `admin_drives:${req.admin.id}`;
        let adminDriveIds = await cacheManager.get(drivesCacheKey);

        if (!adminDriveIds) {
            const drives = await Drive.find({ createdBy: req.admin.id }).select('_id').lean();
            adminDriveIds = drives.map(d => d._id.toString());
            await cacheManager.set(drivesCacheKey, adminDriveIds, 300);
        } else if (typeof adminDriveIds === 'string') {
            try {
                adminDriveIds = JSON.parse(adminDriveIds);
            } catch (e) {
                adminDriveIds = [adminDriveIds];
            }
        }

        const { driveId, isShortlisted, ...filteredQuery } = req.query;

        const baseQuery = {
            drive: driveId ?
                (adminDriveIds.includes(driveId) ? driveId : { $in: [] }) :
                { $in: adminDriveIds }
        };

        if (isShortlisted === 'true') baseQuery.isShortlisted = true;
        else if (isShortlisted === 'false') baseQuery.isShortlisted = { $ne: true };

        const { mongoQuery, pagination } = buildQueryFilters(filteredQuery, {
            searchFields: ['name', 'email', 'university'],
            numericFields: ['cgpa', 'academicPerformance', 'workExperience', 'currentCTC', 'expectedCTC'],
            exactMatchFields: ['drive', 'major', 'educationLevel'],
            multiSelectFields: ['technicalSkills'],
            useResponsesMap: true,
            baseQuery
        });

        if (req.query.minCgpa) {
            const min = parseFloat(req.query.minCgpa);
            if (!isNaN(min)) {
                mongoQuery.$and = mongoQuery.$and || [];
                mongoQuery.$and.push({
                    $or: [
                        { cgpa: { $gte: min } },
                        { academicPerformance: { $gte: min } }
                    ]
                });
            }
        }

        const cacheKey = `candidates:admin:${req.admin.id}:p${pagination.page}:l${pagination.limit}:q:${JSON.stringify(req.query)}`;
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const [total, candidates] = await Promise.all([
            Candidate.countDocuments(mongoQuery),
            Candidate.find(mongoQuery)
                .select('name email contact university isShortlisted cgpa academicPerformance technicalSkills workExperience currentCTC expectedCTC responses')
                .populate('drive', 'name')
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean()
        ]);

        const response = {
            candidates,
            total,
            totalPages: Math.ceil(total / pagination.limit),
            currentPage: pagination.page,
            limit: pagination.limit
        };

        await cacheManager.set(cacheKey, response, 120);
        res.json(response);
    } catch (err) {
        console.error('Get All Candidates error:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.shortlistCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) {
            return res.status(404).json({ msg: 'Candidate not found' });
        }

        // Verify the candidate's drive belongs to this admin
        const drive = await Drive.findById(candidate.drive);
        if (!drive || drive.createdBy.toString() !== req.admin.id) {
            return res.status(403).json({ msg: 'Not authorized to shortlist this candidate' });
        }

        candidate.isShortlisted = true;
        await candidate.save();

        const shortlistEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                .header { background: #4843D2; padding: 40px 20px; text-align: center; }
                .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; text-transform: uppercase; }
                .logo-subtext { color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 700; letter-spacing: 0.4em; margin-top: 4px; text-transform: uppercase; }
                .content { padding: 40px 30px; }
                .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
                .status-badge { display: inline-block; padding: 6px 16px; background: #f0fdf4; color: #16a34a; border-radius: 99px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 24px; border: 1px solid #dcfce7; }
                .message-text { font-size: 14px; color: #64748b; margin-bottom: 30px; line-height: 1.8; }
                .next-steps { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                .step-title { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
                .step-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
                .step-dot { width: 6px; hieght: 6px; background: #4843D2; border-radius: 50%; margin-top: 6px; margin-right: 12px; flex-shrink: 0; }
                .step-text { font-size: 13px; font-weight: 600; color: #334155; }
                .footer { padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; background: #fafafa; }
                .footer-text { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
                .highlight { color: #4843D2; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <p class="logo-text">SHORTLISTO/p>
                    <p class="logo-subtext">Assessment</p>
                </div>
                <div class="content">
                    <div class="status-badge">Application Update</div>
                    <p class="greeting">Congratulations, ${candidate.name}!</p>
                    <p class="message-text">We are pleased to inform you that your profile has been <span class="highlight">shortlisted</span> for the next stage of our recruitment process. Your performance and background stood out to our evaluation team.</p>
                    
                    <div class="next-steps">
                        <p class="step-title">What happens next?</p>
                        <div class="step-item">
                            <div class="step-dot"></div>
                            <p class="step-text">You will receive a separate invitation email containing your unique assessment credentials.</p>
                        </div>
                        <div class="step-item">
                            <div class="step-dot"></div>
                            <p class="step-text">The invitation will include the scheduled date, time, and instructions for the online test.</p>
                        </div>
                    </div>

                    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Best Regards,</p>
                    <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">Shortlisto Team</p>
                </div>
                <div class="footer">
                    <p class="footer-text">Powered by Shortlisto</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // Offload email to background queue
        await emailQueue.add('shortlistNotification', {
            to: candidate.email,
            subject: 'Shortlisted - Shortlisto',
            text: `Dear ${candidate.name},\n\nWe are pleased to inform you that you have been shortlisted for the next round. You will receive a separate email with assessment details shortly.\n\nBest Regards,\nShortlisto Team`,
            html: shortlistEmailHtml
        });

        // Clear related caches
        await cacheManager.clearPattern(`candidates:admin:${req.admin.id}`);
        await cacheManager.clearPattern('dashboard');
        await Promise.all([
            clearCache('/api/candidates'),
            clearCache('/api/drives'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: 'Candidate shortlisted successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.bulkShortlist = async (req, res) => {
    try {
        // Get all drives created by this admin for authorization
        const drives = await Drive.find({ createdBy: req.admin.id });
        const adminDriveIds = drives.map(d => d._id.toString());

        // Strip driveId from body since it's handled in baseQuery as 'drive'
        const { driveId: bulkDriveId, ...filteredBody } = req.body;

        // Configure filtering utility for bulk operation
        const { mongoQuery } = buildQueryFilters(filteredBody, {
            searchFields: ['name', 'email', 'university'],
            numericFields: ['cgpa', 'academicPerformance', 'workExperience', 'currentCTC', 'expectedCTC'],
            exactMatchFields: ['drive', 'major', 'educationLevel'],
            multiSelectFields: ['technicalSkills'],
            useResponsesMap: true,
            baseQuery: {
                isShortlisted: { $ne: true }, // Only target pending
                drive: bulkDriveId ?
                    (adminDriveIds.includes(bulkDriveId) ? bulkDriveId : { $in: [] }) :
                    { $in: adminDriveIds }
            }
        });

        const candidates = await Candidate.find(mongoQuery).lean();

        if (candidates.length === 0) {
            return res.status(400).json({ msg: 'No pending candidates found matching the criteria' });
        }

        await Candidate.updateMany(
            { _id: { $in: candidates.map(c => c._id) } },
            { $set: { isShortlisted: true } }
        );

        // Clear related caches
        await cacheManager.clearPattern(`candidates:admin:${req.admin.id}`);
        await cacheManager.clearPattern('dashboard');
        await cacheManager.del(`admin_drives:${req.admin.id}`);
        await Promise.all([
            clearCache('/api/candidates'),
            clearCache('/api/drives'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: `Successfully shortlisted ${candidates.length} candidates` });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.sendAssessment = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id).populate('drive');
        if (!candidate) return res.status(404).json({ msg: 'Candidate not found' });

        // Generate or regenerate credentials
        const plainPassword = crypto.randomBytes(4).toString('hex');
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        candidate.assessmentCredentials = { password: hashedPassword };
        await candidate.save();

        const { assessmentTestId } = req.body;

        // Get Test Timing
        // Verify AssessmentTest existence
        let test = null;
        if (assessmentTestId) {
            test = await AssessmentTest.findById(assessmentTestId);
            if (!test) return res.status(404).json({ msg: 'Selected Assessment Test not found' });

            // Link Candidate to this test
            candidate.assessmentTest = test._id;
            await candidate.save();
        } else {
            // Fallback or error? User wants "Select Assessment". 
            // If frontend forces selection, we should be good. 
            // If nothing passed, maybe check if any exist?
            test = await AssessmentTest.findOne({ drive: candidate.drive._id }).sort({ createdAt: -1 });
        }

        let timeString = "";
        let testName = "";
        if (test) {
            const start = new Date(test.startTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const end = new Date(test.endTime).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            timeString = `\n\nAssessment Schedule (${test.name || 'Standard'}):\nStart: ${start}\nEnd: ${end}`;
            testName = test.name;
        } else {
            return res.status(400).json({ msg: 'No assessment schedule found. Please create one first.' });
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        await emailQueue.add('assessmentInvite', {
            to: candidate.email,
            subject: `Assessment Invitation - ${testName} - Shortlisto`,
            text: `Dear ${candidate.name},\n\nYou are invited to take the online assessment.${timeString}\n\nAssessment Link: ${clientUrl}/assessment/login\nLogin Email: ${candidate.email}\nPassword: ${plainPassword || '(previously sent)'}\n\nPlease login 5 minutes before the start time to read instructions.`
        });

        res.json({ msg: 'Assessment invitation sent successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.bulkSendAssessment = async (req, res) => {
    try {
        const { driveId, assessmentTestId } = req.body;

        // Verify AssessmentTest
        const test = await AssessmentTest.findById(assessmentTestId);
        if (!test) return res.status(404).json({ msg: 'Assessment Test not found' });

        // Calculate time strings for HTML email
        const startTimeStr = new Date(test.startTime).toLocaleString('en-US', { 
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const endTimeStr = new Date(test.endTime).toLocaleString('en-US', { 
            timeZone: 'Asia/Kolkata',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const timeStringPlain = `\n\nAssessment Schedule (${test.name || 'Standard'}):\nStart: ${startTimeStr}\nEnd: ${endTimeStr}`;

        // Find all shortlisted candidates for this drive who HAVEN'T been sent an invite (optionally)
        // For simplicity, find all shortlisted for this drive
        const candidates = await Candidate.find({
            drive: driveId,
            isShortlisted: true
        });

        if (candidates.length === 0) {
            return res.status(400).json({ msg: 'No shortlisted candidates found for this drive' });
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

        const emailJobs = [];
        for (const candidate of candidates) {
            let plainPassword = null;

            // Check if this specific test is already assigned in the new array
            let testEntry = candidate.assessments.find(a => a.testId.toString() === assessmentTestId);

            if (!testEntry) {
                // Generate new credentials for THIS specific test
                plainPassword = crypto.randomBytes(4).toString('hex');
                const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

                testEntry = {
                    testId: assessmentTestId,
                    password: hashedPassword,
                    status: 'invited'
                };
                candidate.assessments.push(testEntry);

                // For backward compatibility (optional but safer for now)
                candidate.assessmentTest = assessmentTestId;
                candidate.assessmentCredentials = {
                    username: candidate.email,
                    password: hashedPassword
                };
            }

            await candidate.save();

            const loginUrl = `${clientUrl}/assessment/login?testId=${assessmentTestId}`;
            const displayPassword = plainPassword || '(Previously generated)';

            const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
                    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                    .header { background: #4843D2; padding: 40px 20px; text-align: center; }
                    .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; text-transform: uppercase; }
                    .logo-subtext { color: rgba(255,255,255,0.6); font-size: 10px; font-weight: 700; letter-spacing: 0.4em; margin-top: 4px; text-transform: uppercase; }
                    .content { padding: 40px 30px; }
                    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }
                    .invitation-text { font-size: 14px; color: #64748b; margin-bottom: 30px; }
                    .details-card { background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
                    .detail-label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; width: 120px; }
                    .detail-value { font-size: 14px; font-weight: 700; color: #334155; }
                    .credentials-box { background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-top: 20px; }
                    .button-container { text-align: center; margin-top: 10px; }
                    .button { display: inline-block; padding: 16px 32px; background-color: #4843D2; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 15px -3px rgba(72, 67, 210, 0.3); transition: all 0.3s; }
                    .footer { padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; background: #fafafa; }
                    .footer-text { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
                    .highlight { color: #4843D2; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <p class="logo-text">SHORTLISTO/p>
                        <p class="logo-subtext">Assessment</p>
                    </div>
                    <div class="content">
                        <p class="greeting">Dear ${candidate.name},</p>
                        <p class="invitation-text">You have been invited to participate in an online assessment for <span class="highlight">${test.name}</span>. This is an essential step in your application process.</p>
                        
                        <div class="details-card">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td class="detail-label" style="padding-bottom: 8px;">Assessment Schedule</td>
                                    <td class="detail-value" style="padding-bottom: 8px;">
                                        ${startTimeStr} - ${endTimeStr.split(',')[1]}<br/>
                                        <span style="font-size: 11px; color: #94a3b8;">${endTimeStr.split(',')[0]}</span>
                                    </td>
                                </tr>
                            </table>

                            <div class="credentials-box">
                                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td class="detail-label" style="padding-bottom: 12px;">Login Email</td>
                                        <td class="detail-value" style="padding-bottom: 12px; color: #4843D2;">${candidate.email}</td>
                                    </tr>
                                    <tr>
                                        <td class="detail-label">Access Password</td>
                                        <td class="detail-value" style="font-family: monospace; font-size: 16px; letter-spacing: 1px;">${displayPassword}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>

                        <div class="button-container">
                            <a href="${loginUrl}" class="button">Enter Assessment Center</a>
                        </div>
                        
                        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Please login 5 minutes before the start time to read the instructions.
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text">Powered by Shortlisto</p>
                    </div>
                </div>
            </body>
            </html>
            `;

            emailJobs.push({
                name: 'assessmentInvite',
                data: {
                    to: candidate.email,
                    subject: `Assessment Invitation - ${test.name} - Shortlisto`,
                    text: `Dear ${candidate.name},\n\nYou are invited to take the online assessment: ${test.name}.${timeStringPlain}\n\nAssessment Link: ${loginUrl}\nLogin Email: ${candidate.email}\nPassword: ${displayPassword}\n\nPlease login 5 minutes before the start time to read instructions.`,
                    html: emailHtml
                }
            });
        }

        await emailQueue.addBulk(emailJobs);

        res.json({ msg: `Invitations dispatched to ${candidates.length} candidates` });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.exportCandidates = async (req, res) => {
    try {
        const driveId = req.params.driveId;
        const drive = await Drive.findById(driveId);
        if (!drive) return res.status(404).json({ msg: 'Drive not found' });

        // Check if admin owns this drive
        if (drive.createdBy.toString() !== req.admin.id) {
            return res.status(403).json({ msg: 'Not authorized to export data for this drive' });
        }

        const candidates = await Candidate.find({ drive: driveId }).sort({ createdAt: -1 }).lean();

        // Define headers based on formSchema + common fields
        const schema = drive.formSchema || [];
        const headers = [
            { id: 'name', label: 'Candidate Name' },
            { id: 'email', label: 'Email' },
            { id: 'contact', label: 'Contact Number' },
            { id: 'university', label: 'University/College' },
            { id: 'isShortlisted', label: 'Shortlisted Status' },
            ...schema.map(f => ({ id: f.fieldId, label: f.label }))
        ];

        // Flatten data
        const flattenedData = candidates.map(candidate => {
            const row = {
                name: candidate.name,
                email: candidate.email,
                contact: candidate.contact,
                university: candidate.university,
                isShortlisted: candidate.isShortlisted ? 'Yes' : 'No'
            };

            // Add dynamic responses
            const responses = candidate.responses || {};
            schema.forEach(field => {
                let value = responses.get ? responses.get(field.fieldId) : responses[field.fieldId];

                // Format arrays (multi-select) for CSV
                if (Array.isArray(value)) {
                    value = value.join(', ');
                }

                row[field.fieldId] = value !== undefined ? value : '';
            });

            return row;
        });

        res.json({
            driveTitle: drive.name,
            headers,
            data: flattenedData
        });

    } catch (err) {
        console.error('Export Error:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.revertCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) {
            return res.status(404).json({ msg: 'Candidate not found' });
        }

        // Verify the candidate's drive belongs to this admin
        const drive = await Drive.findById(candidate.drive);
        if (!drive || drive.createdBy.toString() !== req.admin.id) {
            return res.status(403).json({ msg: 'Not authorized to revert this candidate' });
        }

        candidate.isShortlisted = false;
        await candidate.save();

        // Clear related caches
        await cacheManager.clearPattern(`candidates:admin:${req.admin.id}`);
        await cacheManager.clearPattern('dashboard');
        await Promise.all([
            clearCache('/api/candidates'),
            clearCache('/api/drives'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: 'Candidate status reverted to pending' });
    } catch (err) {
        console.error('Revert Candidate Error:', err.message);
        res.status(500).send('Server Error');
    }
};
