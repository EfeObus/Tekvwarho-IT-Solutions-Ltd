/**
 * Admin Routes
 * Handles admin/staff authentication and operations
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Consultation = require('../models/Consultation');
const Visitor = require('../models/Visitor');
const { authMiddleware, adminOnly, hasPermission, accountantOrAdmin, hrOrAdmin } = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');
const AuditService = require('../services/auditService');
const TokenManager = require('../services/tokenManager');
const { calculateMonthlyPAYE, monthlyDevelopmentLevy } = require('../services/payeService');
const { sendAccountSetupEmail } = require('../services/emailService');

/**
 * POST /api/admin/login
 * Staff/Admin authentication with access + refresh tokens
 */
router.post('/login', loginLimiter, [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, rememberMe } = req.body;

        // Find staff member
        const staff = await Staff.findByEmail(email);
        if (!staff) {
            // Log failed attempt
            await AuditService.log({
                staffId: null,
                action: 'login_failed',
                entityType: 'auth',
                details: { email, reason: 'user_not_found' },
                ipAddress: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if active
        if (!staff.is_active) {
            await AuditService.log({
                staffId: staff.id,
                action: 'login_failed',
                entityType: 'auth',
                details: { reason: 'account_disabled' },
                ipAddress: req.ip
            });
            return res.status(401).json({
                success: false,
                message: staff.offer_accepted_at
                    ? 'Account is disabled. Please contact an administrator.'
                    : 'Your account isn\'t active yet - please accept your offer letter first (check your email), or contact HR.'
            });
        }

        // Verify password
        const isValid = await Staff.verifyPassword(password, staff.password_hash);
        if (!isValid) {
            await AuditService.log({
                staffId: staff.id,
                action: 'login_failed',
                entityType: 'auth',
                details: { reason: 'invalid_password' },
                ipAddress: req.ip
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        await Staff.updateLastLogin(staff.id);

        // Log successful login
        await AuditService.logLogin(staff.id, req.ip, true);

        // Generate access token (short-lived)
        const accessToken = TokenManager.generateAccessToken(staff);

        // Generate refresh token (long-lived, stored in DB)
        // If rememberMe is true, extends to 30 days instead of 7 days
        const refreshTokenData = await TokenManager.generateRefreshToken(
            staff.id,
            req.ip,
            req.get('User-Agent'),
            !!rememberMe
        );

        res.json({
            success: true,
            accessToken,
            refreshToken: refreshTokenData.token,
            expiresIn: 900, // 15 minutes in seconds
            refreshExpiresAt: refreshTokenData.expiresAt,
            mustChangePassword: staff.must_change_password,
            user: {
                id: staff.id,
                email: staff.email,
                name: staff.name,
                role: staff.role,
                department: staff.department,
                can_manage_messages: staff.can_manage_messages,
                can_manage_consultations: staff.can_manage_consultations,
                can_manage_chats: staff.can_manage_chats,
                can_view_analytics: staff.can_view_analytics,
                can_manage_employees: staff.can_manage_employees,
                can_manage_payroll: staff.can_manage_payroll,
                can_manage_tickets: staff.can_manage_tickets,
                can_manage_onboarding: staff.can_manage_onboarding,
                can_view_compliance: staff.can_view_compliance
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

/**
 * POST /api/admin/change-password
 * Change user password (for first login or self-change)
 */
router.post('/change-password', authMiddleware, [
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { newPassword, currentPassword } = req.body;

        // If not first login change, verify current password
        const staff = await Staff.findByEmail(req.user.email);
        if (!staff.must_change_password && currentPassword) {
            const isValid = await Staff.verifyPassword(currentPassword, staff.password_hash);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
        }

        await Staff.changePassword(req.user.id, newPassword, true);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

/**
 * GET /api/admin/me
 * Get current user info
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user info'
        });
    }
});

/**
 * GET /api/admin/profile
 * Get current user profile (alias for /me)
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({ success: true, user: staff, data: staff });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile'
        });
    }
});

/**
 * PUT /api/admin/profile
 * Update current user profile (limited fields for non-admins)
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, phone, department } = req.body;

        // Non-admin users can only update their own basic info
        const updates = { name, phone };

        // Department can be updated by admins or managers
        if (req.user.role === 'admin' || req.user.role === 'manager') {
            updates.department = department;
        }

        const staff = await Staff.update(req.user.id, updates);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update localStorage data for the frontend
        res.json({ success: true, user: staff, data: staff });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * GET /api/admin/dashboard
 * Get admin dashboard stats
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const [
            messageStats,
            consultationStats,
            activeChats,
            unreadChats,
            totalVisitors,
            recentMessages,
            upcomingConsultations
        ] = await Promise.all([
            Message.getCountByStatus(),
            Consultation.getCountByStatus(),
            Chat.getActiveCount(),
            Chat.getUnreadCount(),
            Visitor.getCount(),
            Message.getRecent(5),
            Consultation.getUpcoming(5)
        ]);

        const totalMessages = messageStats.reduce((sum, s) => sum + parseInt(s.count), 0);
        const newMessages = messageStats.find(s => s.status === 'new')?.count || 0;

        const totalConsultations = consultationStats.reduce((sum, s) => sum + parseInt(s.count), 0);
        const pendingConsultations = consultationStats.find(s => s.status === 'pending')?.count || 0;

        res.json({
            success: true,
            data: {
                stats: {
                    totalMessages,
                    newMessages: parseInt(newMessages),
                    totalConsultations,
                    pendingConsultations: parseInt(pendingConsultations),
                    activeChats,
                    unreadChats,
                    totalVisitors
                },
                messageStats,
                consultationStats,
                recentMessages,
                upcomingConsultations
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard'
        });
    }
});

/**
 * GET /api/admin/staff-dashboard
 * Get staff member's personal dashboard stats
 */
router.get('/staff-dashboard', authMiddleware, async (req, res) => {
    try {
        const staffId = req.user.id;

        // Get counts for items assigned to this staff member
        const [messagesResult, consultationsResult, chatsResult] = await Promise.all([
            db.query(
                "SELECT COUNT(*) as count FROM messages WHERE assigned_to = $1 AND status IN ('new', 'in_progress')",
                [staffId]
            ),
            db.query(
                "SELECT COUNT(*) as count FROM consultations WHERE assigned_to = $1 AND status IN ('pending', 'confirmed') AND booking_date >= CURRENT_DATE",
                [staffId]
            ),
            db.query(
                "SELECT COUNT(*) as count FROM chat_sessions WHERE assigned_to = $1 AND status = 'active'",
                [staffId]
            )
        ]);

        // Get recent tasks (including chats)
        const recentTasksResult = await db.query(`
            (SELECT 'message' as type, name as title, email as subtitle, created_at
             FROM messages WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT 3)
            UNION ALL
            (SELECT 'consultation' as type, name as title,
             booking_date::text || ' at ' || booking_time::text as subtitle, created_at
             FROM consultations WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT 3)
            UNION ALL
            (SELECT 'chat' as type, visitor_name as title, visitor_email as subtitle, started_at as created_at
             FROM chat_sessions WHERE assigned_to = $1 ORDER BY started_at DESC LIMIT 3)
            ORDER BY created_at DESC LIMIT 5
        `, [staffId]);

        res.json({
            success: true,
            stats: {
                messages: parseInt(messagesResult.rows[0]?.count || 0),
                consultations: parseInt(consultationsResult.rows[0]?.count || 0),
                chats: parseInt(chatsResult.rows[0]?.count || 0)
            },
            recentTasks: recentTasksResult.rows
        });
    } catch (error) {
        console.error('Staff dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard'
        });
    }
});

/**
 * GET /api/admin/staff
 * Get all staff members (admin only)
 */
router.get('/staff', authMiddleware, hrOrAdmin, async (req, res) => {
    try {
        const { role, isActive } = req.query;
        const filters = {};

        if (role) {
            filters.role = role;
        }
        if (isActive !== undefined) {
            filters.isActive = isActive === 'true';
        }

        const staff = await Staff.findAll(filters);
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get staff list'
        });
    }
});

/**
 * GET /api/admin/staff/count
 * Get total staff count (for onboarding check)
 */
router.get('/staff/count', authMiddleware, async (req, res) => {
    try {
        const staff = await Staff.findAll({});
        res.json({ success: true, count: staff.length });
    } catch (error) {
        console.error('Get staff count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get staff count'
        });
    }
});

/**
 * GET /api/admin/staff/active
 * Get active staff for assignment dropdowns
 */
router.get('/staff/active', authMiddleware, async (req, res) => {
    try {
        const staff = await Staff.getActiveStaff();
        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Get active staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get staff list'
        });
    }
});

/**
 * POST /api/admin/staff
 * Create/Onboard a new staff member (admin or HR - HR cannot grant the
 * admin role itself, see the role==='admin' check below)
 */
router.post('/staff', authMiddleware, hrOrAdmin, [
    body('email').isEmail().withMessage('Valid email is required'),
    // Either a manual password OR sendSetupLink is required - checked below,
    // since express-validator can't easily express "one of these two".
    body('password').if((value, { req }) => !req.body.sendSetupLink).isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['admin', 'manager', 'staff', 'hr', 'accountant']).withMessage('Invalid role'),
    body('nin').trim().isLength({ min: 11, max: 11 }).isNumeric().withMessage('NIN is required and must be 11 digits'),
    body('tin').optional({ nullable: true, checkFalsy: true }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, name, role, department, phone, nin, tin, permissions, sendSetupLink } = req.body;
        // A setup-link hire never has HR/admin choose (or even see) a real
        // password - a random one is generated here and immediately
        // superseded by the emailed link, matching the "employee sets their
        // own password" flow rather than "HR tells them a password".
        const password = sendSetupLink ? crypto.randomBytes(24).toString('hex') : req.body.password;

        // hrOrAdmin lets HR create/onboard staff, but HR must not be able to
        // mint a fellow admin (or itself) into the admin tier - only an actual
        // admin can grant admin-level access.
        if (role === 'admin' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only an admin can create another admin account'
            });
        }

        // Check if email exists
        const existing = await Staff.findByEmail(email);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        const staff = await Staff.create({
            email,
            password,
            name,
            role,
            department,
            phone,
            nin,
            tin: tin || null,
            createdBy: req.user.id,
            permissions: permissions || {}
        });

        let setupEmailSent = false;
        if (sendSetupLink) {
            try {
                const setupToken = await TokenManager.createPasswordResetToken(staff.id, req.ip, req.get('User-Agent'), 72);
                await sendAccountSetupEmail(staff.email, staff.name, setupToken);
                setupEmailSent = true;
            } catch (emailError) {
                console.error('Account setup email error (staff still created):', emailError);
            }
        }

        // Log the creation
        await AuditService.logStaffChange(req.user.id, 'created', staff.id, { email, role }, req.ip);

        res.status(201).json({ success: true, data: staff, setupEmailSent });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create staff member'
        });
    }
});

