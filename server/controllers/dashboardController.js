const Result = require('../models/Result');
const Drive = require('../models/Drive');
const Candidate = require('../models/Candidate');
const AssessmentTest = require('../models/AssessmentTest');
const cacheManager = require('../utils/cache/cacheManager');

exports.getDashboardStats = async (req, res) => {
    try {
        const cacheKey = `dashboardStats_${req.admin.id}`;

        // Try getting from cache first
        const cachedData = await cacheManager.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const drives = await Drive.find({ createdBy: req.admin.id }).select('_id').lean();
        const driveIds = drives.map(d => d._id);

        const totalDrives = drives.length;

        // Run counting queries in parallel
        const [totalCandidates, shortlistedCandidates, completedAssessments] = await Promise.all([
            Candidate.countDocuments({ drive: { $in: driveIds } }),
            Candidate.countDocuments({ drive: { $in: driveIds }, isShortlisted: true }),
            AssessmentTest.countDocuments({ drive: { $in: driveIds } })
        ]);

        const response = {
            totalDrives,
            totalCandidates,
            shortlistedCandidates,
            completedAssessments
        };

        // Cache the result for 30 seconds
        await cacheManager.set(cacheKey, response, 30);

        res.json(response);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
