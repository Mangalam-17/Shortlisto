/**
 * Reusable utility to build MongoDB query filters and pagination from request query parameters.
 * Optimized for performance with reduced object allocations and efficient loops.
 * Supports:
 * - Basic equality filters
 * - Search (regex)
 * - Range filters (min/max)
 * - Multi-select (comma-separated strings)
 * - Date ranges
 * - Dynamic custom filters object (JSON)
 */

const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @param {Object} query - req.query object
 * @param {Object} options - configuration
 * @param {Array} options.searchFields - fields to search with 'search' param
 * @param {Array} options.numericFields - fields to treat as numbers (for min/max)
 * @param {Array} options.dateFields - fields to treat as dates (for range)
 * @param {Array} options.multiSelectFields - fields that can be comma-separated
 * @param {Array} options.exactMatchFields - fields that must match exactly
 * @param {Boolean} options.useResponsesMap - if true, checks in 'responses.' for unknown fields
 * @param {Object} options.baseQuery - initial query object (e.g. { drive: driveId })
 */
const buildQueryFilters = (query, options = {}) => {
    const {
        searchFields = [],
        numericFields = [],
        dateFields = [],
        multiSelectFields = [],
        exactMatchFields = [],
        useResponsesMap = true,
        baseQuery = {}
    } = options;

    let mongoQuery = { ...baseQuery };
    const andFilters = [];

    // 1. Pagination - optimized parsing
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;

    // 2. Search - optimized regex construction
    if (query.search && searchFields.length > 0) {
        const safeSearch = escapeRegex(query.search);
        const orConditions = [];
        
        // Pre-allocate array for better performance
        for (let i = 0; i < searchFields.length; i++) {
            orConditions.push({
                [searchFields[i]]: { $regex: safeSearch, $options: 'i' }
            });
        }
        
        andFilters.push({ $or: orConditions });
    }

    // 3. Known Parameters - optimized single loop
    const queryKeys = Object.keys(query);
    const queryKeysLength = queryKeys.length;
    
    for (let i = 0; i < queryKeysLength; i++) {
        const key = queryKeys[i];
        const val = query[key];
        
        if (val === undefined || val === null || val === '') continue;

        // Ranges (minX, maxX) - optimized field extraction
        if (key.length > 3 && (key.startsWith('min') || key.startsWith('max'))) {
            const isMin = key.startsWith('min');
            const actualField = key.charAt(3).toLowerCase() + key.slice(4);
            const op = isMin ? '$gte' : '$lte';
            const parsedVal = parseFloat(val);
            
            if (!isNaN(parsedVal)) {
                if (numericFields.includes(actualField) || dateFields.includes(actualField)) {
                    andFilters.push({ [actualField]: { [op]: parsedVal } });
                    continue;
                } else if (useResponsesMap) {
                    // Handle dynamic numeric fields in responses
                    andFilters.push({
                        $or: [
                            { [actualField]: { [op]: parsedVal } },
                            { [`responses.${actualField}`]: { [op]: parsedVal } }
                        ]
                    });
                    continue;
                }
            }
        }

        // Exact Match
        if (exactMatchFields.includes(key)) {
            andFilters.push({ [key]: val });
            continue;
        }

        // Multi-select - optimized string processing
        if (multiSelectFields.includes(key)) {
            const items = String(val).split(',').map(s => s.trim()).filter(Boolean);
            if (items.length > 0) {
                andFilters.push({ [key]: { $all: items } });
            }
            continue;
        }

        // Custom JSON Filters - optimized parsing
        if (key === 'filters') {
            try {
                const customFilters = typeof val === 'string' ? JSON.parse(val) : val;
                const filterKeys = Object.keys(customFilters);
                const filterKeysLength = filterKeys.length;
                
                for (let j = 0; j < filterKeysLength; j++) {
                    const f = filterKeys[j];
                    const condition = customFilters[f];
                    const mongoCondition = {};
                    
                    // Optimized condition building
                    if (condition.gte !== undefined) mongoCondition.$gte = condition.gte;
                    if (condition.lte !== undefined) mongoCondition.$lte = condition.lte;
                    if (condition.gt !== undefined) mongoCondition.$gt = condition.gt;
                    if (condition.lt !== undefined) mongoCondition.$lt = condition.lt;
                    if (condition.in !== undefined) mongoCondition.$in = condition.in;
                    if (condition.all !== undefined) mongoCondition.$all = condition.all;
                    if (condition.eq !== undefined) mongoCondition.$eq = condition.eq;
                    
                    if (Object.keys(mongoCondition).length > 0) {
                        andFilters.push({ [f]: mongoCondition });
                    }
                }
            } catch (e) {
                console.error('Failed to parse custom filters JSON', e);
            }
            continue;
        }

        // Fallback for dynamic fields - optimized check
        if (useResponsesMap && !['page', 'limit', 'search', 'filters'].includes(key)) {
            andFilters.push({
                $or: [
                    { [key]: val },
                    { [`responses.${key}`]: val }
                ]
            });
        }
    }

    if (andFilters.length > 0) {
        mongoQuery.$and = mongoQuery.$and ? [...mongoQuery.$and, ...andFilters] : andFilters;
    }

    return {
        mongoQuery,
        pagination: {
            page,
            limit,
            skip
        }
    };
};

module.exports = buildQueryFilters;
