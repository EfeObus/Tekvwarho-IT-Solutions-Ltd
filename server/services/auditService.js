/**
 * Audit Logging Service
 * Tracks all important actions for accountability and security
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const AuditService = {
    /**
     * Log an action
     * @param {Object} params
     * @param {string} params.staffId - ID of staff performing action (null for system)
     * @param {string} params.action - Action type (login, logout, create, update, delete, reply, assign, etc.)
     * @param {string} params.entityType - Type of entity (staff, message, consultation, chat, settings)
     * @param {string} params.entityId - ID of the entity
     * @param {Object} params.details - Additional details about the action
     * @param {string} params.ipAddress - IP address of the request
     */
    async log({ staffId, action, entityType, entityId, details, ipAddress }) {
        try {
            const id = uuidv4();
            await db.query(
                `INSERT INTO audit_logs (id, staff_id, action, entity_type, entity_id, details, ip_address)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [id, staffId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress]
            );
            return id;
        } catch (error) {
            console.error('Audit log error:', error);
            // Don't throw - audit logging should not break main functionality
        }
    },

    /**
     * Get audit logs with filters
     */
    async findAll({ staffId, action, entityType, startDate, endDate, limit = 100, offset = 0 }) {
        let query = `
            SELECT al.*, s.name as staff_name, s.email as staff_email
            FROM audit_logs al
            LEFT JOIN staff s ON al.staff_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (staffId) {
            query += ` AND al.staff_id = $${paramIndex}`;
            params.push(staffId);
            paramIndex++;
        }

        if (action) {
            query += ` AND al.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (entityType) {
            query += ` AND al.entity_type = $${paramIndex}`;
            params.push(entityType);
            paramIndex++;
        }

        if (startDate) {
            query += ` AND al.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND al.created_at <= $${paramIndex}::date + interval '1 day'`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        return result.rows;
    },

    /**
     * Get recent activity for a specific staff member
     */
    async getStaffActivity(staffId, limit = 20) {
        const result = await db.query(
            `SELECT * FROM audit_logs 
             WHERE staff_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [staffId, limit]
        );
        return result.rows;
    },

    /**
     * Get activity summary for reporting
     */
    async getActivitySummary(startDate, endDate) {
        const result = await db.query(`
            SELECT 
                s.id as staff_id,
                s.name as staff_name,
                COUNT(*) FILTER (WHERE al.action = 'reply') as replies_sent,
                COUNT(*) FILTER (WHERE al.action = 'update_status') as status_updates,
                COUNT(*) FILTER (WHERE al.action = 'assign') as assignments,
                COUNT(*) FILTER (WHERE al.action = 'login') as logins,
                COUNT(*) as total_actions
            FROM staff s
            LEFT JOIN audit_logs al ON s.id = al.staff_id 
                AND al.created_at >= $1 
                AND al.created_at <= $2::date + interval '1 day'
            WHERE s.is_active = true
            GROUP BY s.id, s.name
            ORDER BY total_actions DESC
        `, [startDate, endDate]);
        return result.rows;
    },

    /**
     * Log specific action types (convenience methods)
     */
    async logLogin(staffId, ipAddress, success = true) {
        return this.log({
            staffId,
            action: success ? 'login' : 'login_failed',
            entityType: 'staff',
            entityId: staffId,
            details: { success },
            ipAddress
        });
    },

    async logLogout(staffId, ipAddress) {
        return this.log({
            staffId,
            action: 'logout',
            entityType: 'staff',
            entityId: staffId,
            ipAddress
        });
    },

    async logMessageReply(staffId, messageId, sentEmail, ipAddress) {
        return this.log({
            staffId,
            action: 'reply',
            entityType: 'message',
            entityId: messageId,
            details: { sentEmail },
            ipAddress
        });
    },

    async logChatResponse(staffId, sessionId, ipAddress) {
        return this.log({
            staffId,
            action: 'chat_response',
            entityType: 'chat',
            entityId: sessionId,
            ipAddress
        });
    },

    async logStatusChange(staffId, entityType, entityId, oldStatus, newStatus, ipAddress) {
        return this.log({
            staffId,
            action: 'update_status',
            entityType,
            entityId,
            details: { oldStatus, newStatus },
            ipAddress
        });
    },

    async logAssignment(staffId, entityType, entityId, assignedTo, ipAddress) {
        return this.log({
            staffId,
            action: 'assign',
            entityType,
            entityId,
            details: { assignedTo },
            ipAddress
        });
    },

    async logStaffChange(adminId, action, targetStaffId, details, ipAddress) {
        return this.log({
            staffId: adminId,
            action: `staff_${action}`,
            entityType: 'staff',
            entityId: targetStaffId,
            details,
            ipAddress
        });
    },

    async logSettingsChange(staffId, setting, oldValue, newValue, ipAddress) {
        return this.log({
            staffId,
            action: 'settings_change',
            entityType: 'settings',
            entityId: setting,
            details: { oldValue, newValue },
            ipAddress
        });
    }
};

module.exports = AuditService;
