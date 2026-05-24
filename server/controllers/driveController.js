const Drive = require('../models/Drive');
const cacheManager = require('../utils/cache/cacheManager');
const { clearCache } = require('../middleware/cacheMiddleware');

exports.createDrive = async (req, res) => {
    try {
        const { name, university, startTime, endTime, recruitmentType, formConfig, skillsConfig, formSchema, role } = req.body;

        // Security: Limit number of fields and fieldId length
        if (formSchema && Array.isArray(formSchema)) {
            if (formSchema.length > 50) {
                return res.status(400).json({ msg: 'Maximum 50 fields allowed in form schema' });
            }
            const invalidField = formSchema.find(f => !f.fieldId || f.fieldId.length > 50);
            if (invalidField) {
                return res.status(400).json({ msg: 'Invalid fieldId: must be provided and under 50 characters' });
            }
        }

        const newDrive = new Drive({
            name,
            role,
            university,
            startTime,
            endTime,
            recruitmentType,
            formConfig,
            skillsConfig,
            formSchema,
            createdBy: req.admin.id
        });

        const drive = await newDrive.save();

        // Invalidate caches
        await cacheManager.clearPattern('drives:admin');
        await cacheManager.clearPattern('dashboard');
        await clearCache('/api/drives'); // Keep for specific routes not covered by patterns

        res.json(drive);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteAllDrives = async (req, res) => {
    try {
        const adminId = req.admin.id;

        // Find all drives belonging to this admin
        const drives = await Drive.find({ createdBy: adminId }).select('_id').lean();
        const driveIds = drives.map(d => d._id);

        if (driveIds.length === 0) {
            return res.status(404).json({ msg: 'No drives found to delete' });
        }

        // Cascade delete all associated data
        const Candidate = require('../models/Candidate');
        const Result = require('../models/Result');
        const AssessmentTest = require('../models/AssessmentTest');
        const Question = require('../models/Question');

        await Promise.all([
            Candidate.deleteMany({ drive: { $in: driveIds } }),
            Result.deleteMany({ drive: { $in: driveIds } }),
            AssessmentTest.deleteMany({ drive: { $in: driveIds } }),
            Question.deleteMany({ drive: { $in: driveIds } }),
            Drive.deleteMany({ _id: { $in: driveIds } })
        ]);

        // Clear all related caches
        await cacheManager.clearPattern(`drives:admin:${adminId}`);
        await cacheManager.clearPattern(`admin_drives:${adminId}`);
        await cacheManager.clearPattern('dashboard');
        
        await Promise.all([
            clearCache('/api/drives'),
            clearCache('/api/results'),
            clearCache('/api/analytics'),
            clearCache('/api/dashboard/stats'),
            clearCache('/api/candidates'),
            clearCache('/api/assessments')
        ]);

        res.json({ msg: `Successfully deleted ${driveIds.length} drives and all associated data` });
    } catch (err) {
        console.error('Delete All Drives Error:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.getDrives = async (req, res) => {
    try {
        const isPaginated = req.query.page || req.query.limit;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { search, recruitmentType } = req.query;

        const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Base query scoped to this admin
        const baseQuery = { createdBy: req.admin.id };

        // Apply recruitmentType filter if present
        if (recruitmentType && ['campus', 'lateral', 'custom'].includes(recruitmentType)) {
            baseQuery.recruitmentType = recruitmentType;
        }

        // Apply search across name and university
        if (search && search.trim().length > 0) {
            const safe = escapeRegex(search.trim());
            const regex = new RegExp(safe, 'i');
            baseQuery.$or = [{ name: regex }, { university: regex }];
        }

        const cacheSig = `s=${search || ''}|t=${recruitmentType || ''}`;
        const cacheKey = isPaginated
            ? `drives:admin:${req.admin.id}:p${page}:l${limit}:${cacheSig}`
            : `drives:admin:${req.admin.id}:${cacheSig}`;
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        let drives;
        let total = 0;

        if (isPaginated) {
            total = await Drive.countDocuments(baseQuery);
            drives = await Drive.find(baseQuery)
                .select('name university role startTime endTime recruitmentType createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        } else {
            drives = await Drive.find(baseQuery)
                .select('name university role startTime endTime recruitmentType createdAt')
                .sort({ createdAt: -1 })
                .lean();
        }

        const driveIds = drives.map(d => d._id);

        // Single aggregation for candidate counts
        const Candidate = require('../models/Candidate');
        const candidateCounts = await Candidate.aggregate([
            { $match: { drive: { $in: driveIds } } },
            {
                $group: {
                    _id: '$drive',
                    candidateCount: { $sum: 1 },
                    shortlistedCount: { $sum: { $cond: ['$isShortlisted', 1, 0] } }
                }
            }
        ]);

        const countMap = {};
        candidateCounts.forEach(c => { countMap[c._id.toString()] = c; });

        const drivesWithCount = drives.map(drive => ({
            ...drive,
            candidateCount: countMap[drive._id.toString()]?.candidateCount || 0,
            shortlistedCount: countMap[drive._id.toString()]?.shortlistedCount || 0
        }));

        if (isPaginated) {
            const response = {
                drives: drivesWithCount,
                total,
                page,
                totalPages: Math.ceil(total / limit)
            };
            await cacheManager.set(cacheKey, response, 60);
            return res.json(response);
        }

        // Return flat array for backward compatibility
        await cacheManager.set(cacheKey, drivesWithCount, 120);
        res.json(drivesWithCount);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Public access for candidates — only return safe fields
exports.getDriveById = async (req, res) => {
    try {
        const drive = await Drive.findById(req.params.id)
            .select('name university startTime endTime recruitmentType formConfig skillsConfig formSchema role')
            .lean();
        if (!drive) {
            return res.status(404).json({ msg: 'Drive not found' });
        }
        res.json(drive);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Drive not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.getDriveForm = async (req, res) => {
    try {
        const driveId = req.params.id;
        const cacheKey = `drive_form:${driveId}`;

        // Try Redis Cache
        const cachedForm = await cacheManager.get(cacheKey);
        if (cachedForm) {
            return res.json(cachedForm);
        }

        const drive = await Drive.findById(driveId).select('name role formSchema').lean();
        if (!drive) {
            return res.status(404).json({ msg: 'Drive not found' });
        }

        const formData = {
            driveId: drive._id,
            name: drive.name,
            role: drive.role,
            formSchema: drive.formSchema || []
        };

        // Cache for 5 minutes
        await cacheManager.set(cacheKey, formData, 300);

        res.json(formData);
    } catch (err) {
        console.error('getDriveForm Error:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateDrive = async (req, res) => {
    try {
        let drive = await Drive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ msg: 'Drive not found' });
        }

        // Check if admin owns this drive
        if (drive.createdBy.toString() !== req.admin.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const { name, university, startTime, endTime, recruitmentType, formConfig, skillsConfig, formSchema, role } = req.body;

        // Security: Limit number of fields and fieldId length
        if (formSchema && Array.isArray(formSchema)) {
            if (formSchema.length > 50) {
                return res.status(400).json({ msg: 'Maximum 50 fields allowed in form schema' });
            }
            const invalidField = formSchema.find(f => !f.fieldId || f.fieldId.length > 50);
            if (invalidField) {
                return res.status(400).json({ msg: 'Invalid fieldId: must be provided and under 50 characters' });
            }
        }

        drive = await Drive.findByIdAndUpdate(
            req.params.id,
            { name, role, university, startTime, endTime, recruitmentType, formConfig, skillsConfig, formSchema },
            { returnDocument: 'after' }
        );

        // Clear form cache
        await cacheManager.del(`drive_form:${req.params.id}`);

        // Clear all related caches
        await cacheManager.clearPattern('drives:admin');
        await cacheManager.clearPattern('dashboard');
        await Promise.all([
            clearCache('/api/drives'),
            clearCache('/api/dashboard'),
            clearCache('/api/analytics'),
            clearCache('/api/candidates')
        ]);

        res.json(drive);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Drive not found' });
        }
        res.status(500).send('Server Error');
    }
};

exports.deleteDrive = async (req, res) => {
    try {
        const drive = await Drive.findById(req.params.id);

        if (!drive) {
            return res.status(404).json({ msg: 'Drive not found' });
        }

        // Check if admin owns this drive
        if (drive.createdBy.toString() !== req.admin.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        const driveId = req.params.id;

        // Cascade delete all associated data
        const Candidate = require('../models/Candidate');
        const Result = require('../models/Result');
        const AssessmentTest = require('../models/AssessmentTest');
        const Question = require('../models/Question');

        // Cascade delete all associated data
        await Promise.all([
            Candidate.deleteMany({ drive: driveId }),
            Result.deleteMany({ drive: driveId }),
            AssessmentTest.deleteMany({ drive: driveId }),
            Question.deleteMany({ drive: driveId })
        ]);

        await Drive.findByIdAndDelete(driveId);

        // Clear all related caches
        await cacheManager.clearPattern('drives:admin');
        await cacheManager.clearPattern('dashboard');
        await Promise.all([
            clearCache('/api/drives'),
            clearCache('/api/results'),
            clearCache('/api/analytics'),
            clearCache('/api/dashboard/stats'),
            clearCache('/api/candidates'),
            clearCache('/api/assessments')
        ]);

        res.json({ msg: 'Drive and all associated data deleted successfully' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Drive not found' });
        }
        res.status(500).send('Server Error');
    }
};
