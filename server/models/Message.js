/**
 * Message Model
 * Handles contact form submissions
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Message = {
    /**
     * Create a new message
     */
    async create({ name, email, company, service, message, visitorId }) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO messages (id, visitor_id, name, email, company, service, message)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [id, visitorId, name, email, company, service, message]
        );
        return result.rows[0];
    },

    /**
     * Get all messages with optional filters
     */
    async findAll({ status, limit = 50, offset = 0 }) {
        let query = `
            SELECT m.*, s.name as assigned_to_name
            FROM messages m
            LEFT JOIN staff s ON m.assigned_to = s.id
        `;
        const params = [];
        
        if (status) {
            query += ' WHERE m.status = $1';
            params.push(status);
        }
        
        query += ' ORDER BY m.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        return result.rows;
    },

    /**
     * Get message by ID
     */
    async findById(id) {
        const result = await db.query(
            `SELECT m.*, s.name as assigned_to_name
             FROM messages m
             LEFT JOIN staff s ON m.assigned_to = s.id
             WHERE m.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Update message status
     */
    async updateStatus(id, status, assignedTo = null) {
        const result = await db.query(
            `UPDATE messages 
             SET status = $1, assigned_to = COALESCE($2, assigned_to)
             WHERE id = $3
             RETURNING *`,
            [status, assignedTo, id]
        );
        return result.rows[0];
    },

    /**
     * Add a reply to a message
     */
    async addReply(messageId, staffId, content, sentToEmail = false) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO message_replies (id, message_id, staff_id, content, sent_to_email)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, messageId, staffId, content, sentToEmail]
        );
        return result.rows[0];
    },

    /**
     * Get replies for a message
     */
    async getReplies(messageId) {
        const result = await db.query(
            `SELECT r.*, s.name as staff_name
             FROM message_replies r
             LEFT JOIN staff s ON r.staff_id = s.id
             WHERE r.message_id = $1
             ORDER BY r.created_at ASC`,
            [messageId]
        );
        return result.rows;
    },

    /**
     * Get message count by status
     */
    async getCountByStatus() {
        const result = await db.query(`
            SELECT status, COUNT(*) as count
            FROM messages
            GROUP BY status
        `);
        return result.rows;
    },

    /**
     * Get recent messages
     */
    async getRecent(limit = 5) {
        const result = await db.query(
            `SELECT * FROM messages ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        return result.rows;
    }
};

module.exports = Message;