/**
 * GET /api/admin/staff/:id
 * Get staff member by ID
 */
router.get('/staff/:id', authMiddleware, async (req, res) => {
    try {
        // Staff can only view their own profile, admin can view all
        if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get staff member'
        });
    }
});

/**
 * PATCH /api/admin/staff/:id
 * Update a staff member (admin only, or self for limited fields)
 */
router.patch('/staff/:id', authMiddleware, async (req, res) => {
    try {
        const targetId = req.params.id;
        const isAdmin = req.user.role === 'admin';
        const isSelf = req.user.id === targetId;

        if (!isAdmin && !isSelf) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Non-admin can only update their own name and phone
        let updates = req.body;
        if (!isAdmin) {
            updates = {
                name: req.body.name,
                phone: req.body.phone
            };
        }

        const staff = await Staff.update(targetId, updates);
        if (!staff) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        // A role/permission/active-status change is embedded in the target's
        // access token, so it wouldn't take effect until that token expires
        // (up to 15 min) without this - bumping token_version makes
        // authMiddleware reject their current token immediately; their next
        // refresh silently picks up the new role/permissions.
        const accessFields = ['role', 'isActive', 'canManageMessages', 'canManageConsultations',
            'canManageChats', 'canViewAnalytics', 'canManageEmployees', 'canManagePayroll',
            'canManageTickets', 'canManageOnboarding', 'canViewCompliance'];
        if (accessFields.some(f => updates[f] !== undefined)) {
            await TokenManager.bumpTokenVersion(targetId);
        }

        res.json({ success: true, data: staff });
    } catch (error) {
        console.error('Update staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update staff member'
        });
    }
});

