/**
 * Security Headers Middleware
 * Content Security Policy and other security headers
 */

/**
 * Security headers configuration
 */
const securityHeaders = (req, res, next) => {
    // Content Security Policy
    const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' ws: wss: https:",
        "frame-ancestors 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'"
    ].join('; ');

    // Set security headers
    res.setHeader('Content-Security-Policy', cspDirectives);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
    
    // HSTS (uncomment in production with HTTPS)
    // res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * CORS configuration for API
 */
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        // Production: whitelist specific origins
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'https://tekvwarho.com',
            'https://www.tekvwarho.com'
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID'],
    maxAge: 86400 // 24 hours
};

/**
 * Bot protection middleware
 * Basic checks to filter obvious bots
 */
const botProtection = (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';
    
    // Block requests without User-Agent (except for specific paths)
    const exemptPaths = ['/api/health', '/api/webhook'];
    if (!userAgent && !exemptPaths.includes(req.path)) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Request blocked'
            }
        });
    }
    
    // Block known bad bots (add more as needed)
    const blockedBots = [
        'python-requests',
        'python-urllib',
        'curl/',
        'wget/',
        'Go-http-client',
        'Java/',
        'libwww-perl'
    ];
    
    // Only block in production and for sensitive endpoints
    const sensitiveEndpoints = ['/api/admin/login', '/api/contact', '/api/newsletter'];
    if (process.env.NODE_ENV === 'production' && 
        sensitiveEndpoints.some(ep => req.path.startsWith(ep))) {
        const isBlockedBot = blockedBots.some(bot => 
            userAgent.toLowerCase().includes(bot.toLowerCase())
        );
        
        if (isBlockedBot) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Request blocked'
                }
            });
        }
    }
    
    next();
};

/**
 * Honeypot field validation middleware
 * Creates a hidden field that bots will fill out
 */
const honeypotCheck = (fieldName = 'website_url') => {
    return (req, res, next) => {
        // If honeypot field is filled, it's a bot
        if (req.body && req.body[fieldName]) {
            // Don't reveal it's a honeypot - just silently accept
            console.log(`Honeypot triggered from IP: ${req.ip}`);
            return res.json({ success: true, message: 'Thank you for your submission.' });
        }
        
        // Remove honeypot field from body
        if (req.body) {
            delete req.body[fieldName];
        }
        
        next();
    };
};

/**
 * Request timing analysis
 * Bots often submit forms too quickly
 */
const formTimingCheck = (minSeconds = 3) => {
    return (req, res, next) => {
        const submittedAt = req.body._form_timestamp;
        
        if (submittedAt) {
            const now = Date.now();
            const submitted = parseInt(submittedAt, 10);
            const elapsed = (now - submitted) / 1000;
            
            if (elapsed < minSeconds) {
                console.log(`Form submitted too quickly (${elapsed}s) from IP: ${req.ip}`);
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Please wait before submitting the form.'
                    }
                });
            }
        }
        
        // Remove timing field from body
        if (req.body) {
            delete req.body._form_timestamp;
        }
        
        next();
    };
};

module.exports = {
    securityHeaders,
    corsOptions,
    botProtection,
    honeypotCheck,
    formTimingCheck
};
