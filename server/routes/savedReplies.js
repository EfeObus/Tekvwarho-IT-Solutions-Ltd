/**
 * Saved Replies & Drafts Routes
 * Quick response templates and auto-save drafts
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const SavedReply = require('../models/SavedReply');
const Draft = require('../models/Draft');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// ==================== SAVED REPLIES ====================

/**
 * GET /api/admin/replies
 * Get saved replies for the current user
 */
router.get('/replies', authMiddleware, async (req, res) => {
    try {
        const { category, search, limit, offset } = req.query;
        
        const replies = await SavedReply.findForUser(req.user.id, {
            category,
            search,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });
        
        res.json({ success: true, data: replies });
    } catch (error) {
        console.error('Get saved replies error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get saved replies' 
        });
    }
});

/**
 * GET /api/admin/replies/categories
 * Get saved reply categories
 */
router.get('/replies/categories', authMiddleware, async (req, res) => {
    try {
        const categories = await SavedReply.getCategories(req.user.id);
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get categories' 
        });
    }
});

/**
 * GET /api/admin/replies/frequent
 * Get frequently used replies
 */
router.get('/replies/frequent', authMiddleware, async (req, res) => {
    try {
        const { limit } = req.query;
        const replies = await SavedReply.getMostUsed(req.user.id, parseInt(limit) || 5);
        res.json({ success: true, data: replies });
    } catch (error) {
        console.error('Get frequent replies error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get frequent replies' 
        });
    }
});

/**
 * GET /api/admin/replies/shortcut/:shortcut
 * Get reply by shortcut (e.g., /greeting, /thankyou)
 */
router.get('/replies/shortcut/:shortcut', authMiddleware, async (req, res) => {
    try {
        const reply = await SavedReply.findByShortcut(req.params.shortcut, req.user.id);
        
        if (!reply) {
            return res.status(404).json({ 
                success: false,
                message: 'Reply not found' 
            });
        }
        
        // Increment use count
        await SavedReply.incrementUseCount(reply.id);
        
        res.json({ success: true, data: reply });
    } catch (error) {
        console.error('Get reply by shortcut error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get reply' 
        });
    }
});

/**
 * POST /api/admin/replies
 * Create a new saved reply
 */
router.post('/replies', authMiddleware, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required'),
    body('category').optional().trim(),
    body('shortcut').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { title, content, category, shortcut, isGlobal } = req.body;
        
        // Only admins can create global replies
        const finalIsGlobal = req.user.role === 'admin' ? isGlobal : false;
        
        // Check shortcut uniqueness if provided
        if (shortcut) {
            const existing = await SavedReply.findByShortcut(shortcut, req.user.id);
            if (existing) {
                return res.status(400).json({ 
                    success: false,
                    message: 'This shortcut is already in use' 
                });
            }
        }
        
        const reply = await SavedReply.create({
            title,
            content,
            category: category || 'general',
            shortcut: shortcut || null,
            createdBy: req.user.id,
            isGlobal: finalIsGlobal
        });
        
        res.status(201).json({ success: true, data: reply });
    } catch (error) {
        console.error('Create saved reply error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to create saved reply' 
        });
    }
});

/**
 * GET /api/admin/replies/:id
 * Get a specific saved reply
 */
router.get('/replies/:id', authMiddleware, async (req, res) => {
    try {
        const reply = await SavedReply.findById(req.params.id);
        
        if (!reply) {
            return res.status(404).json({ 
                success: false,
                message: 'Reply not found' 
            });
        }
        
        // Check access
        if (!reply.is_global && reply.created_by !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied' 
            });
        }
        
        res.json({ success: true, data: reply });
    } catch (error) {
        console.error('Get saved reply error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get saved reply' 
        });
    }
});

/**
 * PUT /api/admin/replies/:id
 * Update a saved reply
 */
