const logger = require('../utils/logger');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }

    // JWT error
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
    }

    // JWT expired error
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
    }

    logger.error('API Error', {
        message: error.message,
        statusCode: error.statusCode,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    res.status(error.statusCode || 500).json({
        success: false,
        msg: error.message || 'Server Error', // Using 'msg' consistently for frontend toasts
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Override res.end to log response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        logger.apiRequest(req, res, duration);
        originalEnd.call(this, chunk, encoding);
    };
    
    next();
};

// 404 handler
const notFound = (req, res, next) => {
    const error = new Error(`Not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

module.exports = {
    errorHandler,
    asyncHandler,
    requestLogger,
    notFound
};
