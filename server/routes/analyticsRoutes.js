const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAnalytics, getAllDrivesAnalytics } = require('../controllers/analyticsController');

// Get analytics for specific drive
router.get('/drive/:driveId', auth, getAnalytics);

// Get overview of all drives
router.get('/overview', auth, getAllDrivesAnalytics);

module.exports = router;
