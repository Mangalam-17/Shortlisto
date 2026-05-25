const { Resend } = require('resend');
const EmailSettings = require('../../models/EmailSettings');

/**
 * Email sender using Resend API (HTTPS — works on Railway free/hobby plans).
 * The "from" address is always read from MongoDB so changes in Settings
 * take effect immediately without a server restart.
 */

let _resend = null;

function getResendClient() {
    if (_resend) return _resend;
    const key = process.env.RESEND_API_KEY;
    if (!key) {
        throw new Error(
            'RESEND_API_KEY is not set. Add it in your Railway environment variables.'
        );
    }
    _resend = new Resend(key);
    return _resend;
}

/**
 * Always reads the from address live from DB.
 * Falls back to onboarding@resend.dev only if nothing is configured yet.
 */
async function getFromAddress() {
    try {
        const settings = await EmailSettings.findOne({ key: 'smtp' }).lean();
        if (settings && settings.user) {
            return settings.user;
        }
    } catch (err) {
        console.warn('⚠️  Could not read from address from DB:', err.message);
    }
    // Resend's test address — works without domain verification
    return 'onboarding@resend.dev';
}

async function sendMail({ to, subject, text, html }) {
    const client = getResendClient();
    const from = await getFromAddress();

    const payload = { from, to, subject };
    if (html)  payload.html = html;
    if (text)  payload.text = text;
    if (!html && !text) payload.text = subject;

    const { data, error } = await client.emails.send(payload);

    if (error) {
        console.error('❌ Resend email failed:', JSON.stringify(error));
        // If domain not verified, retry with Resend's shared test domain
        if (error.message?.toLowerCase().includes('domain') || error.name === 'validation_error') {
            console.warn('⚠️  From domain not verified, retrying with onboarding@resend.dev');
            payload.from = 'onboarding@resend.dev';
            const retry = await client.emails.send(payload);
            if (retry.error) {
                throw new Error(retry.error.message || JSON.stringify(retry.error));
            }
            if (!retry.data) {
                throw new Error('Resend returned no data on retry');
            }
            console.log(`✅ Email sent to ${to} via onboarding@resend.dev (fallback) — id: ${retry.data.id}`);
            return { messageId: retry.data.id };
        }
        throw new Error(error.message || JSON.stringify(error));
    }

    console.log(`✅ Email sent to ${to} from ${from} via Resend — id: ${data.id}`);
    return { messageId: data.id };
}

// No-op — kept for API compatibility (SMTP used to need this)
async function reloadFromDb() {}

function getStatus() {
    return {
        hasTransporter: !!process.env.RESEND_API_KEY,
        provider: 'resend'
    };
}

module.exports = { sendMail, reloadFromDb, getStatus };
