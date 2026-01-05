/**
 * Chat Model
 * Handles chat sessions and messages
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Chat = {
    /**
     * Create a new chat session
     */
    async createSession({ visitorId, visitorName, visitorEmail }) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO chat_sessions (id, visitor_id, visitor_name, visitor_email)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, visitorId, visitorName, visitorEmail]
        );
        return result.rows[0];
    },

    /**
     * Get session by ID
     */
    async getSession(id) {
        const result = await db.query(
            `SELECT cs.*, s.name as assigned_to_name
             FROM chat_sessions cs
             LEFT JOIN staff s ON cs.assigned_to = s.id
             WHERE cs.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Get all sessions with optional filters
     */
    async getAllSessions({ status, limit = 50, offset = 0 }) {
        let query = `
            SELECT cs.*, s.name as assigned_to_name,
                   (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) as message_count,
                   (SELECT content FROM chat_messages cm WHERE cm.session_id = cs.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_sessions cs
            LEFT JOIN staff s ON cs.assigned_to = s.id
        `;
        const params = [];
        
        if (status) {
            query += ' WHERE cs.status = $1';
            params.push(status);
        }
        
        query += ' ORDER BY cs.started_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        return result.rows;
    },

    /**
     * Add a message to a session
     */
    async addMessage({ sessionId, senderType, senderId, content }) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO chat_messages (id, session_id, sender_type, sender_id, content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, sessionId, senderType, senderId, content]
        );
        return result.rows[0];
    },

    /**
     * Get messages for a session
     */
    async getMessages(sessionId) {
        const result = await db.query(
            `SELECT cm.*, s.name as staff_name
             FROM chat_messages cm
             LEFT JOIN staff s ON cm.sender_id = s.id AND cm.sender_type = 'staff'
             WHERE cm.session_id = $1
             ORDER BY cm.created_at ASC`,
            [sessionId]
        );
        return result.rows;
    },

    /**
     * Close a session
     */
    async closeSession(id) {
        const result = await db.query(
            `UPDATE chat_sessions 
             SET status = 'closed', ended_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Assign session to staff
     */
    async assignSession(id, staffId) {
        const result = await db.query(
            `UPDATE chat_sessions 
             SET assigned_to = $1
             WHERE id = $2
             RETURNING *`,
            [staffId, id]
        );
        return result.rows[0];
    },

    /**
     * Mark messages as read
     */
    async markMessagesAsRead(sessionId, senderType) {
        await db.query(
            `UPDATE chat_messages 
             SET read_at = CURRENT_TIMESTAMP
             WHERE session_id = $1 AND sender_type = $2 AND read_at IS NULL`,
            [sessionId, senderType]
        );
    },

    /**
     * Get unread message count for staff
     */
    async getUnreadCount() {
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM chat_messages
            WHERE sender_type = 'visitor' AND read_at IS NULL
        `);
        return parseInt(result.rows[0].count);
    },

    /**
     * Get active sessions count
     */
    async getActiveCount() {
        const result = await db.query(`
            SELECT COUNT(*) as count
            FROM chat_sessions
            WHERE status = 'active'
        `);
        return parseInt(result.rows[0].count);
    }
};

module.exports = Chat;
