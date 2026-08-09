/**
 * Token Manager Service
 * Handles JWT access tokens and refresh tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const ACCESS_TOKEN_EXPIRY = '15m';  // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const REMEMBER_ME_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in ms for "Remember Me"
const TOKEN_ROTATION_GRACE_PERIOD = 60 * 1000; // 60 seconds for replay protection

class TokenManager {
    /**
     * Generate access token (short-lived)
     */
    static generateAccessToken(user) {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured');
        }
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                tokenVersion: user.token_version || 0,
                permissions: {
                    canManageMessages: user.can_manage_messages,
                    canManageConsultations: user.can_manage_consultations,
                    canManageChats: user.can_manage_chats,
                    canViewAnalytics: user.can_view_analytics,
                    canManageEmployees: user.can_manage_employees,
                    canManagePayroll: user.can_manage_payroll,
                    canManageTickets: user.can_manage_tickets,
                    canManageOnboarding: user.can_manage_onboarding,
                    canViewCompliance: user.can_view_compliance
                }
            },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
    }

    /**
     * Generate refresh token (long-lived, stored in DB)
     * @param {string} userId - User ID
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent string
     * @param {boolean} rememberMe - If true, extends token expiry to 30 days
     */
    static async generateRefreshToken(userId, ipAddress, userAgent, rememberMe = false) {
        const token = crypto.randomBytes(64).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiryDuration = rememberMe ? REMEMBER_ME_EXPIRY : REFRESH_TOKEN_EXPIRY;
        const expiresAt = new Date(Date.now() + expiryDuration);

        const result = await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [userId, tokenHash, expiresAt, ipAddress, userAgent]
        );

        // Create active session
        await db.query(
            `INSERT INTO active_sessions (user_id, refresh_token_id)
             VALUES ($1, $2)`,
            [userId, result.rows[0].id]
        );

        return {
            token,
            expiresAt,
            tokenId: result.rows[0].id
        };
    }

    /**
     * Verify and rotate refresh token
     * Implements token rotation for security
     */
    static async rotateRefreshToken(refreshToken, ipAddress, userAgent) {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

        // Find the token
        const result = await db.query(
            `SELECT rt.*, s.id as staff_id, s.email, s.role, s.name,
                    s.can_manage_messages, s.can_manage_consultations,
                    s.can_manage_chats, s.can_view_analytics,
                    s.can_manage_employees, s.can_manage_payroll, s.can_manage_tickets,
                    s.can_manage_onboarding, s.can_view_compliance,
                    s.is_active, s.token_version
             FROM refresh_tokens rt
             JOIN staff s ON rt.user_id = s.id
             WHERE rt.token_hash = $1`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            throw new Error('Invalid refresh token');
        }

        const storedToken = result.rows[0];

        // Check if token is revoked
        if (storedToken.revoked_at) {
            // Token reuse detected - revoke all tokens for this user
            await this.revokeAllUserTokens(storedToken.user_id);
            throw new Error('Token reuse detected - all sessions revoked');
        }

        // Check if token is expired
        if (new Date(storedToken.expires_at) < new Date()) {
            throw new Error('Refresh token expired');
        }

        // Check if user is still active
        if (!storedToken.is_active) {
            throw new Error('User account is disabled');
        }

        // Revoke old token (but keep grace period for replay protection)
        const gracePeriodEnd = new Date(Date.now() + TOKEN_ROTATION_GRACE_PERIOD);
        await db.query(
            `UPDATE refresh_tokens
             SET revoked_at = $1
             WHERE id = $2`,
            [gracePeriodEnd, storedToken.id]
        );

        // Generate new tokens
        const user = {
            id: storedToken.user_id,
            email: storedToken.email,
            role: storedToken.role,
            name: storedToken.name,
            token_version: storedToken.token_version,
            can_manage_messages: storedToken.can_manage_messages,
            can_manage_consultations: storedToken.can_manage_consultations,
            can_manage_chats: storedToken.can_manage_chats,
            can_view_analytics: storedToken.can_view_analytics,
            can_manage_employees: storedToken.can_manage_employees,
            can_manage_payroll: storedToken.can_manage_payroll,
            can_manage_tickets: storedToken.can_manage_tickets,
            can_manage_onboarding: storedToken.can_manage_onboarding,
            can_view_compliance: storedToken.can_view_compliance
        };

        const accessToken = this.generateAccessToken(user);
        const newRefreshToken = await this.generateRefreshToken(
            storedToken.user_id,
            ipAddress,
            userAgent
        );

        // Link old token to new one
        await db.query(
            'UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2',
            [newRefreshToken.tokenId, storedToken.id]
        );

        return {
            accessToken,
            refreshToken: newRefreshToken.token,
            expiresAt: newRefreshToken.expiresAt,
            user: {
                id: user.id,
                email: user.email,
                name: storedToken.name,
                role: user.role
            }
        };
    }

    /**
     * Revoke a specific refresh token
     */
    static async revokeToken(tokenId) {
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
            [tokenId]
        );
        await db.query(
            'UPDATE active_sessions SET is_active = false WHERE refresh_token_id = $1',
            [tokenId]
        );
    }

    /**
     * Revoke all tokens for a user (logout all devices)
     */
    static async revokeAllUserTokens(userId) {
        await db.query(
            `UPDATE refresh_tokens SET revoked_at = NOW()
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [userId]
        );
        await db.query(
            'UPDATE active_sessions SET is_active = false WHERE user_id = $1',
            [userId]
        );
    }

    /**
     * Get active sessions for a user
     */
    static async getActiveSessions(userId) {
        const result = await db.query(
            `SELECT s.id, rt.ip_address, rt.user_agent,
                    s.last_activity, rt.created_at as session_started
             FROM active_sessions s
             JOIN refresh_tokens rt ON s.refresh_token_id = rt.id
             WHERE s.user_id = $1 AND s.is_active = true
             ORDER BY s.last_activity DESC`,
            [userId]
        );
        return result.rows;
    }

    /**
     * Update session activity
     */
    static async updateSessionActivity(sessionId) {
        await db.query(
            'UPDATE active_sessions SET last_activity = NOW() WHERE id = $1',
            [sessionId]
        );
    }

    /**
     * Force a full logout: invalidate the current access token immediately
     * (via bumpTokenVersion) and revoke refresh tokens too, so a retry
     * can't silently mint a new access token either. Use for deactivation
     * and password resets - anything where the person genuinely shouldn't
     * be able to get back in without re-authenticating from scratch.
     */
    static async invalidateUserTokens(userId, reason = 'security_update') {
        await this.bumpTokenVersion(userId);
        await this.revokeAllUserTokens(userId);
        return { invalidated: true, reason };
    }

    /**
     * Create a password_reset_tokens row and return the raw (unhashed)
     * token to email - shared by both the self-service "forgot password"
     * flow (server/routes/auth.js) and the new-hire "set up your account"
     * invite, which is the same mechanism with different email copy and a
     * longer expiry, not a different system.
     */
    static async createPasswordResetToken(userId, ipAddress, userAgent, expiryHours = 1) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        await db.query(
            `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
            [userId]
        );
        await db.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, tokenHash, expiresAt, ipAddress, userAgent]
        );

        return resetToken;
    }

    /**
     * Invalidate just the current access token (checked in authMiddleware)
     * without revoking refresh tokens. A refresh still succeeds and mints
     * a token with the now-current role/permissions - so a role or
     * permission edit takes effect within one request cycle, transparently,
     * rather than forcing the person all the way back to the login screen.
     */
    static async bumpTokenVersion(userId) {
        await db.query(
            'UPDATE staff SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1',
            [userId]
        );
    }

    /**
     * Clean up expired tokens (run periodically)
     */
    static async cleanupExpiredTokens() {
        const result = await db.query(
            `DELETE FROM refresh_tokens
             WHERE expires_at < NOW() - INTERVAL '1 day'
             RETURNING id`
        );
        return result.rowCount;
    }
}

module.exports = TokenManager;
