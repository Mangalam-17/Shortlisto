const Question = require('../models/Question');
const Drive = require('../models/Drive');
const { clearCache } = require('../middleware/cacheMiddleware');
const cacheManager = require('../utils/cache/cacheManager');
const QuestionService = require('../services/questionService');

// Helper to verify drive belongs to the requesting admin
const verifyDriveOwnership = async (driveId, adminId) => {
    console.log(`[DEBUG] Verifying ownership for drive: ${driveId} by admin: ${adminId}`);
    const drive = await Drive.findById(driveId);
    if (!drive) {
        console.log(`[DEBUG] Drive not found: ${driveId}`);
        return { error: 'Drive not found', status: 404 };
    }
    if (drive.createdBy.toString() !== adminId) {
        console.log(`[DEBUG] Unauthorized: Drive created by ${drive.createdBy} is not ${adminId}`);
        return { error: 'Not authorized', status: 401 };
    }
    return { drive };
};

exports.addQuestion = async (req, res) => {
    try {
        const { question, options, correctAnswer, driveId } = req.body;

        const ownership = await verifyDriveOwnership(driveId, req.admin.id);
        if (ownership.error) return res.status(ownership.status).json({ msg: ownership.error });

        const newQuestion = new Question({
            question,
            options,
            correctAnswer,
            drive: driveId
        });

        await newQuestion.save();

        // Invalidate caches using QuestionService
        await QuestionService.invalidateDriveCache(driveId);
        await clearCache(`/api/questions/drive/${driveId}`);

        res.json(newQuestion);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.bulkAddQuestions = async (req, res) => {
    try {
        const { questions, driveId } = req.body;

        const ownership = await verifyDriveOwnership(driveId, req.admin.id);
        if (ownership.error) return res.status(ownership.status).json({ msg: ownership.error });

        const questionsWithDrive = questions.map(q => ({ ...q, drive: driveId }));

        await Question.insertMany(questionsWithDrive);
        // Invalidate caches using QuestionService
        await QuestionService.invalidateDriveCache(driveId);
        await clearCache(`/api/questions/drive/${driveId}`);
        res.json({ msg: `Successfully added ${questions.length} questions` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getQuestionsByDrive = async (req, res) => {
    try {
        const driveId = req.params.driveId;
        const ownership = await verifyDriveOwnership(driveId, req.admin.id);
        if (ownership.error) return res.status(ownership.status).json({ msg: ownership.error });

        // Use optimized QuestionService with caching
        const questions = await QuestionService.getQuestionsByDrive(driveId, true, 300); // Include correct answers for admin, 5 min cache
        console.log(`[DEBUG] Found ${questions.length} questions for drive ${driveId}`);
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateQuestion = async (req, res) => {
    try {
        const { question, options, correctAnswer } = req.body;
        const q = await Question.findById(req.params.id);
        
        if (!q) return res.status(404).json({ msg: 'Question not found' });
        
        const ownership = await verifyDriveOwnership(q.drive, req.admin.id);
        if (ownership.error) return res.status(ownership.status).json({ msg: ownership.error });

        q.question = question || q.question;
        q.options = options || q.options;
        q.correctAnswer = (correctAnswer !== undefined) ? correctAnswer : q.correctAnswer;

        await q.save();
        // Invalidate caches using QuestionService
        await QuestionService.invalidateDriveCache(q.drive);
        await clearCache(`/api/questions/drive/${q.drive}`);
        res.json(q);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        const q = await Question.findById(req.params.id);
        if (!q) return res.status(404).json({ msg: 'Question not found' });

        const ownership = await verifyDriveOwnership(q.drive, req.admin.id);
        if (ownership.error) return res.status(ownership.status).json({ msg: ownership.error });

        const driveId = q.drive;
        await Question.findByIdAndDelete(req.params.id);
        // Invalidate caches using QuestionService
        await QuestionService.invalidateDriveCache(driveId);
        await clearCache(`/api/questions/drive/${driveId}`);
        res.json({ msg: 'Question removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
