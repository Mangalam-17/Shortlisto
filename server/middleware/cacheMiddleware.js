const cacheManager = require('../utils/cache/cacheManager');

/**
 * Unified Cache Middleware using CacheManager
 * Replaces the duplicate cache implementation
 */
const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        // Skip caching for non-GET requests or if explicitly requested or for real-time critical endpoints
        if (
            req.method !== 'GET' || 
            req.skipCache || 
            res.locals.skipCache || 
            req.originalUrl.includes('/dashboard/stats') ||
            req.originalUrl.includes('/assessments/test')
        ) {
            return next();
        }

        const userId = req.user?.id || req.candidate?.id || req.admin?.id || 'anonymous';
        const key = `cache:${req.originalUrl}:${userId}`;

        try {
            const cached = await cacheManager.get(key);
            if (cached) {
                return res.json(cached);
            }
        } catch (error) {
            console.error('Cache retrieval error:', error);
        }

        // Continue to next middleware
        res.locals.cacheKey = key;
        res.locals.cacheDuration = duration;
        next();
    };
};

/**
 * Cache response middleware
 */
const cacheResponse = () => {
    return (req, res, next) => {
        const originalJson = res.json;

        res.json = function (data) {
            // Cache response if cache key exists and skipCache is NOT set
            if (res.locals.cacheKey && data.success !== false && !res.locals.skipCache) {
                cacheManager.set(res.locals.cacheKey, data, res.locals.cacheDuration);
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Clear cache pattern
 */
const clearCache = async (pattern) => {
    try {
        await cacheManager.clearPattern(pattern);
    } catch (error) {
        console.error('Cache clear error:', error);
    }
};

module.exports = {
    cacheMiddleware,
    cacheResponse,
    clearCache
};
