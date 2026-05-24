/**
 * Simple in-memory cache utility for the Performance Suite.
 * Stores data with an expiration time.
 */

const cache = new Map();

export const setCache = (key, data, durationMinutes = 5) => {
    const expires = Date.now() + durationMinutes * 60 * 1000;
    cache.set(key, { data, expires });
};

export const getCache = (key) => {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
        cache.delete(key);
        return null;
    }

    return item.data;
};

export const clearCache = (key) => {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
};

export default {
    set: setCache,
    get: getCache,
    clear: clearCache
};
