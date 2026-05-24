const Result = require('../models/Result');
const Drive = require('../models/Drive');

const buildQueryFilters = require('../utils/buildQueryFilters');

exports.getAllResults = async (req, res) => {
    try {
        // Get results for drives created by admin
        const drives = await Drive.find({ createdBy: req.admin.id });
        const driveIds = drives.map(d => d._id);

        const { mongoQuery, pagination } = buildQueryFilters(req.query, {
            numericFields: ['totalScore', 'maxScore'],
            exactMatchFields: ['drive', 'candidate', 'isPartialSave'],
            baseQuery: {
                drive: { $in: driveIds }
            }
        });

        const [total, results] = await Promise.all([
            Result.countDocuments(mongoQuery),
            Result.find(mongoQuery)
                .populate('candidate', 'name email university')
                .populate('drive', 'name')
                .sort({ totalScore: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean()
        ]);

        res.json({
            results,
            total,
            totalPages: Math.ceil(total / pagination.limit),
            currentPage: pagination.page,
            limit: pagination.limit
        });
    } catch (err) {
        console.error('Get All Results Error:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.getResultById = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id)
            .populate('candidate')
            .populate('drive')
            .populate('answers.question', 'question options correctAnswer')
            .lean();

        if (!result) return res.status(404).json({ msg: 'Result not found' });

        // Verify the result's drive belongs to the requesting admin
        const drive = await Drive.findById(result.drive._id || result.drive);
        if (!drive || drive.createdBy.toString() !== req.admin.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        res.json(result);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