router.put('/replies/:id', authMiddleware, async (req, res) => {
    try {
        const reply = await SavedReply.findById(req.params.id);
        
        if (!reply) {
            return res.status(404).json({ 
                success: false,
                message: 'Reply not found' 
            });
        }
        
        // Check ownership or admin
        if (reply.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'You can only edit your own replies' 
            });
        }
        
        const { title, content, category, shortcut, isGlobal } = req.body;
        
        // Check shortcut uniqueness if changed
        if (shortcut && shortcut !== reply.shortcut) {
            const existing = await SavedReply.findByShortcut(shortcut, req.user.id);
            if (existing) {
                return res.status(400).json({ 
                    success: false,
                    message: 'This shortcut is already in use' 
                });
            }
        }
        
        const updated = await SavedReply.update(req.params.id, {
            title,
            content,
            category,
            shortcut,
            isGlobal: req.user.role === 'admin' ? isGlobal : reply.is_global
        });
        
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update saved reply error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update saved reply' 
        });
    }
});

/**
 * DELETE /api/admin/replies/:id
 * Delete a saved reply
 */
router.delete('/replies/:id', authMiddleware, async (req, res) => {
    try {
        const reply = await SavedReply.findById(req.params.id);
        
        if (!reply) {
            return res.status(404).json({ 
                success: false,
                message: 'Reply not found' 
            });
        }
        
        // Check ownership or admin
        if (reply.created_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'You can only delete your own replies' 
            });
        }
        
        await SavedReply.delete(req.params.id);
        res.json({ success: true, message: 'Saved reply deleted' });
    } catch (error) {
        console.error('Delete saved reply error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete saved reply' 
        });
    }
});

/**
 * POST /api/admin/replies/:id/use
 * Mark a reply as used (increment use count)
 */
router.post('/replies/:id/use', authMiddleware, async (req, res) => {
    try {
        await SavedReply.incrementUseCount(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Increment use count error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update use count' 
        });
    }
});

// ==================== DRAFTS ====================

/**
 * GET /api/admin/drafts
 * Get all drafts for the current user
 */
router.get('/drafts', authMiddleware, async (req, res) => {
    try {
        const { entityType, limit } = req.query;
        
        const drafts = await Draft.findByStaff(req.user.id, {
            entityType,
            limit: parseInt(limit) || 50
        });
        
        res.json({ success: true, data: drafts });
    } catch (error) {
        console.error('Get drafts error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get drafts' 
        });
    }
});

/**
 * GET /api/admin/drafts/count
 * Get draft count for the current user
 */
router.get('/drafts/count', authMiddleware, async (req, res) => {
    try {
        const count = await Draft.count(req.user.id);
        res.json({ success: true, data: { count } });
    } catch (error) {
        console.error('Get draft count error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get draft count' 
        });
    }
});

/**
 * GET /api/admin/drafts/:entityType/:entityId
 * Get draft for a specific entity
 */
router.get('/drafts/:entityType/:entityId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        
        const draft = await Draft.findByEntity(req.user.id, entityType, entityId);
        
        if (!draft) {
            return res.status(404).json({ 
                success: false,
                message: 'No draft found' 
            });
        }
        
        res.json({ success: true, data: draft });
    } catch (error) {
        console.error('Get draft error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get draft' 
        });
    }
});

/**
 * POST /api/admin/drafts
 * Create or update a draft (auto-save)
 */
router.post('/drafts', authMiddleware, [
    body('entityType').isIn(['message', 'chat', 'consultation']).withMessage('Invalid entity type'),
    body('entityId').notEmpty().withMessage('Entity ID is required'),
    body('content').notEmpty().withMessage('Content is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { entityType, entityId, content, subject } = req.body;
        
        const draft = await Draft.upsert({
            staffId: req.user.id,
            entityType,
            entityId,
            content,
            subject
        });
        
        res.json({ success: true, data: draft });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to save draft' 
        });
    }
});

/**
 * DELETE /api/admin/drafts/:id
 * Delete a draft
 */
router.delete('/drafts/:id', authMiddleware, async (req, res) => {
    try {
        await Draft.delete(req.params.id);
        res.json({ success: true, message: 'Draft deleted' });
    } catch (error) {
        console.error('Delete draft error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete draft' 
        });
    }
});

/**
 * DELETE /api/admin/drafts/:entityType/:entityId
 * Delete draft by entity
 */
router.delete('/drafts/:entityType/:entityId', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        await Draft.deleteByEntity(req.user.id, entityType, entityId);
        res.json({ success: true, message: 'Draft deleted' });
    } catch (error) {
        console.error('Delete draft error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete draft' 
        });
    }
});

module.exports = router;
