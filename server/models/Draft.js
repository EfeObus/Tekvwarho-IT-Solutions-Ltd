/**
 * Draft Model
 * Auto-save draft messages for replies
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Draft {
    /**
     * Create or update a draft
     */
    static async upsert({ staffId, entityType, entityId, content, subject }) {
        const existing = await this.findByEntity(staffId, entityType, entityId);
        
        if (existing) {
            return this.update(existing.id, { content, subject });
        }
        
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO drafts (id, staff_id, entity_type, entity_id, content, subject, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING *`,
            [id, staffId, entityType, entityId, content, subject]
        );
        return result.rows[0];
    }

    /**
     * Find draft by entity (message, chat, consultation)
     */
    static async findByEntity(staffId, entityType, entityId) {
        const result = await db.query(
            `SELECT * FROM drafts 
             WHERE staff_id = $1 AND entity_type = $2 AND entity_id = $3`,
            [staffId, entityType, entityId]
        );
        return result.rows[0];
    }

    /**
     * Find all drafts for a staff member
     */
    static async findByStaff(staffId, { entityType, limit = 50 } = {}) {
        let query = `
            SELECT d.*, 
                CASE 
                    WHEN d.entity_type = 'message' THEN m.name
                    WHEN d.entity_type = 'chat' THEN c.visitor_name
                    WHEN d.entity_type = 'consultation' THEN con.name
                END as entity_name,
                CASE 
                    WHEN d.entity_type = 'message' THEN m.email
                    WHEN d.entity_type = 'chat' THEN c.visitor_email
                    WHEN d.entity_type = 'consultation' THEN con.email
                END as entity_email
            FROM drafts d
            LEFT JOIN messages m ON d.entity_type = 'message' AND d.entity_id = m.id
            LEFT JOIN chats c ON d.entity_type = 'chat' AND d.entity_id = c.id
            LEFT JOIN consultations con ON d.entity_type = 'consultation' AND d.entity_id = con.id
            WHERE d.staff_id = $1
        `;
        
        const values = [staffId];
        
        if (entityType) {
            query += ' AND d.entity_type = $2';
            values.push(entityType);
        }
        
        query += ' ORDER BY d.updated_at DESC LIMIT $' + (values.length + 1);
        values.push(limit);
        
        const result = await db.query(query, values);
        return result.rows;
    }

    /**
     * Update draft content
     */
    static async update(id, { content, subject }) {
        const result = await db.query(
            `UPDATE drafts SET content = $1, subject = $2, updated_at = NOW() 
             WHERE id = $3 RETURNING *`,
            [content, subject, id]
        );
        return result.rows[0];
    }

    /**
     * Delete a draft
     */
    static async delete(id) {
        await db.query('DELETE FROM drafts WHERE id = $1', [id]);
    }

    /**
     * Delete draft by entity
     */
    static async deleteByEntity(staffId, entityType, entityId) {
        await db.query(
            'DELETE FROM drafts WHERE staff_id = $1 AND entity_type = $2 AND entity_id = $3',
            [staffId, entityType, entityId]
        );
    }

    /**
     * Clean up old drafts (older than 30 days)
     */
    static async cleanup(daysOld = 30) {
        const result = await db.query(
            `DELETE FROM drafts WHERE updated_at < NOW() - INTERVAL '${daysOld} days' RETURNING id`
        );
        return result.rowCount;
    }

    /**
     * Get draft count for a staff member
     */
    static async count(staffId) {
        const result = await db.query(
            'SELECT COUNT(*) FROM drafts WHERE staff_id = $1',
            [staffId]
        );
        return parseInt(result.rows[0].count, 10);
    }
}

module.exports = Draft;
