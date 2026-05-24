const queueManager = require('../utils/queue/queueManager');

/**
 * Dedicated Email Queue Initialization
 */
const emailQueue = queueManager.createQueue('emailQueue');

module.exports = emailQueue;
