const Result = require('../models/Result');
const Question = require('../models/Question');
const Drive = require('../models/Drive');
const cacheManager = require('../utils/cache/cacheManager');

exports.getAnalytics = async (req, res) => {
    try {
        const { driveId } = req.params;
        const cacheKey = `analytics:drive:${driveId}`;
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        // Verify drive belongs to the requesting admin
        const drive = await Drive.findById(driveId);
        if (!drive) return res.status(404).json({ msg: 'Drive not found' });
        if (drive.createdBy.toString() !== req.admin.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Get all final results for this drive
        const results = await Result.find({
            drive: driveId,
            isPartialSave: false
        }).populate('candidate', 'name email').lean();

        if (results.length === 0) {
            return res.json({
                totalCandidates: 0,
                averageScore: 0,
                medianScore: 0,
                scoreDistribution: [],
                questionAnalysis: [],
                passRate: 0
            });
        }

        // Calculate statistics
        const scores = results.map(r => r.totalScore).sort((a, b) => a - b);
        const totalCandidates = scores.length;
        const averageScore = scores.reduce((a, b) => a + b, 0) / totalCandidates;
        const medianScore = scores[Math.floor(totalCandidates / 2)];
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        // Score distribution (histogram buckets)
        const bucketSize = Math.max(1, Math.ceil(maxScore / 10));
        const distribution = {};
        scores.forEach(score => {
            const bucket = Math.floor(score / bucketSize) * bucketSize;
            distribution[bucket] = (distribution[bucket] || 0) + 1;
        });

        const scoreDistribution = Object.entries(distribution).map(([range, count]) => ({
            range: `${range}-${parseInt(range) + bucketSize}`,
            count
        }));

        // Question-wise analysis with optimized query
        const questions = await Question.find({ drive: driveId }).select('_id question options correctAnswer').lean();
        const questionAnalysis = [];

        for (const question of questions) {
            let correctCount = 0;
            let totalAttempts = 0;

            results.forEach(result => {
                const answer = result.answers.find(a => a.question && a.question.toString() === question._id.toString());
                if (answer) {
                    totalAttempts++;
                    if (answer.selectedOption === question.correctAnswer) {
                        correctCount++;
                    }
                }
            });

            const successRate = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

            questionAnalysis.push({
                questionId: question._id,
                question: question.question.substring(0, 50) + '...',
                correctCount,
                totalAttempts,
                successRate: successRate.toFixed(1),
                difficulty: successRate > 70 ? 'Easy' : successRate > 40 ? 'Medium' : 'Hard'
            });
        }

        // Pass rate (assuming 50% is passing)
        const passingScore = maxScore * 0.5;
        const passedCount = scores.filter(s => s >= passingScore).length;
        const passRate = (passedCount / totalCandidates) * 100;

        const response = {
            totalCandidates,
            averageScore: averageScore.toFixed(2),
            medianScore,
            maxScore,
            minScore,
            scoreDistribution,
            questionAnalysis,
            passRate: passRate.toFixed(1),
            passingScore
        };

        await cacheManager.set(cacheKey, response, 600); // 10 min cache
        res.json(response);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const buildQueryFilters = require('../utils/buildQueryFilters');

exports.getAllDrivesAnalytics = async (req, res) => {
    try {
        const options = {
            searchableFields: ['name', 'university'],
            baseQuery: { createdBy: req.admin.id }
        };

        const { query, pagination } = buildQueryFilters(req.query, options);

        const [total, drives] = await Promise.all([
            Drive.countDocuments(query),
            Drive.find(query)
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean()
        ]);
        const driveIds = drives.map(d => d._id);

        // Single aggregation to get submission counts and average scores per drive
        const resultStats = await Result.aggregate([
            { $match: { drive: { $in: driveIds }, isPartialSave: false } },
            {
                $group: {
                    _id: '$drive',
                    totalSubmissions: { $sum: 1 },
                    averageScore: { $avg: '$totalScore' }
                }
            }
        ]);

        const statsMap = {};
        resultStats.forEach(s => { statsMap[s._id.toString()] = s; });

        const analytics = drives.map(drive => {
            const stats = statsMap[drive._id.toString()];
            return {
                driveId: drive._id,
                driveName: drive.name,
                university: drive.university,
                totalSubmissions: stats?.totalSubmissions || 0,
                averageScore: (stats?.averageScore || 0).toFixed(2)
            };
        });

        res.json({
            analytics,
            total,
            totalPages: Math.ceil(total / pagination.limit),
            currentPage: pagination.page,
            limit: pagination.limit
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

