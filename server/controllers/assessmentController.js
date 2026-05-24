const Candidate = require('../models/Candidate');
const Drive = require('../models/Drive');
const Question = require('../models/Question');
const Result = require('../models/Result');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { clearCache } = require('../middleware/cacheMiddleware');
const cacheManager = require('../utils/cache/cacheManager');
const analysisQueue = require('../queues/analysisQueue');
const QuestionService = require('../services/questionService');

// Escape special regex characters to prevent ReDoS attacks
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.loginCandidate = async (req, res) => {
    const { email, password, testId } = req.body;
    try {
        const candidate = await Candidate.findOne({ email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } })
            .select('assessments assessmentTest assessmentCredentials drive')
            .lean();

        if (!candidate) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        let isMatch = false;
        let targetTestId = testId;

        // Multi-Assessment Support Logic
        if (testId) {
            const testEntry = candidate.assessments.find(a => a.testId.toString() === testId);
            if (!testEntry) {
                return res.status(400).json({ msg: 'You are not invited to this specific assessment' });
            }
            isMatch = await bcrypt.compare(password, testEntry.password);
        } else {
            // Fallback for older links or single-assessment flow
            if (!candidate.assessmentCredentials || !candidate.assessmentCredentials.password) {
                return res.status(400).json({ msg: 'Assessment credentials not issued yet' });
            }
            isMatch = await bcrypt.compare(password, candidate.assessmentCredentials.password);
            targetTestId = candidate.assessmentTest; // Use the legacy field as fallback
        }

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { 
            candidate: { 
                id: candidate._id, // Use _id instead of id for lean() objects
                testId: targetTestId // Critical for session isolation
            } 
        };
        
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token, 
                candidateId: candidate._id, 
                driveId: candidate.drive,
                testId: targetTestId 
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


const AssessmentTest = require('../models/AssessmentTest');

exports.getAssessmentMeta = async (req, res) => {
    // Get drive details and check timing
    try {
        const candidate = await Candidate.findById(req.candidate.id).populate('drive');
        if (!candidate) return res.status(404).json({ msg: 'Candidate not found' });

        const testId = req.candidate.testId || candidate.assessmentTest;
        if (!testId) return res.status(400).json({ msg: 'No assessment assigned' });

        // Check if already submitted for THIS test
        if (candidate.assessments && candidate.assessments.length > 0) {
            const testEntry = candidate.assessments.find(a => a.testId.toString() === testId.toString());
            if (testEntry && testEntry.status === 'completed') {
                return res.status(400).json({ msg: 'Assessment already submitted', submitted: true });
            }
        } else {
            // Legacy fallback
            const existingResult = await Result.findOne({ candidate: req.candidate.id, isPartialSave: false });
            if (existingResult) {
                return res.status(400).json({ msg: 'Assessment already submitted', submitted: true });
            }
        }

        const drive = candidate.drive;
        const assignedTest = await AssessmentTest.findById(testId).lean();
        
        if (!assignedTest) return res.status(404).json({ msg: 'Assigned Assessment Test not found' });

        const startTime = new Date(assignedTest.startTime);
        const endTime = new Date(assignedTest.endTime);

        const now = new Date();
        const buffer = 5000;
        const isUpcoming = (now.getTime() + 1000) < startTime.getTime();
        const isOngoing = now >= new Date(startTime.getTime() - buffer) && now < endTime;
        const isExpired = now >= endTime;

        res.json({
            drive: {
                _id: drive._id,
                name: drive.name,
                startTime: startTime,
                endTime: endTime
            },
            assessmentName: assignedTest.name,
            candidateName: candidate.name,
            candidateId: candidate._id,
            status: isUpcoming ? 'UPCOMING' : (isOngoing ? 'ONGOING' : 'EXPIRED'),
            canStart: isOngoing
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.createAssessmentTest = async (req, res) => {
    try {
        const { driveId, name, startTime, endTime } = req.body;

        const newTest = new AssessmentTest({
            drive: driveId,
            name,
            startTime,
            endTime,
            createdBy: req.admin.id
        });

        await newTest.save();

        // Clear assessments related caches immediately
        await cacheManager.del(`assessments:admin:${req.admin.id}`);
        await cacheManager.clearPattern(`assessments:admin:${req.admin.id}:p`);
        await cacheManager.clearPattern('dashboard');
        
        await Promise.all([
            clearCache('/api/assessments'),
            clearCache('/api/dashboard')
        ]);

        res.json(newTest);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAssessmentTestsByDrive = async (req, res) => {
    try {
        const tests = await AssessmentTest.find({ drive: req.params.driveId }).sort({ createdAt: -1 }).lean();
        res.json(tests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAllAssessments = async (req, res) => {
    try {
        const isPaginated = req.query.page || req.query.limit;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const cacheKey = isPaginated ? `assessments:admin:${req.admin.id}:p${page}:l${limit}` : `assessments:admin:${req.admin.id}`;
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        let tests;
        let total = 0;

        const drives = await Drive.find({ createdBy: req.admin.id }).lean();
        const driveIds = drives.map(d => d._id);
        const query = { $or: [{ createdBy: req.admin.id }, { drive: { $in: driveIds } }] };

        if (isPaginated) {
            [total, tests] = await Promise.all([
                AssessmentTest.countDocuments(query),
                AssessmentTest.find(query)
                    .select('name drive startTime endTime createdAt')
                    .populate('drive', 'name university')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
            ]);
        } else {
            tests = await AssessmentTest.find(query)
                .select('name drive startTime endTime createdAt')
                .populate('drive', 'name university')
                .sort({ createdAt: -1 })
                .lean();
        }

        const testsPlain = tests;

        const result = isPaginated ? {
            assessments: testsPlain,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        } : testsPlain;

        // Cache briefly to keep admin view fresh
        await cacheManager.set(cacheKey, result, 2);

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateAssessment = async (req, res) => {
    try {
        const { name, driveId, startTime, endTime } = req.body;

        const drives = await Drive.find({ createdBy: req.admin.id }).lean();
        const driveIds = drives.map(d => d._id);
        
        let test = await AssessmentTest.findOne({
            _id: req.params.id,
            $or: [{ createdBy: req.admin.id }, { drive: { $in: driveIds } }]
        });
        
        if (!test) return res.status(404).json({ msg: 'Assessment not found or not authorized' });

        test = await AssessmentTest.findByIdAndUpdate(
            req.params.id,
            { name, drive: driveId, startTime, endTime },
            { returnDocument: 'after' }
        ).populate('drive', 'name university');

        // Clear assessments related caches immediately
        await cacheManager.del(`assessments:admin:${req.admin.id}`);
        await cacheManager.clearPattern(`assessments:admin:${req.admin.id}:p`);
        await cacheManager.clearPattern('dashboard');

        await Promise.all([
            clearCache('/api/assessments'),
            clearCache('/api/dashboard')
        ]);

        res.json(test);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteAssessment = async (req, res) => {
    try {
        const drives = await Drive.find({ createdBy: req.admin.id }).lean();
        const driveIds = drives.map(d => d._id);
        
        const test = await AssessmentTest.findOne({
            _id: req.params.id,
            $or: [{ createdBy: req.admin.id }, { drive: { $in: driveIds } }]
        });
        
        if (!test) return res.status(404).json({ msg: 'Assessment not found or not authorized' });

        await AssessmentTest.findByIdAndDelete(req.params.id);

        // Clear assessments related caches immediately
        await cacheManager.del(`assessments:admin:${req.admin.id}`);
        await cacheManager.clearPattern(`assessments:admin:${req.admin.id}:p`);
        await cacheManager.clearPattern('dashboard');

        // Clear assessments related caches
        await Promise.all([
            clearCache('/api/assessments'),
            clearCache('/api/dashboard')
        ]);

        res.json({ msg: 'Assessment deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Helper for deterministic shuffling
const shuffleWithSeed = (array, seed) => {
    const arr = [...array];
    let m = arr.length, t, i;
    // Simple LCG based on seed string
    let seedNum = 0;
    for (let char of seed.toString()) seedNum += char.charCodeAt(0);

    const random = () => {
        seedNum = (seedNum * 1664525 + 1013904223) % 4294967296;
        return seedNum / 4294967296;
    };

    while (m) {
        i = Math.floor(random() * m--);
        t = arr[m];
        arr[m] = arr[i];
        arr[i] = t;
    }
    return arr;
};

exports.getAssessmentQuestions = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.candidate.id);
        if (!candidate) return res.status(404).json({ msg: 'Candidate not found' });

        const testId = req.candidate.testId || candidate.assessmentTest;
        if (!testId) return res.status(400).json({ msg: 'No test ID in session' });

        const assessments = candidate.assessments || [];
        const testEntry = assessments.find(a => a.testId.toString() === testId.toString());
        
        if (testEntry && testEntry.status === 'completed') {
            return res.status(400).json({ msg: 'Assessment already submitted', submitted: true });
        }

        // Check for existing session randomization IN THE ARRAY
        const session = testEntry?.session || candidate.assessmentSession;

        if (session && session.questionOrder && session.questionOrder.length > 0) {
            // Use optimized question fetching with caching
            const questions = await QuestionService.getQuestionsByIds(session.questionOrder, false);
            
            const questionMap = {};
            questions.forEach(q => { questionMap[q._id.toString()] = q; });
            
            const orderedQuestions = session.questionOrder.map(qId => {
                const q = questionMap[qId];
                if (!q) return null;
                const qObj = { ...q }; // Already lean, no need for toObject()
                // Handle both Map and plain object optionMaps
                const optionMap = (testEntry?.session ? (testEntry.session.optionMaps.get ? testEntry.session.optionMaps.get(qId) : testEntry.session.optionMaps[qId]) : (candidate.assessmentSession.optionMaps.get ? candidate.assessmentSession.optionMaps.get(qId) : candidate.assessmentSession.optionMaps[qId]));
                
                if (optionMap && Array.isArray(optionMap)) {
                    qObj.options = optionMap.map(idx => qObj.options[idx]);
                }
                return qObj;
            }).filter(Boolean);

            return res.json(orderedQuestions);
        }

        // Generate new session randomization with optimized caching
        let questions = await QuestionService.getQuestionsByDrive(candidate.drive, false);
        
        const seed = Date.now().toString() + candidate._id.toString() + testId.toString();
        questions = shuffleWithSeed(questions, seed);

        const questionOrder = questions.map(q => q._id.toString());
        const optionMaps = {};

        const randomizedQuestions = questions.map(q => {
            const qObj = { ...q }; // Already lean, no need for toObject()
            const optionIndices = qObj.options.map((_, i) => i);
            const shuffledIndices = shuffleWithSeed(optionIndices, seed + q._id.toString());
            
            optionMaps[q._id.toString()] = shuffledIndices;
            qObj.options = shuffledIndices.map(idx => qObj.options[idx]);
            return qObj;
        });

        // Store session for consistency in the correct assessment entry
        if (testEntry) {
            testEntry.session = { questionOrder, optionMaps };
            testEntry.status = 'started';
            testEntry.startedAt = new Date();
        } else {
            // Fallback for legacy
            candidate.assessmentSession = { questionOrder, optionMaps };
        }
        
        await candidate.save();
        res.json(randomizedQuestions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.submitAssessment = async (req, res) => {
    try {
        const { answers, proctoringLogs } = req.body;
        const candidateId = req.candidate.id;
        const testId = req.candidate.testId;

        if (!testId) return res.status(400).json({ msg: 'No active test session' });
        
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ msg: 'Candidate not found' });

        const existingFinal = await Result.findOne({ 
            candidate: candidateId, 
            assessmentTest: testId,
            isPartialSave: false 
        });
        if (existingFinal) return res.status(400).json({ msg: 'Assessment already submitted' });

        // Update status in candidate profile
        const assessments = candidate.assessments || [];
        const testEntry = assessments.find(a => a.testId.toString() === testId.toString());
        if (testEntry) {
            testEntry.status = 'completed';
            testEntry.completedAt = new Date();
            await candidate.save();
        }

        // Enqueue result calculation task to background worker
        await analysisQueue.add('calculateResults', {
            candidateId,
            driveId: candidate.drive,
            testId,
            answers,
            proctoringLogs
        });

        res.json({ msg: 'Assessment submitted successfully. Result processing in background.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.autoSaveAnswers = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.candidate.id);
        if (!candidate) return res.status(404).json({ msg: 'Candidate not found' });

        const testId = req.candidate.testId;
        if (!testId) return res.status(400).json({ msg: 'No active test session' });

        const finalResult = await Result.findOne({ 
            candidate: req.candidate.id, 
            assessmentTest: testId,
            isPartialSave: false 
        });
        if (finalResult) {
            return res.status(400).json({ msg: 'Assessment already submitted' });
        }

        const { answers, markedForReview, proctoringLogs } = req.body;

        const formattedAnswers = (answers || []).map(ans => ({
            question: ans.questionId,
            selectedOption: ans.selectedOption,
            timeSpent: ans.timeSpent || 0
        }));

        let partialResult = await Result.findOne({ 
            candidate: req.candidate.id, 
            assessmentTest: testId,
            isPartialSave: true 
        });

        if (partialResult) {
            partialResult.answers = formattedAnswers;
            partialResult.markedForReview = markedForReview || [];
            partialResult.proctoringLogs = proctoringLogs || [];
            partialResult.submittedAt = new Date();
        } else {
            partialResult = new Result({
                candidate: req.candidate.id,
                drive: candidate.drive,
                assessmentTest: testId,
                answers: formattedAnswers,
                markedForReview: markedForReview || [],
                proctoringLogs: proctoringLogs || [],
                isPartialSave: true,
                totalScore: 0
            });
        }

        await partialResult.save();

        // Also update candidate-scoped responses array for redundancy/isolation
        const assessments = candidate.assessments || [];
        const testEntry = assessments.find(a => a.testId.toString() === testId.toString());
        if (testEntry) {
            const responseMap = new Map();
            formattedAnswers.forEach(ans => responseMap.set(ans.question.toString(), ans.selectedOption));
            testEntry.responses = responseMap;
            await candidate.save();
        }

        res.json({ msg: 'Progress saved', saved: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getSavedProgress = async (req, res) => {
    try {
        const testId = req.candidate.testId;
        if (!testId) return res.status(400).json({ msg: 'No active test session' });

        // Check if already submitted
        const existingResult = await Result.findOne({ 
            candidate: req.candidate.id, 
            assessmentTest: testId,
            isPartialSave: false 
        });
        if (existingResult) {
            return res.status(400).json({ msg: 'Assessment already submitted', submitted: true });
        }

        const partialResult = await Result.findOne({
            candidate: req.candidate.id,
            assessmentTest: testId,
            isPartialSave: true
        });

        if (!partialResult) {
            return res.json({ answers: [], markedForReview: [] });
        }

        res.json({
            answers: partialResult.answers,
            markedForReview: partialResult.markedForReview || [],
            proctoringLogs: partialResult.proctoringLogs || []
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
