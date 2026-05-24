const express = require('express');
const router = express.Router();
const {
    registerAdmin,
    loginAdmin,
    getAdmin,
    getSetupStatus,
    validateInvite,
    sendAdminInvite,
    listInvites,
    revokeInvite
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateAdminRegistration, validateAdminLogin, validateAdminInvite } = require('../middleware/validation');

// Public routes
router.get('/setup-status', getSetupStatus);
router.get('/validate-invite', validateInvite);
router.post('/register', validateAdminRegistration, registerAdmin);
router.post('/login', validateAdminLogin, loginAdmin);

// Protected routes
router.get('/', auth, getAdmin);
router.get('/me', auth, getAdmin);
router.post('/invite', auth, validateAdminInvite, sendAdminInvite);
router.get('/invites', auth, listInvites);
router.delete('/invites/:id', auth, revokeInvite);

module.exports = router;
