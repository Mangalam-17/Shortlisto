const express = require('express');
const router = express.Router();
const { getAllResults, getResultById } = require('../controllers/resultController');
const auth = require('../middleware/auth');

// @route   GET api/results
// @desc    Get all results
// @access  Private
router.get('/', auth, getAllResults);

// @route   GET api/results/:id
// @desc    Get specific result details
// @access  Private
router.get('/:id', auth, getResultById);

module.exports = router;
