/**
 * Saved Replies Model
 * Quick response templates for common queries
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SavedReply {
    /**
     * Create a new saved reply
     */
    static async create({ title, content, category, shortcut, createdBy, isGlobal = false }) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO saved_replies (id, title, content, category, shortcut, created_by, is_global, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             RETURNING *`,
            [id, title, content, category, shortcut, createdBy, isGlobal]
        );
        return result.rows[0];
    }

    /**
     * Find all saved replies accessible to a user
     * Returns global replies + user's own replies
     */
    static async findForUser(userId, { category, search, limit = 50, offset = 0 } = {}) {
        let whereClause = 'WHERE (is_global = true OR created_by = $1)';
        const values = [userId];
        let paramIndex = 2;
        
        if (category) {
            whereClause += ` AND category = $${paramIndex}`;
            values.push(category);
            paramIndex++;
        }
        
        if (search) {
            whereClause += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex} OR shortcut ILIKE $${paramIndex})`;
            values.push(`%${search}%`);
            paramIndex++;
        }
        
        values.push(limit, offset);
        
        const result = await db.query(
            `SELECT sr.*, s.name as created_by_name
             FROM saved_replies sr
             LEFT JOIN staff s ON sr.created_by = s.id
             ${whereClause}
             ORDER BY sr.use_count DESC, sr.updated_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            values
        );
        
        return result.rows;
    }

    /**
     * Find by ID
     */
    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM saved_replies WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    /**
     * Find by shortcut
     */
    static async findByShortcut(shortcut, userId) {
        const result = await db.query(
            `SELECT * FROM saved_replies 
             WHERE shortcut = $1 AND (is_global = true OR created_by = $2)
             LIMIT 1`,
            [shortcut, userId]
        );
        return result.rows[0];
    }

    /**
     * Update a saved reply
     */
    static async update(id, { title, content, category, shortcut, isGlobal }) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (title !== undefined) {
            fields.push(`title = $${paramIndex++}`);
            values.push(title);
        }
        if (content !== undefined) {
            fields.push(`content = $${paramIndex++}`);
            values.push(content);
        }
        if (category !== undefined) {
            fields.push(`category = $${paramIndex++}`);
            values.push(category);
        }
        if (shortcut !== undefined) {
            fields.push(`shortcut = $${paramIndex++}`);
            values.push(shortcut);
        }
        if (isGlobal !== undefined) {
            fields.push(`is_global = $${paramIndex++}`);
            values.push(isGlobal);
        }

        if (fields.length === 0) return null;

        fields.push('updated_at = NOW()');
        values.push(id);

        const result = await db.query(
            `UPDATE saved_replies SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    }

    /**
     * Increment use count
     */
    static async incrementUseCount(id) {
        await db.query(
            'UPDATE saved_replies SET use_count = use_count + 1, last_used_at = NOW() WHERE id = $1',
            [id]
        );
    }

    /**
     * Delete a saved reply
     */
    static async delete(id) {
        await db.query('DELETE FROM saved_replies WHERE id = $1', [id]);
    }

    /**
     * Get categories
     */
    static async getCategories(userId) {
        const result = await db.query(
            `SELECT DISTINCT category, COUNT(*) as count
             FROM saved_replies 
             WHERE is_global = true OR created_by = $1
             GROUP BY category
             ORDER BY count DESC`,
            [userId]
        );
        return result.rows;
    }

    /**
     * Get most used replies
     */
    static async getMostUsed(userId, limit = 5) {
        const result = await db.query(
            `SELECT * FROM saved_replies 
             WHERE (is_global = true OR created_by = $1) AND use_count > 0
             ORDER BY use_count DESC
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }
}

module.exports = SavedReply;
