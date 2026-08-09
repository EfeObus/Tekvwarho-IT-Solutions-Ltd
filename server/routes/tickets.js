/**
 * Ticket Routes
 * Internal helpdesk for IT Support requests and Development tasks/bugs.
 * Any staff member can submit a ticket; IT Support/Development/managers/
 * admin get a queue to triage and resolve them.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, hasPermission, adminOnly } = require('../middleware/auth');
const db = require('../config/database');
const AuditService = require('../services/auditService');

const canManageTickets = (req) => {
    return req.user.role === 'admin' || req.user.role === 'manager' ||
        !!(req.user.permissions && req.user.permissions.canManageTickets);
};

/**
 * GET /api/tickets
 * List tickets. Staff with queue access see all (optionally filtered);
 * everyone else sees only tickets they submitted.
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { category, status } = req.query;
        const conditions = [];
        const values = [];
        let i = 1;

        if (!canManageTickets(req)) {
            conditions.push(`t.requested_by = $${i++}`);
            values.push(req.user.id);
        }
        if (category) {
            conditions.push(`t.category = $${i++}`);
            values.push(category);
        }
        if (status) {
            conditions.push(`t.status = $${i++}`);
            values.push(status);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(
            `SELECT t.*, r.name as requested_by_name, a.name as assigned_to_name
             FROM tickets t
             LEFT JOIN staff r ON r.id = t.requested_by
             LEFT JOIN staff a ON a.id = t.assigned_to
             ${whereClause}
             ORDER BY
                CASE t.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
                CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
                t.created_at DESC`,
            values
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List tickets error:', error);
        res.status(500).json({ success: false, message: 'Failed to load tickets' });
    }
});

/**
 * POST /api/tickets
 * Submit a new ticket (any authenticated staff)
 */
router.post('/', authMiddleware, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').isIn(['it_support', 'development']).withMessage('Invalid category'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, description, category, priority } = req.body;
        const result = await db.query(
            `INSERT INTO tickets (title, description, category, priority, requested_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, description, category, priority || 'medium', req.user.id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket' });
    }
});

/**
 * GET /api/tickets/:id
 * Get a single ticket with its comments (requester, or queue access)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT t.*, r.name as requested_by_name, a.name as assigned_to_name
             FROM tickets t
             LEFT JOIN staff r ON r.id = t.requested_by
             LEFT JOIN staff a ON a.id = t.assigned_to
             WHERE t.id = $1`,
            [req.params.id]
        );
        const ticket = result.rows[0];
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        if (ticket.requested_by !== req.user.id && !canManageTickets(req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const comments = await db.query(
            `SELECT c.*, s.name as staff_name
             FROM ticket_comments c
             LEFT JOIN staff s ON s.id = c.staff_id
             WHERE c.ticket_id = $1 ORDER BY c.created_at ASC`,
            [req.params.id]
        );

        res.json({ success: true, data: { ...ticket, comments: comments.rows } });
    } catch (error) {
        console.error('Get ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to load ticket' });
    }
});

/**
 * PATCH /api/tickets/:id
 * Update status/priority/assignment (queue access only)
 */
router.patch('/:id', authMiddleware, hasPermission('tickets'), [
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('assignedTo').optional({ nullable: true })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const fields = [];
        const values = [];
        let i = 1;
        const { status, priority, assignedTo } = req.body;

        if (status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(status);
            if (status === 'resolved' || status === 'closed') {
                fields.push(`resolved_at = CURRENT_TIMESTAMP`);
            }
        }
        if (priority !== undefined) {
            fields.push(`priority = $${i++}`);
            values.push(priority);
        }
        if (assignedTo !== undefined) {
            fields.push(`assigned_to = $${i++}`);
            values.push(assignedTo || null);
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No changes provided' });
        }

        values.push(req.params.id);
        const result = await db.query(
            `UPDATE tickets SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${i} RETURNING *`,
            values
        );
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        await AuditService.log({
            staffId: req.user.id,
            action: 'ticket_updated',
            entityType: 'ticket',
            entityId: req.params.id,
            details: { status, priority, assignedTo },
            ipAddress: req.ip
        });

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to update ticket' });
    }
});

/**
 * POST /api/tickets/:id/comments
 * Add a comment (requester, or queue access)
 */
router.post('/:id/comments', authMiddleware, [
    body('content').trim().notEmpty().withMessage('Comment cannot be empty')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const ticketResult = await db.query('SELECT requested_by FROM tickets WHERE id = $1', [req.params.id]);
        const ticket = ticketResult.rows[0];
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        if (ticket.requested_by !== req.user.id && !canManageTickets(req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await db.query(
            `INSERT INTO ticket_comments (ticket_id, staff_id, content)
             VALUES ($1, $2, $3) RETURNING *`,
            [req.params.id, req.user.id, req.body.content]
        );
        await db.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
});

/**
 * DELETE /api/tickets/:id
 * Permanently remove a ticket (admin only - e.g. spam or accidental duplicates)
 */
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await db.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        res.json({ success: true, message: 'Ticket deleted' });
    } catch (error) {
        console.error('Delete ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete ticket' });
    }
});

module.exports = router;
