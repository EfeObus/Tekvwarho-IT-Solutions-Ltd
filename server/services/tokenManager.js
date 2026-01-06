/**
 * Token Manager Service
 * Handles JWT access tokens and refresh tokens
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

const ACCESS_TOKEN_EXPIRY = '15m';  // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const TOKEN_ROTATION_GRACE_PERIOD = 60 * 1000; // 60 seconds for replay protection

class TokenManager {
    /**
     * Generate access token (short-lived)
     */
    static generateAccessToken(user) {
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
                    canViewAnalytics: user.can_view_analytics
                }
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
    }

    /**
     * Generate refresh token (long-lived, stored in DB)
     */
    static async generateRefreshToken(userId, ipAddress, userAgent) {
        const token = crypto.randomBytes(64).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

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
                    s.can_manage_chats, s.can_view_analytics, s.is_active,
                    s.token_version
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
            can_view_analytics: storedToken.can_view_analytics
        };

        const accessToken = this.generateAccessToken(user);
        const newRefreshToken = await this.generateRefreshToken(
            storedToken.user_id,
            ipAddress,
            userAgent
        );

        // Link old token to new one
        await db.query(
            `UPDATE refresh_tokens SET replaced_by = $1 WHERE id = $2`,
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
            `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
            [tokenId]
        );
        await db.query(
            `UPDATE active_sessions SET is_active = false WHERE refresh_token_id = $1`,
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
            `UPDATE active_sessions SET is_active = false WHERE user_id = $1`,
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
            `UPDATE active_sessions SET last_activity = NOW() WHERE id = $1`,
            [sessionId]
        );
    }

    /**
     * Invalidate all tokens when password/role changes
     */
    static async invalidateUserTokens(userId, reason = 'security_update') {
        // Increment token version to invalidate all existing access tokens
        await db.query(
            `UPDATE staff SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`,
            [userId]
        );
        
        // Revoke all refresh tokens
        await this.revokeAllUserTokens(userId);
        
        return { invalidated: true, reason };
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