/**
 * GET /api/admin/staff/:id/salary
 * View a staff member's salary (admin/accountant, or the staff member themselves)
 */
router.get('/staff/:id/salary', authMiddleware, async (req, res) => {
    try {
        const isSelf = req.user.id === req.params.id;
        const isAccountant = req.user.role === 'accountant';
        const isAdmin = req.user.role === 'admin';

        if (!isSelf && !isAccountant && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const salary = await Staff.getSalaryInfo(req.params.id);
        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        res.json({ success: true, data: salary });
    } catch (error) {
        console.error('Get salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve salary'
        });
    }
});

/**
 * PUT /api/admin/staff/:id/salary
 * Set a staff member's base salary (admin only - a raise always requires
 * Admin sign-off, even Accountants who process payroll cannot self-approve one)
 */
router.put('/staff/:id/salary', authMiddleware, adminOnly, [
    body('baseSalary').isFloat({ min: 0 }).withMessage('Valid basic salary amount is required'),
    body('housingAllowance').optional().isFloat({ min: 0 }),
    body('transportAllowance').optional().isFloat({ min: 0 }),
    body('utilityAllowance').optional().isFloat({ min: 0 }),
    body('mealAllowance').optional().isFloat({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { baseSalary, housingAllowance, transportAllowance, utilityAllowance, mealAllowance, currency } = req.body;
        const oldSalary = await Staff.getSalaryInfo(req.params.id);
        const salary = await Staff.updateSalary(req.params.id, {
            baseSalary, housingAllowance, transportAllowance, utilityAllowance, mealAllowance,
            currency: currency || 'NGN'
        });
        if (!salary) {
            return res.status(404).json({
                success: false,
                message: 'Staff member not found'
            });
        }

        await AuditService.logStaffChange(req.user.id, 'salary_updated', req.params.id, {
            old: oldSalary ? {
                basic: oldSalary.base_salary, housing: oldSalary.housing_allowance,
                transport: oldSalary.transport_allowance, utility: oldSalary.utility_allowance,
                meal: oldSalary.meal_allowance
            } : null,
            new: { basic: baseSalary, housing: housingAllowance, transport: transportAllowance, utility: utilityAllowance, meal: mealAllowance }
        }, req.ip);

        res.json({ success: true, data: salary });
    } catch (error) {
        console.error('Update salary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update salary'
        });
    }
});

