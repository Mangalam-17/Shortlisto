const pagination = (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Validate pagination parameters
    if (page < 1) {
        return res.status(400).json({
            success: false,
            message: 'Page number must be greater than 0'
        });
    }
    
    if (limit < 1 || limit > 100) {
        return res.status(400).json({
            success: false,
            message: 'Limit must be between 1 and 100'
        });
    }
    
    // Add pagination to request object
    req.pagination = {
        page,
        limit,
        skip,
        totalPages: 0,
        totalDocs: 0
    };
    
    next();
};

// Helper function to create pagination response
const createPaginationResponse = (data, totalDocs, pagination) => {
    const totalPages = Math.ceil(totalDocs / pagination.limit);
    
    return {
        success: true,
        data,
        pagination: {
            currentPage: pagination.page,
            totalPages,
            totalDocs,
            limit: pagination.limit,
            hasNextPage: pagination.page < totalPages,
            hasPrevPage: pagination.page > 1,
            nextPage: pagination.page < totalPages ? pagination.page + 1 : null,
            prevPage: pagination.page > 1 ? pagination.page - 1 : null
        }
    };
};

module.exports = {
    pagination,
    createPaginationResponse
};
