const queueManager = require('../utils/queue/queueManager');

/**
 * Dedicated Analysis Queue Initialization
 */
const analysisQueue = queueManager.createQueue('analysisQueue');

module.exports = analysisQueue;
