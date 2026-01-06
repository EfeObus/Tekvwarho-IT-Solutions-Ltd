/**
 * Authentication Routes
 * Handles token refresh, logout, and session management
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { refreshTokenLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const TokenManager = require('../services/tokenManager');
const AuditService = require('../services/auditService');

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
                `SELECT id FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2`,
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
    if (!userAgent) return 'Unknown Device';
    
    let device = 'Unknown Device';
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return `${browser} on ${os}`;
}

module.exports = router;
