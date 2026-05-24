const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getEmailSettings, updateEmailSettings, testEmail } = require('../controllers/settingsController');

router.get('/email', auth, getEmailSettings);
router.put('/email', auth, updateEmailSettings);
router.post('/email/test', auth, testEmail);

module.exports = router;
