/**
 * Authentication Routes
 * Handles token refresh, logout, and session management
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { refreshTokenLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const TokenManager = require('../services/tokenManager');
const AuditService = require('../services/auditService');
const { sendPasswordResetEmail } = require('../services/emailService');
const db = require('../config/database');

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
router.post('/refresh', refreshTokenLimiter, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Refresh token is required'
            }
        });
    }

    try {
        const result = await TokenManager.rotateRefreshToken(
            refreshToken,
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            success: true,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresAt: result.expiresAt,
            user: result.user
        });
    } catch (error) {
        // Log potential token theft
        if (error.message.includes('Token reuse detected')) {
            console.error('SECURITY: Token reuse detected', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_ERROR',
                message: error.message
            }
        });
    }
}));

/**
 * POST /api/auth/logout
 * Revoke current session
 */
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        // Revoke the specific refresh token
        try {
            const crypto = require('crypto');
            const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            const db = require('../config/database');

            const result = await db.query(
                'SELECT id FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2',
                [tokenHash, req.user.id]
            );

            if (result.rows.length > 0) {
                await TokenManager.revokeToken(result.rows[0].id);
            }
        } catch (error) {
            console.error('Error revoking token:', error);
        }
    }

    // Log logout
    await AuditService.log({
        staffId: req.user.id,
        action: 'logout',
        entityType: 'auth',
        details: { method: 'single_session' },
        ipAddress: req.ip
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

/**
 * POST /api/auth/logout-all
 * Revoke all sessions (logout from all devices)
 */
router.post('/logout-all', authMiddleware, asyncHandler(async (req, res) => {
    await TokenManager.revokeAllUserTokens(req.user.id);

    // Log logout all
    await AuditService.log({
        staffId: req.user.id,
        action: 'logout_all',
        entityType: 'auth',
        details: { method: 'all_sessions' },
        ipAddress: req.ip
    });

    res.json({
        success: true,
        message: 'All sessions have been revoked'
    });
}));

/**
 * GET /api/auth/sessions
 * List active sessions for current user
 */
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
    const sessions = await TokenManager.getActiveSessions(req.user.id);

    // Parse user agents for display
    const formattedSessions = sessions.map(session => ({
        id: session.id,
        device: parseUserAgent(session.user_agent),
        location: session.ip_address,
        lastActivity: session.last_activity,
        startedAt: session.session_started,
        isCurrent: session.ip_address === req.ip
    }));

    res.json({
        success: true,
        sessions: formattedSessions
    });
}));

/**
 * DELETE /api/auth/sessions/:id
 * Revoke a specific session
 */
router.delete('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const db = require('../config/database');

    // Verify session belongs to user
    const result = await db.query(
        `SELECT s.id, rt.id as token_id
         FROM active_sessions s
         JOIN refresh_tokens rt ON s.refresh_token_id = rt.id
         WHERE s.id = $1 AND s.user_id = $2`,
        [id, req.user.id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Session not found'
            }
        });
    }

    await TokenManager.revokeToken(result.rows[0].token_id);

    // Log session revocation
    await AuditService.log({
        staffId: req.user.id,
        action: 'revoke_session',
        entityType: 'auth',
        entityId: id,
        details: { session_id: id },
        ipAddress: req.ip
    });

    res.json({
        success: true,
        message: 'Session revoked successfully'
    });
}));

/**
 * GET /api/auth/verify
 * Verify current token is valid
 */
router.get('/verify', authMiddleware, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
        }
    });
}));

/**
 * Parse user agent string for display
 */
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return 'Unknown Device';
    }

    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect OS
    if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac')) {
        os = 'macOS';
    } else if (userAgent.includes('Linux')) {
        os = 'Linux';
    } else if (userAgent.includes('Android')) {
        os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) {
        browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        browser = 'Firefox';
    } else if (userAgent.includes('Safari')) {
        browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
        browser = 'Edge';
    }

    return `${browser} on ${os}`;
}

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', passwordResetLimiter, [
    body('email').isEmail().withMessage('Valid email is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { email } = req.body;

    // Always return success to prevent email enumeration
    const successResponse = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
    };

    try {
        // Find user by email
        const userResult = await db.query(
            'SELECT id, email, name, is_active FROM staff WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            // User not found - still return success to prevent enumeration
            return res.json(successResponse);
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
            // User disabled - still return success to prevent enumeration
            return res.json(successResponse);
        }

        // Generate secure reset token (1 hour expiry - stricter than the
        // new-hire setup-link variant, since this is "someone claims to be
        // you and wants in", not an expected onboarding step)
        const resetToken = await TokenManager.createPasswordResetToken(user.id, req.ip, req.get('User-Agent'), 1);

        // Send reset email
        await sendPasswordResetEmail(user.email, user.name, resetToken);

        // Log the request
        await AuditService.log({
            staffId: user.id,
            action: 'password_reset_requested',
            entityType: 'auth',
            details: { ip: req.ip },
            ipAddress: req.ip
        });

        res.json(successResponse);
    } catch (error) {
        console.error('Forgot password error:', error);
        // Still return success to prevent information leakage
        res.json(successResponse);
    }
}));

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', passwordResetLimiter, [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/\d/).withMessage('Password must contain a number')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        // Find valid reset token
        const tokenResult = await db.query(
            `SELECT prt.id, prt.user_id, prt.expires_at, s.email, s.name
             FROM password_reset_tokens prt
             JOIN staff s ON prt.user_id = s.id
             WHERE prt.token_hash = $1
               AND prt.used_at IS NULL
               AND prt.expires_at > NOW()`,
            [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token. Please request a new password reset.'
            });
        }

        const resetData = tokenResult.rows[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user password and increment token version to invalidate existing sessions
        await db.query(
            `UPDATE staff
             SET password_hash = $1,
                 must_change_password = false,
                 token_version = token_version + 1,
                 updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, resetData.user_id]
        );

        // Mark token as used
        await db.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE id = $1`,
            [resetData.id]
        );

        // Revoke all existing refresh tokens for this user for security
        await db.query(
            `UPDATE refresh_tokens
             SET revoked_at = NOW()
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [resetData.user_id]
        );

        // Log the password reset
        await AuditService.log({
            staffId: resetData.user_id,
            action: 'password_reset_completed',
            entityType: 'auth',
            details: { method: 'email_token' },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.'
        });
    }
}));

/**
 * GET /api/auth/verify-reset-token
 * Verify if a reset token is valid (for UI validation)
 */
router.get('/verify-reset-token', asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            success: false,
            valid: false,
            message: 'Token is required'
        });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const tokenResult = await db.query(
        `SELECT id, expires_at FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
        return res.json({
            success: true,
            valid: false,
            message: 'Invalid or expired reset token'
        });
    }

    res.json({
        success: true,
        valid: true,
        expiresAt: tokenResult.rows[0].expires_at
    });
}));

module.exports = router;
