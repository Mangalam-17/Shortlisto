const { sendMail } = require('./emailTransporter');

/**
 * Standard Email Utility for Worker Usage
 * Now uses optimized reusable transporter
 */
const sendEmail = async ({ to, subject, text, html }) => {
    return await sendMail({ to, subject, text, html });
};

module.exports = { sendMail: sendEmail };
