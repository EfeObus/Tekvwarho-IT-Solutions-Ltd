/**
 * Authentication Middleware
 * JWT token verification
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token middleware
 */
const authMiddleware = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided' 
            });
        }

        // Check Bearer format
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token format' 
            });
        }

        const token = parts[1];

        // Verify token
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'your-secret-key'
        );

        // Attach user to request
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        
        return res.status(401).json({ 
            success: false,
            message: 'Invalid token' 
        });
    }
};

/**
 * Admin role check middleware
 */
const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false,
            message: 'Admin access required' 
        });
    }
    next();
};

/**
 * Permission check middleware factory
 */
const hasPermission = (permission) => {
    return (req, res, next) => {
        // Admins have all permissions
        if (req.user.role === 'admin') {
            return next();
        }

        const permissions = req.user.permissions || {};
        const permissionMap = {
            'messages': permissions.canManageMessages,
            'consultations': permissions.canManageConsultations,
            'chats': permissions.canManageChats,
            'analytics': permissions.canViewAnalytics,
            'staff': req.user.role === 'admin' || req.user.role === 'manager'
        };

        if (!permissionMap[permission]) {
            return res.status(403).json({ 
                success: false,
                message: `You don't have permission to access this resource` 
            });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    adminOnly,
    hasPermission
};
