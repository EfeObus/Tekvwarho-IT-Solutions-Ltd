/**
 * Rate Limiter Middleware
 * Protects against brute force and abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * Normalize IP address for consistent rate limiting
 * Handles IPv6 addresses properly to prevent bypass
 */
const normalizeIp = (ip) => {
    if (!ip) return 'unknown';
    // Handle IPv6 localhost
    if (ip === '::1') return '127.0.0.1';
    // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    // Handle full IPv6 - normalize by using first 4 segments (/64 prefix)
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length >= 4) {
            return parts.slice(0, 4).join(':');
        }
    }
    return ip;
};

/**
 * Common options to disable IPv6 keyGenerator validation
 * We handle IPv6 normalization manually with normalizeIp()
 */
const commonOptions = {
    standardHeaders: true,
    legacyHeaders: false,
    validate: false  // Disable all validation warnings since we handle IPv6 with normalizeIp()
};

/**
 * Login rate limiter - strict for security
 */
const loginLimiter = rateLimit({
    ...commonOptions,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { 
        success: false, 
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again in 15 minutes.'
        }
    },
    keyGenerator: (req) => {
        const ip = normalizeIp(req.ip);
        const email = req.body.email || 'unknown';
        return `login:${ip}:${email}`;
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: {
                code: 'RATE_LIMITED',
                message: 'Too many login attempts. Please try again in 15 minutes.',
                retryAfter: 15 * 60
            }
        });
    }
});

/**
 * Contact form rate limiter
 */
const contactFormLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 submissions per hour
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'You have submitted too many messages. Please try again in an hour.'
        }
    },
    keyGenerator: (req) => `contact:${normalizeIp(req.ip)}`
});

/**
 * Newsletter subscription rate limiter
 */
const newsletterLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many subscription attempts. Please try again later.'
        }
    },
    keyGenerator: (req) => `newsletter:${normalizeIp(req.ip)}`
});

/**
 * Booking rate limiter
 */
const bookingLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 bookings per hour
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'You have made too many booking requests. Please try again in an hour.'
        }
    },
    keyGenerator: (req) => `booking:${normalizeIp(req.ip)}`
});

/**
 * Chat message rate limiter (per session)
 */
const chatMessageLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 messages per minute
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'You are sending messages too quickly. Please slow down.'
        }
    },
    keyGenerator: (req) => `chat:${normalizeIp(req.ip)}:${req.body.sessionId || 'unknown'}`
});

/**
 * Authenticated API rate limiter - more generous
 */
const authenticatedApiLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.'
        }
    },
    skip: (req) => {
        return req.path === '/api/health';
    },
    keyGenerator: (req) => {
        return req.user ? `auth:${req.user.id}` : `ip:${normalizeIp(req.ip)}`;
    }
});

/**
 * Public API rate limiter - stricter
 */
const publicApiLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.'
        }
    },
    keyGenerator: (req) => `public:${normalizeIp(req.ip)}`
});

/**
 * Password reset rate limiter - very strict
 */
const passwordResetLimiter = rateLimit({
    ...commonOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many password reset requests. Please try again in an hour.'
        }
    },
    keyGenerator: (req) => `reset:${normalizeIp(req.ip)}:${req.body.email || 'unknown'}`
});

/**
 * Token refresh rate limiter
 */
const refreshTokenLimiter = rateLimit({
    ...commonOptions,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 refreshes per 15 minutes
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many token refresh requests.'
        }
    },
    keyGenerator: (req) => `refresh:${normalizeIp(req.ip)}`
});

/**
 * Data export rate limiter - prevent abuse of heavy operations
 */
const exportLimiter = rateLimit({
    ...commonOptions,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 exports per 5 minutes
    message: { 
        success: false,
        error: {
            code: 'RATE_LIMITED',
            message: 'Too many export requests. Please wait before trying again.'
        }
    },
    keyGenerator: (req) => `export:${req.user?.id || normalizeIp(req.ip)}`
});

module.exports = {
    loginLimiter,
    contactFormLimiter,
    newsletterLimiter,
    bookingLimiter,
    chatMessageLimiter,
    authenticatedApiLimiter,
    publicApiLimiter,
    passwordResetLimiter,
    refreshTokenLimiter,
    exportLimiter
};
