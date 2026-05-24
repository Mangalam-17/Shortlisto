const express = require('express');
const router = express.Router();
const {
    registerCandidate,
    getCandidatesByDrive,
    getAllCandidates,
    shortlistCandidate,
    saveDraft,
    exportCandidates
} = require('../controllers/candidateController');
const auth = require('../middleware/auth');
const { validateCandidateRegistration } = require('../middleware/validation');

// @route   POST api/candidates/register
// @desc    Register a candidate (Public)
// @access  Public
router.post('/register', validateCandidateRegistration, registerCandidate);

// @route   POST api/candidates/save-draft
// @desc    Save application draft (Public)
// @access  Public
router.post('/save-draft', validateCandidateRegistration, saveDraft);

// @route   GET api/candidates
// @desc    Get all candidates for admin's drives
// @access  Private
router.get('/', auth, getAllCandidates);

// @route   GET api/candidates/drive/:driveId
// @desc    Get candidates specific to a drive
// @access  Private
router.get('/drive/:driveId', auth, getCandidatesByDrive);

// @route   POST api/candidates/shortlist/:id
// @desc    Shortlist candidate (Email only)
// @access  Private
router.post('/shortlist/:id', auth, shortlistCandidate);

// @route   POST api/candidates/revert/:id
// @desc    Revert candidate to pending status
// @access  Private
const { revertCandidate } = require('../controllers/candidateController');
router.post('/revert/:id', auth, revertCandidate);

// @route   POST api/candidates/bulk-shortlist
// @desc    Shortlist all candidates matching filter
// @access  Private
const { bulkShortlist } = require('../controllers/candidateController');
router.post('/bulk-shortlist', auth, bulkShortlist);

// @route   POST api/candidates/send-assessment/:id
// @desc    Send Assessment Link & Credentials
// @access  Private
const { sendAssessment, bulkSendAssessment } = require('../controllers/candidateController');
router.post('/send-assessment/:id', auth, sendAssessment);

// @route   POST api/candidates/bulk-send-assessment
// @desc    Send Invitations to all shortlisted candidates for a drive
// @access  Private
router.post('/bulk-send-assessment', auth, bulkSendAssessment);

// @route   GET api/candidates/export/:driveId
// @desc    Export candidates for a drive (Admin only)
// @access  Private
router.get('/export/:driveId', auth, exportCandidates);

module.exports = router;

