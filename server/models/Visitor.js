/**
 * Visitor Model
 * Handles visitor tracking
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Visitor = {
    /**
     * Create or update a visitor
     */
    async upsert({ email, name, ipAddress, userAgent, source }) {
        // First try to find by email
        if (email) {
            const existing = await db.query(
                'SELECT * FROM visitors WHERE email = $1',
                [email]
            );
            
            if (existing.rows.length > 0) {
                // Update existing visitor
                const result = await db.query(
                    `UPDATE visitors 
                     SET name = COALESCE($1, name),
                         last_visit = CURRENT_TIMESTAMP,
                         page_views = page_views + 1,
                         ip_address = COALESCE($2, ip_address),
                         user_agent = COALESCE($3, user_agent)
                     WHERE email = $4
                     RETURNING *`,
                    [name, ipAddress, userAgent, email]
                );
                return result.rows[0];
            }
        }

        // Create new visitor
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO visitors (id, email, name, ip_address, user_agent, source)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, email, name, ipAddress, userAgent, source]
        );
        return result.rows[0];
    },

    /**
     * Find visitor by ID
     */
    async findById(id) {
        const result = await db.query(
            'SELECT * FROM visitors WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    /**
     * Find visitor by email
     */
    async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM visitors WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    /**
     * Update page views
     */
    async incrementPageViews(id) {
        await db.query(
            `UPDATE visitors 
             SET page_views = page_views + 1, last_visit = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );
    },

    /**
     * Get total visitor count
     */
    async getCount() {
        const result = await db.query('SELECT COUNT(*) as count FROM visitors');
        return parseInt(result.rows[0].count);
    },

    /**
     * Get visitors in date range
     */
    async getByDateRange(startDate, endDate) {
        const result = await db.query(
            `SELECT * FROM visitors 
             WHERE created_at >= $1 AND created_at <= $2
             ORDER BY created_at DESC`,
            [startDate, endDate]
        );
        return result.rows;
    },

    /**
     * Get recent visitors
     */
    async getRecent(limit = 10) {
        const result = await db.query(
            `SELECT * FROM visitors 
             ORDER BY last_visit DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    }
};

module.exports = Visitor;
