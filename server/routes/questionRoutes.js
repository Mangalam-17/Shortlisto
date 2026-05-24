const express = require('express');
const router = express.Router();
const { addQuestion, bulkAddQuestions, getQuestionsByDrive, updateQuestion, deleteQuestion } = require('../controllers/questionController');
const auth = require('../middleware/auth');

// @route   POST api/questions
// @desc    Add a single question
// @access  Private
router.post('/', auth, addQuestion);

// @route   POST api/questions/bulk
// @desc    Add multiple questions (from CSV parsed on client)
// @access  Private
router.post('/bulk', auth, bulkAddQuestions);

// @route   GET api/questions/drive/:driveId
// @desc    Get questions for a drive
// @access  Private
router.get('/drive/:driveId', auth, getQuestionsByDrive);

// @route   PATCH api/questions/:id
// @desc    Update a question
// @access  Private
router.patch('/:id', auth, updateQuestion);

// @route   DELETE api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete('/:id', auth, deleteQuestion);

module.exports = router;
