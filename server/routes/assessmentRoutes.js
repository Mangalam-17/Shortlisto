const express = require('express');
const router = express.Router();
const { loginCandidate, getAssessmentMeta, getAssessmentQuestions, submitAssessment, autoSaveAnswers, getSavedProgress } = require('../controllers/assessmentController');
const candidateAuth = require('../middleware/candidateAuth');

// Public
router.post('/login', loginCandidate);

// Set no-cache headers for all candidate routes
router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

const SecurityMiddleware = require('../middleware/security');

// Private (Candidate Token)
// Use a shorter cache or no cache for metadata as it's time-sensitive
router.get('/meta', candidateAuth, (req, res, next) => { res.locals.skipCache = true; next(); }, getAssessmentMeta);
router.get('/questions', candidateAuth, (req, res, next) => { res.locals.skipCache = true; next(); }, getAssessmentQuestions);
router.post('/submit', candidateAuth, submitAssessment);
router.post('/auto-save', candidateAuth, autoSaveAnswers);
router.get('/progress', candidateAuth, (req, res, next) => { res.locals.skipCache = true; next(); }, getSavedProgress);

// Private (Admin Token)
const auth = require('../middleware/auth');
const { createAssessmentTest, getAssessmentTestsByDrive, getAllAssessments, updateAssessment, deleteAssessment } = require('../controllers/assessmentController');
router.post('/test/create', auth, createAssessmentTest);
router.get('/test/drive/:driveId', auth, getAssessmentTestsByDrive);
router.get('/test/all', auth, getAllAssessments);
router.put('/test/:id', auth, updateAssessment);
router.delete('/test/:id', auth, deleteAssessment);

module.exports = router;