/**
 * POST /api/admin/staff/:id/activate
 * Activate a staff member (admin only)
 */
router.post('/staff/:id/activate', authMiddleware, hrOrAdmin, async (req, res) => {
    try {
        await Staff.activate(req.params.id);
        await AuditService.logStaffChange(req.user.id, 'activated', req.params.id, {}, req.ip);
        res.json({ success: true, message: 'Staff member activated' });
    } catch (error) {
        console.error('Activate staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to activate staff member'
        });
    }
});

/**
 * POST /api/admin/staff/:id/deactivate
 * Deactivate a staff member (admin, or HR for non-admin targets - HR
 * cannot deactivate an admin account)
 */
router.post('/staff/:id/deactivate', authMiddleware, hrOrAdmin, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            const target = await Staff.findById(req.params.id);
            if (target && target.role === 'admin') {
                return res.status(403).json({ success: false, message: 'Only an admin can deactivate an admin account' });
            }
        }
        await Staff.deactivate(req.params.id);
        await TokenManager.invalidateUserTokens(req.params.id, 'deactivated');
        await AuditService.logStaffChange(req.user.id, 'deactivated', req.params.id, {}, req.ip);
        res.json({ success: true, message: 'Staff member deactivated' });
    } catch (error) {
        console.error('Deactivate staff error:', error);
        res.status(500).json({
            success: false,
            message: error.message === 'Cannot deactivate the last admin user' ? error.message : 'Failed to deactivate staff member'
        });
    }
});

