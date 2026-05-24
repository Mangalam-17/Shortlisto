const EmailSettings = require('../models/EmailSettings');
const { encrypt } = require('../utils/crypto/secret');
const { reloadFromDb } = require('../utils/email/emailTransporter');
const { sendMail } = require('../utils/email/emailHelper');

exports.getEmailSettings = async (req, res) => {
    res.locals.skipCache = true;
    const doc = await EmailSettings.findOne({ key: 'smtp' }).lean();
    if (!doc) {
        return res.json({
            host: '',
            port: 587,
            secure: false,
            user: '',
            hasPass: false
        });
    }
    return res.json({
        host: doc.host || '',
        port: doc.port || 587,
        secure: !!doc.secure,
        user: doc.user || '',
        hasPass: !!doc.pass
    });
};

exports.updateEmailSettings = async (req, res) => {
    res.locals.skipCache = true;
    const { host, port, secure, user, pass } = req.body || {};
    if (!user) {
        return res.status(400).json({ msg: 'User is required' });
    }
    const update = {
        host: host || '',
        port: port ? parseInt(port) : 587,
        secure: !!secure,
        user: user,
        updatedAt: new Date(),
        updatedBy: req.admin.id
    };
    if (typeof pass === 'string' && pass.length > 0) {
        update.pass = encrypt(pass);
    }
    const doc = await EmailSettings.findOneAndUpdate(
        { key: 'smtp' },
        { $set: update },
        { upsert: true, returnDocument: 'after' }
    );
    await reloadFromDb();
    return res.json({ msg: 'SMTP settings updated' });
};

exports.testEmail = async (req, res) => {
    res.locals.skipCache = true;
    const { to, subject, text } = req.body || {};
    const settings = await EmailSettings.findOne({ key: 'smtp' }).lean();
    if (!settings || !settings.user || !settings.pass) {
        return res.status(400).json({ msg: 'SMTP settings are not configured' });
    }
    if (!to) {
        return res.status(400).json({ msg: 'Recipient email (to) is required' });
    }
    try {
        const result = await sendMail({
            to,
            subject: subject || 'Shortlisto SMTP Test',
            text: text || 'This is a test email to verify SMTP configuration.'
        });
        return res.json({ ok: true, messageId: result.messageId });
    } catch (err) {
        return res.status(400).json({ msg: 'SMTP test failed', error: err.message });
    }
};
