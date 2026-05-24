const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

// @route   GET api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, getDashboardStats);

module.exports = router;
