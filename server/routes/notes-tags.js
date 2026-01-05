/**
 * Notes & Tags Routes
 * Handles internal notes and tagging for leads
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// ==========================================
// INTERNAL NOTES
// ==========================================

/**
 * GET /api/notes/:entityType/:entityId
 * Get all notes for an entity
 */
router.get('/notes/:entityType/:entityId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        
        const result = await db.query(
            `SELECT n.*, s.name as staff_name
             FROM internal_notes n
             LEFT JOIN staff s ON n.staff_id = s.id
             WHERE n.entity_type = $1 AND n.entity_id = $2
             ORDER BY n.created_at DESC`,
            [entityType, entityId]
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve notes' });
    }
});

/**
 * POST /api/notes
 * Add a note to an entity
 */
router.post('/notes', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId, content } = req.body;
        
        if (!entityType || !entityId || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Entity type, ID, and content are required' 
            });
        }
        
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO internal_notes (id, entity_type, entity_id, staff_id, content)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [id, entityType, entityId, req.user.id, content]
        );
        
        // Get staff name
        const note = result.rows[0];
        const staffResult = await db.query('SELECT name FROM staff WHERE id = $1', [req.user.id]);
        note.staff_name = staffResult.rows[0]?.name;
        
        // Log the action
        await AuditService.log({
            staffId: req.user.id,
            action: 'add_note',
            entityType,
            entityId,
            details: { noteId: id },
            ipAddress: req.ip
        });
        
        res.status(201).json({ success: true, data: note });
    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ success: false, message: 'Failed to add note' });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/notes/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM internal_notes WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Note not found' });
        }
        
        res.json({ success: true, message: 'Note deleted' });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete note' });
    }
});

// ==========================================
// TAGS
// ==========================================

/**
 * GET /api/tags
 * Get all available tags
 */
router.get('/tags', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tags ORDER BY name');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tags' });
    }
});

/**
 * POST /api/tags
 * Create a new tag
 */
router.post('/tags', authMiddleware, async (req, res) => {
    try {
        const { name, color } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, message: 'Tag name is required' });
        }
        
        const id = uuidv4();
        const result = await db.query(
            'INSERT INTO tags (id, name, color) VALUES ($1, $2, $3) RETURNING *',
            [id, name, color || '#6b7280']
        );
        
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ success: false, message: 'Tag already exists' });
        }
        console.error('Create tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to create tag' });
    }
});

/**
 * DELETE /api/tags/:id
 * Delete a tag
 */
router.delete('/tags/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Tag deleted' });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete tag' });
    }
});

/**
 * GET /api/tags/:entityType/:entityId
 * Get tags for an entity
 */
router.get('/tags/:entityType/:entityId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        
        const result = await db.query(
            `SELECT t.* FROM tags t
             JOIN entity_tags et ON t.id = et.tag_id
             WHERE et.entity_type = $1 AND et.entity_id = $2`,
            [entityType, entityId]
        );
        
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get entity tags error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tags' });
    }
});

/**
 * POST /api/tags/:entityType/:entityId/:tagId
 * Add a tag to an entity
 */
router.post('/tags/:entityType/:entityId/:tagId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId, tagId } = req.params;
        
        const id = uuidv4();
        await db.query(
            `INSERT INTO entity_tags (id, tag_id, entity_type, entity_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tag_id, entity_type, entity_id) DO NOTHING`,
            [id, tagId, entityType, entityId]
        );
        
        // Log the action
        await AuditService.log({
            staffId: req.user.id,
            action: 'add_tag',
            entityType,
            entityId,
            details: { tagId },
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: 'Tag added' });
    } catch (error) {
        console.error('Add tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to add tag' });
    }
});

/**
 * DELETE /api/tags/:entityType/:entityId/:tagId
 * Remove a tag from an entity
 */
router.delete('/tags/:entityType/:entityId/:tagId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId, tagId } = req.params;
        
        await db.query(
            'DELETE FROM entity_tags WHERE tag_id = $1 AND entity_type = $2 AND entity_id = $3',
            [tagId, entityType, entityId]
        );
        
        res.json({ success: true, message: 'Tag removed' });
    } catch (error) {
        console.error('Remove tag error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove tag' });
    }
});

module.exports = router;
