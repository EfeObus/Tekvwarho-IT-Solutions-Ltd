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

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({
                success: false,
                message: 'Server misconfiguration'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user to request
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
                error: {
                    code: 'TOKEN_EXPIRED',
                    message: 'Token expired'
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Invalid token',
            error: {
                code: 'INVALID_TOKEN',
                message: 'Invalid token'
            }
        });
    }
};

/**
 * Manager-or-above role check middleware
 * Used to gate capabilities (like bulk data export) that regular staff
 * shouldn't have, matching the "Lead/Manager" tier getting broader access
 * than "Regular Staff" within their department.
 */
const managerOrAbove = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({
            success: false,
            message: 'Manager or admin access required'
        });
    }
    next();
};

/**
 * HR-or-admin role check middleware
 * Gates staff records, onboarding, contracts, and handbook management.
 */
const hrOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
        return res.status(403).json({
            success: false,
            message: 'HR or admin access required'
        });
    }
    next();
};

/**
 * Accountant-or-admin role check middleware
 * Gates payroll operations (posting/recording salary payments, paystubs).
 * Does NOT by itself allow changing a staff member's base_salary figure -
 * that stays admin-only (see adminOnly) so a raise always requires
 * Admin sign-off, not just the Accountant who processes payroll.
 */
const accountantOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'accountant') {
        return res.status(403).json({
            success: false,
            message: 'Accountant or admin access required'
        });
    }
    next();
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
            // Short names
            'messages': permissions.canManageMessages,
            'consultations': permissions.canManageConsultations,
            'chats': permissions.canManageChats,
            'analytics': permissions.canViewAnalytics,
            'employees': permissions.canManageEmployees || req.user.role === 'hr',
            'payroll': permissions.canManagePayroll || req.user.role === 'accountant',
            'tickets': permissions.canManageTickets || req.user.role === 'manager',
            'onboarding': permissions.canManageOnboarding || req.user.role === 'hr',
            'staff': req.user.role === 'admin' || req.user.role === 'manager',
            // Full names (for backwards compatibility)
            'can_manage_messages': permissions.canManageMessages,
            'can_manage_consultations': permissions.canManageConsultations,
            'can_manage_chats': permissions.canManageChats,
            'can_view_analytics': permissions.canViewAnalytics,
            'can_manage_employees': permissions.canManageEmployees || req.user.role === 'hr',
            'can_manage_payroll': permissions.canManagePayroll || req.user.role === 'accountant',
            'can_manage_tickets': permissions.canManageTickets || req.user.role === 'manager',
            'can_manage_onboarding': permissions.canManageOnboarding || req.user.role === 'hr'
        };

        if (!permissionMap[permission]) {
            return res.status(403).json({
                success: false,
                message: 'You don\'t have permission to access this resource'
            });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    adminOnly,
    managerOrAbove,
    hrOrAdmin,
    accountantOrAdmin,
    hasPermission
};
