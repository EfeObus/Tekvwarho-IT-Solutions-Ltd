/**
 * Admin Routes
 * Handles admin/staff authentication and operations
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Staff = require('../models/Staff');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const Consultation = require('../models/Consultation');
const Visitor = require('../models/Visitor');
const { authMiddleware, adminOnly, hasPermission } = require('../middleware/auth');
const db = require('../config/database');
const AuditService = require('../services/auditService');

/**
 * POST /api/admin/login
 * Staff/Admin authentication
 */
router.post('/login', [
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

        const { email, password } = req.body;

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
                message: 'Account is disabled. Please contact an administrator.' 
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

        // Generate JWT
        const token = jwt.sign(
            { 
                id: staff.id, 
                email: staff.email, 
                role: staff.role,
                permissions: {
                    canManageMessages: staff.can_manage_messages,
                    canManageConsultations: staff.can_manage_consultations,
                    canManageChats: staff.can_manage_chats,
                    canViewAnalytics: staff.can_view_analytics
                }
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            token,
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
                can_view_analytics: staff.can_view_analytics
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

        // Get recent tasks
        const recentTasksResult = await db.query(`
            (SELECT 'message' as type, name as title, email as subtitle, created_at 
             FROM messages WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT 3)
            UNION ALL
            (SELECT 'consultation' as type, name as title, 
             booking_date::text || ' at ' || booking_time::text as subtitle, created_at 
             FROM consultations WHERE assigned_to = $1 ORDER BY created_at DESC LIMIT 3)
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
router.get('/staff', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { role, isActive } = req.query;
        const filters = {};
        
        if (role) filters.role = role;
        if (isActive !== undefined) filters.isActive = isActive === 'true';
        
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
 * Create/Onboard a new staff member (admin only)
 */
router.post('/staff', authMiddleware, adminOnly, [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').isIn(['admin', 'manager', 'staff']).withMessage('Invalid role')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { email, password, name, role, department, phone, permissions } = req.body;

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
            createdBy: req.user.id,
            permissions: permissions || {}
        });
        
        // Log the creation
        await AuditService.logStaffChange(req.user.id, 'created', staff.id, { email, role }, req.ip);
        
        res.status(201).json({ success: true, data: staff });
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
 * POST /api/admin/staff/:id/activate
 * Activate a staff member (admin only)
 */
router.post('/staff/:id/activate', authMiddleware, adminOnly, async (req, res) => {
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
 * Deactivate a staff member (admin only)
 */
router.post('/staff/:id/deactivate', authMiddleware, adminOnly, async (req, res) => {
    try {
        await Staff.deactivate(req.params.id);
        await AuditService.logStaffChange(req.user.id, 'deactivated', req.params.id, {}, req.ip);
        res.json({ success: true, message: 'Staff member deactivated' });
    } catch (error) {
        console.error('Deactivate staff error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to deactivate staff member' 
        });
    }
});

/**
 * POST /api/admin/staff/:id/reset-password
 * Reset staff password (admin only)
 */
router.post('/staff/:id/reset-password', authMiddleware, adminOnly, [
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

        await Staff.changePassword(req.params.id, req.body.newPassword, false);
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

module.exports = router;
