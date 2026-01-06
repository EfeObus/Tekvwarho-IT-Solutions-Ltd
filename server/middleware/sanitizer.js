/**
 * Input Sanitizer Middleware
 * XSS protection and input sanitization
 */

const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const validator = require('validator');

// Create DOMPurify instance
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify - allow only safe subset
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
};

/**
 * Sanitize a string value
 */
const sanitizeString = (str, options = {}) => {
    if (typeof str !== 'string') return str;
    
    const {
        allowHtml = false,
        maxLength = 10000,
        trim = true,
        normalizeWhitespace = false
    } = options;

    let result = str;

    // Trim whitespace
    if (trim) {
        result = result.trim();
    }

    // Normalize multiple spaces/newlines
    if (normalizeWhitespace) {
        result = result.replace(/\s+/g, ' ');
    }

    // Truncate to max length
    if (result.length > maxLength) {
        result = result.substring(0, maxLength);
    }

    // HTML sanitization
    if (allowHtml) {
        result = DOMPurify.sanitize(result, DOMPURIFY_CONFIG);
    } else {
        // Strip all HTML
        result = DOMPurify.sanitize(result, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        // Also escape any remaining < > characters
        result = result.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return result;
};

/**
 * Sanitize email
 */
const sanitizeEmail = (email) => {
    if (typeof email !== 'string') return '';
    
    let result = email.trim().toLowerCase();
    
    // Validate email format
    if (!validator.isEmail(result)) {
        return '';
    }
    
    // Normalize email
    result = validator.normalizeEmail(result) || '';
    
    return result;
};

/**
 * Sanitize phone number
 */
const sanitizePhone = (phone) => {
    if (typeof phone !== 'string') return '';
    
    // Remove all non-digit characters except + - ( ) and spaces
    let result = phone.replace(/[^\d+\-() ]/g, '');
    
    // Limit length
    if (result.length > 20) {
        result = result.substring(0, 20);
    }
    
    return result;
};

/**
 * Sanitize name field
 */
const sanitizeName = (name) => {
    if (typeof name !== 'string') return '';
    
    // Remove any HTML
    let result = DOMPurify.sanitize(name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    
    // Remove special characters except hyphen, apostrophe, space
    result = result.replace(/[^a-zA-Z\u00C0-\u024F\s'-]/g, '');
    
    // Limit length
    if (result.length > 100) {
        result = result.substring(0, 100);
    }
    
    return result.trim();
};

/**
 * Sanitize URL
 */
const sanitizeUrl = (url) => {
    if (typeof url !== 'string') return '';
    
    const trimmed = url.trim();
    
    // Block javascript: and data: URLs
    if (/^(javascript|data|vbscript):/i.test(trimmed)) {
        return '';
    }
    
    // Validate URL format
    if (!validator.isURL(trimmed, { 
        protocols: ['http', 'https'],
        require_protocol: true 
    })) {
        // Try adding https:// prefix
        if (validator.isURL(`https://${trimmed}`, { 
            protocols: ['https'],
            require_protocol: true 
        })) {
            return `https://${trimmed}`;
        }
        return '';
    }
    
    return trimmed;
};

/**
 * Deep sanitize an object
 */
const sanitizeObject = (obj, schema = {}) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        const fieldSchema = schema[key] || {};
        
        if (Array.isArray(value)) {
            result[key] = value.map(item => {
                if (typeof item === 'object') {
                    return sanitizeObject(item, fieldSchema.items || {});
                }
                return sanitizeString(item, fieldSchema);
            });
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value, fieldSchema.properties || {});
        } else if (typeof value === 'string') {
            // Apply field-specific sanitization
            switch (fieldSchema.type) {
                case 'email':
                    result[key] = sanitizeEmail(value);
                    break;
                case 'phone':
                    result[key] = sanitizePhone(value);
                    break;
                case 'name':
                    result[key] = sanitizeName(value);
                    break;
                case 'url':
                    result[key] = sanitizeUrl(value);
                    break;
                case 'html':
                    result[key] = sanitizeString(value, { allowHtml: true, ...fieldSchema });
                    break;
                default:
                    result[key] = sanitizeString(value, fieldSchema);
            }
        } else {
            result[key] = value;
        }
    }
    
    return result;
};

/**
 * Request body sanitization middleware
 */
const sanitizeBody = (schema = {}) => {
    return (req, res, next) => {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body, schema);
        }
        next();
    };
};

/**
 * General sanitization middleware - sanitizes all string fields
 */
const sanitizeRequest = (req, res, next) => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                // Basic sanitization for all string fields
                req.body[key] = sanitizeString(value, { 
                    allowHtml: false,
                    maxLength: 10000 
                });
            }
        }
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
                req.query[key] = sanitizeString(value, { 
                    allowHtml: false,
                    maxLength: 500 
                });
            }
        }
    }
    
    next();
};

/**
 * Schemas for common forms
 */
const schemas = {
    contactForm: {
        name: { type: 'name', maxLength: 100 },
        email: { type: 'email' },
        phone: { type: 'phone' },
        company: { maxLength: 255 },
        service: { maxLength: 100 },
        message: { allowHtml: false, maxLength: 5000 }
    },
    
    bookingForm: {
        name: { type: 'name', maxLength: 100 },
        email: { type: 'email' },
        phone: { type: 'phone' },
        company: { maxLength: 255 },
        service: { maxLength: 100 },
        notes: { allowHtml: false, maxLength: 2000 }
    },
    
    chatMessage: {
        content: { allowHtml: false, maxLength: 2000 }
    },
    
    staffProfile: {
        name: { type: 'name', maxLength: 100 },
        email: { type: 'email' },
        phone: { type: 'phone' },
        department: { maxLength: 100 }
    },
    
    newsletter: {
        email: { type: 'email' },
        name: { type: 'name', maxLength: 100 }
    }
};

module.exports = {
    sanitizeString,
    sanitizeEmail,
    sanitizePhone,
    sanitizeName,
    sanitizeUrl,
    sanitizeObject,
    sanitizeBody,
    sanitizeRequest,
    schemas
};
