/**
 * Application Configuration Service
 * Centralizes all configuration values for better maintainability
 */
class AppConfig {
    constructor() {
        this.cache = {
            defaultTTL: 300, // 5 minutes
            shortTTL: 60,    // 1 minute
            longTTL: 3600,  // 1 hour
            questionTTL: 600, // 10 minutes for questions
            driveTTL: 300    // 5 minutes for drives
        };

        this.pagination = {
            defaultLimit: 20,
            maxLimit: 100,
            defaultPage: 1
        };

        this.email = {
            maxConnections: 5,
            maxMessages: 100,
            resetTokenExpiry: 10 * 60 * 1000 // 10 minutes
        };

        this.security = {
            bcryptRounds: 12,
            jwtExpiry: '24h',
            maxLoginAttempts: 5,
            loginLockoutTime: 15 * 60 * 1000 // 15 minutes
        };

        this.validation = {
            maxFormFields: 50,
            maxFieldIdLength: 50,
            maxBatchSize: 1000
        };

        this.queue = {
            defaultConcurrency: 5,
            emailConcurrency: 10,
            maxRetries: 3,
            backoffDelay: 1000,
            removeOnComplete: 100,
            removeOnFail: 500
        };
    }

    /**
     * Get cache TTL for different types
     * @param {string} type - Cache type
     * @returns {number} - TTL in seconds
     */
    getCacheTTL(type = 'default') {
        const ttlKey = `${type}TTL`;
        return this.cache[ttlKey] || this.cache.defaultTTL;
    }

    /**
     * Get pagination limits
     * @returns {Object} - Pagination config
     */
    getPaginationConfig() {
        return { ...this.pagination };
    }

    /**
     * Get email configuration
     * @returns {Object} - Email config
     */
    getEmailConfig() {
        return { ...this.email };
    }

    /**
     * Get security configuration
     * @returns {Object} - Security config
     */
    getSecurityConfig() {
        return { ...this.security };
    }

    /**
     * Get validation configuration
     * @returns {Object} - Validation config
     */
    getValidationConfig() {
        return { ...this.validation };
    }

    /**
     * Get queue configuration
     * @returns {Object} - Queue config
     */
    getQueueConfig() {
        return { ...this.queue };
    }

    /**
     * Check if running in production
     * @returns {boolean} - Production status
     */
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }

    /**
     * Check if Redis is available
     * @returns {boolean} - Redis availability
     */
    isRedisAvailable() {
        return !!(process.env.REDIS_URL && process.env.USE_REDIS !== 'false');
    }

    /**
     * Get database configuration
     * @returns {Object} - Database config
     */
    getDatabaseConfig() {
        return {
            uri: process.env.MONGO_URI,
            options: {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            }
        };
    }

    /**
     * Get server configuration
     * @returns {Object} - Server config
     */
    getServerConfig() {
        return {
            port: process.env.PORT || 5000,
            host: process.env.HOST || 'localhost',
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                credentials: true
            }
        };
    }
}

// Singleton instance
const appConfig = new AppConfig();

module.exports = appConfig;
