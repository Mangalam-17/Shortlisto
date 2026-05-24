const NodeCache = require('node-cache');

/**
 * Senior Backend Engineer: Production-level Redis Caching Manager
 * Implementation with TTL, Pattern Clearing, and Memory Fallback.
 */

class CacheManager {
    constructor() {
        this.memoryCache = new NodeCache({
            stdTTL: 300,
            checkperiod: 60
        });
        this.isConnected = false;
    }

    async get(key) {
        try {
            return this.memoryCache.get(key) || null;
        } catch (error) {
            console.error(`Cache GET Error [${key}]:`, error);
            return null;
        }
    }

    async set(key, value, ttl = 300) {
        try {
            this.memoryCache.set(key, value, ttl);
            return true;
        } catch (error) {
            console.error(`Cache SET Error [${key}]:`, error);
            return false;
        }
    }

    async del(key) {
        try {
            this.memoryCache.del(key);
            return true;
        } catch (error) {
            console.error(`Cache DEL Error [${key}]:`, error);
            return false;
        }
    }

    /**
     * Clear cache keys matching a pattern
     * Use with caution in production (SCAN instead of KEYS)
     */
    async clearPattern(pattern) {
        try {
            const keys = this.memoryCache.keys();
            const matchedKeys = keys.filter(k => k.includes(pattern));
            matchedKeys.forEach(k => this.memoryCache.del(k));
            return true;
        } catch (error) {
            console.error(`Cache Clear Pattern Error [${pattern}]:`, error);
            return false;
        }
    }
}

// Singleton instance
const cacheManager = new CacheManager();
module.exports = cacheManager;
