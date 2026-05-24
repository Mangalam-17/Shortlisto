const queueManager = require('../utils/queue/queueManager');
const { sendMail } = require('../utils/email/emailHelper');

const emailWorker = queueManager.createWorker('emailQueue', async (job) => {
    const { to, subject, text, html } = job.data;
    const result = await sendMail({ to, subject, text, html });
    return { success: true, messageId: result.messageId };
}, { concurrency: 10 });

module.exports = emailWorker;