/**
 * POST /api/admin/staff/:id/reset-password
 * Reset staff password (admin, or HR for non-admin targets - HR cannot
 * reset an admin's password, which would otherwise let HR hijack any
 * admin account)
 */
router.post('/staff/:id/reset-password', authMiddleware, hrOrAdmin, [
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        if (req.user.role !== 'admin') {
            const target = await Staff.findById(req.params.id);
            if (target && target.role === 'admin') {
                return res.status(403).json({ success: false, message: 'Only an admin can reset an admin account\'s password' });
            }
        }

        await Staff.changePassword(req.params.id, req.body.newPassword, false);
        await TokenManager.invalidateUserTokens(req.params.id, 'password_reset');
        await AuditService.logStaffChange(req.user.id, 'password_reset', req.params.id, {}, req.ip);
        res.json({
            success: true,
            message: 'Password reset successfully. User will be required to change it on next login.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

/**
 * DELETE /api/admin/staff/:id
 * Delete a staff member permanently (admin only)
 */
router.delete('/staff/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.user.id === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Get staff info before deletion for audit log
        const staffToDelete = await Staff.findById(req.params.id);

        await Staff.delete(req.params.id);
        await AuditService.logStaffChange(req.user.id, 'deleted', req.params.id,
            { email: staffToDelete?.email }, req.ip);
        res.json({ success: true, message: 'Staff member deleted' });
    } catch (error) {
        console.error('Delete staff error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete staff member'
        });
    }
});

/**
 * GET /api/admin/payroll/staff
 * List all active staff with salary info, for the Accountant/Payroll dashboard
 */
router.get('/payroll/staff', authMiddleware, accountantOrAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, email, department, role, base_salary, housing_allowance,
                    transport_allowance, utility_allowance, meal_allowance,
                    (COALESCE(base_salary, 0) + COALESCE(housing_allowance, 0) +
                     COALESCE(transport_allowance, 0) + COALESCE(utility_allowance, 0) +
                     COALESCE(meal_allowance, 0)) AS gross_salary,
                    salary_currency, hire_date, is_active
             FROM staff
             WHERE is_active = true
             ORDER BY department NULLS LAST, name`
        );

        // Estimated PAYE/net at this month's salary structure - not a
        // stored figure, just a live preview so the list isn't gross-only.
        // The authoritative number is whatever a generated paystub records.
        const withEstimates = result.rows.map(s => {
            const gross = parseFloat(s.gross_salary) || 0;
            if (!gross) return { ...s, estimated_paye: 0, estimated_levy: 0, estimated_net: 0 };
            const paye = calculateMonthlyPAYE(gross);
            const levy = monthlyDevelopmentLevy();
            return {
                ...s,
                estimated_paye: paye.monthlyTax,
                estimated_levy: levy,
                estimated_net: gross - paye.monthlyTax - levy
            };
        });

        res.json({ success: true, data: withEstimates });
    } catch (error) {
        console.error('Get payroll staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve payroll data'
        });
    }
});

module.exports = router;
