/**
 * Global Error Handler Middleware
 * Centralized error handling with structured responses
 */

const crypto = require('crypto');

/**
 * Custom Application Error class
 */
class AppError extends Error {
    constructor(code, message, statusCode = 500, details = null) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common error types
 */
const ErrorTypes = {
    VALIDATION_ERROR: (message, details) => new AppError('VALIDATION_ERROR', message, 400, details),
    AUTHENTICATION_ERROR: (message) => new AppError('AUTHENTICATION_ERROR', message || 'Authentication required', 401),
    AUTHORIZATION_ERROR: (message) => new AppError('AUTHORIZATION_ERROR', message || 'Access denied', 403),
    NOT_FOUND: (resource) => new AppError('NOT_FOUND', `${resource || 'Resource'} not found`, 404),
    CONFLICT: (message) => new AppError('CONFLICT', message, 409),
    RATE_LIMITED: (retryAfter) => new AppError('RATE_LIMITED', 'Too many requests', 429, { retryAfter }),
    INTERNAL_ERROR: (message) => new AppError('INTERNAL_ERROR', message || 'Internal server error', 500),
    SERVICE_UNAVAILABLE: (service) => new AppError('SERVICE_UNAVAILABLE', `${service || 'Service'} is unavailable`, 503)
};

/**
 * Request ID middleware
 */
const requestId = (req, res, next) => {
    const id = req.headers['x-request-id'] || `req_${crypto.randomBytes(8).toString('hex')}`;
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Not found handler (404)
 */
const notFoundHandler = (req, res, next) => {
    const error = ErrorTypes.NOT_FOUND(`Route ${req.originalUrl}`);
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    const errorLog = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        error: {
            name: err.name,
            message: err.message,
            code: err.code,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
        }
    };

    // Determine error type and response
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';
    let message = err.message || 'An unexpected error occurred';
    let details = err.details;

    // Handle specific error types
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'AUTHENTICATION_ERROR';
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Token has expired';
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    } else if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        code = 'CONFLICT';
        message = 'A record with this value already exists';
    } else if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Referenced record does not exist';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = 'Database connection failed';
    }

    // In production, don't leak internal error details
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred. Please try again later.';
        details = undefined;
    }

    // Log based on severity
    if (statusCode >= 500) {
        console.error('ERROR:', JSON.stringify(errorLog, null, 2));
    } else if (statusCode >= 400) {
        console.warn('WARN:', JSON.stringify(errorLog));
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            requestId: req.requestId,
            timestamp: new Date().toISOString(),
            ...(details && { details })
        }
    });
};

/**
 * Structured Logger
 */
const Logger = {
    levels: {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    },

    currentLevel: process.env.LOG_LEVEL || 'info',

    _log(level, message, meta = {}) {
        if (this.levels[level] < this.levels[this.currentLevel]) {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            message,
            ...meta
        };

        const output = JSON.stringify(logEntry);
        
        if (level === 'error') {
            console.error(output);
        } else if (level === 'warn') {
            console.warn(output);
        } else {
            console.log(output);
        }
    },

    debug(message, meta) {
        this._log('debug', message, meta);
    },

    info(message, meta) {
        this._log('info', message, meta);
    },

    warn(message, meta) {
        this._log('warn', message, meta);
    },

    error(message, meta) {
        this._log('error', message, meta);
    },

    // Request logging middleware
    requestLogger(req, res, next) {
        const start = Date.now();

        res.on('finish', () => {
            const duration = Date.now() - start;
            const logLevel = res.statusCode >= 500 ? 'error' : 
                            res.statusCode >= 400 ? 'warn' : 'info';
            
            Logger._log(logLevel, 'HTTP Request', {
                requestId: req.requestId,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userId: req.user?.id,
                ip: req.ip
            });
        });

        next();
    }
};

module.exports = {
    AppError,
    ErrorTypes,
    requestId,
    asyncHandler,
    notFoundHandler,
    errorHandler,
    Logger
};
