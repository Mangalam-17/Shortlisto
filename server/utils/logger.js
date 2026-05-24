const winston = require('winston');
const path = require('path');

/**
 * Production-ready Winston Logger with Log Rotation
 * Replaces console.log for better observability
 */
class Logger {
    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.errors({ stack: true }),
                winston.format.json(),
                winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
                    return JSON.stringify({
                        timestamp,
                        level,
                        message,
                        stack: stack || null,
                        ...meta
                    });
                })
            ),
            defaultMeta: {
                service: 'assess-platform',
                environment: process.env.NODE_ENV || 'development'
            },
            transports: [
                // Console transport for development
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.timestamp({
                            format: 'HH:mm:ss'
                        }),
                        winston.format.printf(({ timestamp, level, message, stack }) => {
                            let log = `${timestamp} [${level}]: ${message}`;
                            if (stack) {
                                log += `\n${stack}`;
                            }
                            return log;
                        })
                    )
                }),
                
                // File transport for production with rotation
                new winston.transports.File({
                    filename: path.join(process.cwd(), 'logs', 'combined.log'),
                    level: 'info',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }),
                
                // Error file transport with rotation
                new winston.transports.File({
                    filename: path.join(process.cwd(), 'logs', 'error.log'),
                    level: 'error',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }),
                
                // Access log transport for security events
                new winston.transports.File({
                    filename: path.join(process.cwd(), 'logs', 'access.log'),
                    level: 'warn',
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                    maxsize: 10485760, // 10MB
                    maxFiles: 3,
                    tailable: true
                })
            ],
            
            // Exception handling
            exceptionHandlers: [
                new winston.transports.File({
                    filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                    maxsize: 5242880, // 5MB
                    maxFiles: 3
                })
            ],
            
            // Rejection handling
            rejectionHandlers: [
                new winston.transports.File({
                    filename: path.join(process.cwd(), 'logs', 'rejections.log'),
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json()
                    ),
                    maxsize: 5242880, // 5MB
                    maxFiles: 3
                })
            ],
            
            // Exit on error
            exitOnError: false
        });
    }

    /**
     * Log info message
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @param {Object} meta - Additional metadata
     */
    error(message, error = null, meta = {}) {
        this.logger.error(message, { 
            error: error ? error.message : 'Unknown error',
            stack: error ? error.stack : null,
            ...meta 
        });
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    /**
     * Log debug message
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    /**
     * Log security event
     * @param {string} event - Security event
     * @param {Object} details - Event details
     */
    security(event, details = {}) {
        this.logger.warn(`SECURITY: ${event}`, {
            type: 'security',
            event,
            ...details
        });
    }

    /**
     * Log performance metric
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} meta - Additional metadata
     */
    performance(operation, duration, meta = {}) {
        this.logger.info(`PERFORMANCE: ${operation}`, {
            type: 'performance',
            operation,
            duration,
            ...meta
        });
    }

    /**
     * Log API request
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {number} duration - Request duration
     */
    apiRequest(req, res, duration) {
        this.logger.info('API Request', {
            type: 'api',
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id || req.candidate?.id || req.admin?.id || 'anonymous'
        });
    }

    /**
     * Get raw logger instance
     * @returns {Object} - Winston logger instance
     */
    getRawLogger() {
        return this.logger;
    }
}

// Singleton instance
const logger = new Logger();

// Override console methods for backward compatibility
console.info = (message, ...meta) => logger.info(message, ...meta);
console.error = (message, ...meta) => logger.error(message, ...meta);
console.warn = (message, ...meta) => logger.warn(message, ...meta);
console.debug = (message, ...meta) => logger.debug(message, ...meta);

module.exports = logger;
