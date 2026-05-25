const EmailSettings = require('../models/EmailSettings');
const { encrypt } = require('../utils/crypto/secret');
const { sendMail } = require('../utils/email/emailHelper');

exports.getEmailSettings = async (req, res) => {
    res.locals.skipCache = true;
    const doc = await EmailSettings.findOne({ key: 'smtp' }).lean();
    if (!doc) {
        return res.json({ host: '', port: 587, secure: false, user: '', hasPass: false });
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
        return res.status(400).json({ msg: 'Username (From address) is required' });
    }
    const update = {
        host: host || '',
        port: port ? parseInt(port) : 587,
        secure: !!secure,
        user: user.trim().toLowerCase(),
        updatedAt: new Date(),
        updatedBy: req.admin.id
    };
    if (typeof pass === 'string' && pass.length > 0) {
        update.pass = encrypt(pass);
    }
    await EmailSettings.findOneAndUpdate(
        { key: 'smtp' },
        { $set: update },
        { upsert: true, returnDocument: 'after' }
    );
    // No transporter reload needed — from address is read live from DB on every send
    return res.json({ msg: 'Settings saved. The from address is now: ' + update.user });
};

exports.testEmail = async (req, res) => {
    res.locals.skipCache = true;
    const { to, subject, text } = req.body || {};
    if (!to) {
        return res.status(400).json({ msg: 'Recipient email (to) is required' });
    }
    if (!process.env.RESEND_API_KEY) {
        return res.status(400).json({ msg: 'RESEND_API_KEY is not set. Add it in your Railway environment variables.' });
    }
    try {
        const result = await sendMail({
            to,
            subject: subject || 'Shortlisto Email Test',
            text: text || 'This is a test email from Shortlisto. Your email configuration is working correctly.'
        });
        return res.json({ ok: true, messageId: result.messageId });
    } catch (err) {
        return res.status(400).json({
            msg: 'Email send failed',
            error: err.message,
            hint: err.message?.toLowerCase().includes('domain')
                ? 'Your "from" email domain is not verified in Resend. Go to resend.com/domains → add your domain → verify DNS records. Until then, use onboarding@resend.dev as the From address (emails will still be delivered).'
                : err.message?.includes('API key') || err.message?.includes('Unauthorized')
                ? 'Invalid Resend API key. Check RESEND_API_KEY in Railway environment variables.'
                : undefined
        });
    }
};
