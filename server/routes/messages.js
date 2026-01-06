/**
 * Messages Routes with Search, Filters & Pagination
 * Enhanced admin message management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const { authMiddleware, hasPermission } = require('../middleware/auth');
const { paginationMiddleware, setPaginationHeaders } = require('../middleware/pagination');
const QueryBuilder = require('../utils/queryBuilder');
const AuditService = require('../services/auditService');
const db = require('../config/database');

/**
 * GET /api/admin/messages
 * List all messages with search, filters & pagination
 */
router.get('/', 
    authMiddleware, 
    hasPermission('can_manage_messages'),
    paginationMiddleware({
        defaultLimit: 20,
        maxLimit: 100,
        allowedSortFields: ['created_at', 'name', 'email', 'status', 'updated_at'],
        defaultSort: '-created_at'
    }),
    async (req, res) => {
        try {
            const { page, limit, offset, sortField, sortOrder, search, filters, dateRange } = req.pagination;
            
            // Build query using QueryBuilder
            const qb = new QueryBuilder('messages');
            
            // Apply status filter
            if (filters.status) {
                qb.whereEquals('status', filters.status);
            }
            
            // Apply service filter
            if (filters.service) {
                qb.whereEquals('service', filters.service);
            }
            
            // Apply assigned filter
            if (filters.assigned_to) {
                qb.whereEquals('assigned_to', filters.assigned_to);
            }
            
            // Apply unassigned filter
            if (filters.unassigned === 'true') {
                qb.where('assigned_to IS NULL');
            }
            
            // Apply date range
            if (dateRange.from || dateRange.to) {
                qb.whereDateRange('created_at', dateRange.from, dateRange.to);
            }
            
            // Apply search across multiple columns
            if (search) {
                qb.search(search, ['name', 'email', 'company', 'message', 'service']);
            }
            
            // Apply sorting and pagination
            qb.orderBy(sortOrder === 'ASC' ? sortField : `-${sortField}`)
              .paginate(page, limit);
            
            // Execute query
            const dataQuery = qb.build();
            const countQuery = qb.buildCount();
            
            const [dataResult, countResult] = await Promise.all([
                db.query(dataQuery.sql, dataQuery.values),
                db.query(countQuery.sql, countQuery.values)
            ]);
            
            const messages = dataResult.rows;
            const total = parseInt(countResult.rows[0].count, 10);
            
            // Build pagination response
            const pagination = QueryBuilder.buildPaginationResponse(total, page, limit);
            
            // Set Link headers for REST best practices
            setPaginationHeaders(res, pagination, req.originalUrl);
            
            res.json({
                success: true,
                data: messages,
                pagination
            });
        } catch (error) {
            console.error('Get messages error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to retrieve messages' 
            });
        }
    }
);

/**
 * GET /api/admin/messages/stats
 * Get message statistics
 */
router.get('/stats', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'new') as new_count,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
                COUNT(*) FILTER (WHERE status = 'archived') as archived_count,
                COUNT(*) FILTER (WHERE assigned_to IS NULL AND status = 'new') as unassigned_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today_count,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as week_count
            FROM messages
        `);
        
        res.json({
            success: true,
            data: stats.rows[0]
        });
    } catch (error) {
        console.error('Get message stats error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve message statistics' 
        });
    }
});

/**
 * GET /api/admin/messages/export
 * Export messages as CSV
 */
router.get('/export', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const { status, from, to, format = 'csv' } = req.query;
        
        const qb = new QueryBuilder('messages')
            .select('id, name, email, company, service, message, status, created_at, updated_at');
        
        if (status) {
            qb.whereEquals('status', status);
        }
        
        if (from || to) {
            qb.whereDateRange('created_at', from, to);
        }
        
        qb.orderBy('-created_at');
        
        const query = qb.build();
        const result = await db.query(query.sql, query.values);
        
        // Log export action
        await AuditService.log({
            staffId: req.user.id,
            action: 'export',
            entityType: 'messages',
            details: { count: result.rows.length, format, status, from, to },
            ipAddress: req.ip
        });
        
        if (format === 'csv') {
            const headers = ['ID', 'Name', 'Email', 'Company', 'Service', 'Message', 'Status', 'Created', 'Updated'];
            const rows = result.rows.map(row => [
                row.id,
                `"${(row.name || '').replace(/"/g, '""')}"`,
                row.email,
                `"${(row.company || '').replace(/"/g, '""')}"`,
                row.service || '',
                `"${(row.message || '').replace(/"/g, '""').substring(0, 500)}"`,
                row.status,
                row.created_at?.toISOString() || '',
                row.updated_at?.toISOString() || ''
            ]);
            
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=messages_export_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                data: result.rows
            });
        }
    } catch (error) {
        console.error('Export messages error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to export messages' 
        });
    }
});

/**
 * GET /api/admin/messages/:id
 * Get single message with replies and notes
 */
router.get('/:id', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }
        
        // Get replies
        const replies = await Message.getReplies(req.params.id);
        
        // Get notes if model supports it
        let notes = [];
        try {
            const notesResult = await db.query(
                'SELECT * FROM notes WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
                ['message', req.params.id]
            );
            notes = notesResult.rows;
        } catch (e) {
            // Notes table may not exist
        }
        
        res.json({ 
            success: true, 
            data: { ...message, replies, notes } 
        });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve message' 
        });
    }
});

/**
 * PATCH /api/admin/messages/:id
 * Update message (status, assignment, etc.)
 */
router.patch('/:id', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const { status, assigned_to, priority } = req.body;
        const validStatuses = ['new', 'in_progress', 'converted', 'archived'];
        
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status' 
            });
        }

        // Get the old message for audit
        const oldMessage = await Message.findById(req.params.id);
        if (!oldMessage) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }
        
        const message = await Message.updateStatus(req.params.id, status, assigned_to);

        // Log changes
        if (status && status !== oldMessage.status) {
            await AuditService.logStatusChange(req.user.id, 'message', req.params.id, oldMessage.status, status, req.ip);
        }
        
        if (assigned_to && assigned_to !== oldMessage.assigned_to) {
            await AuditService.logAssignment(req.user.id, 'message', req.params.id, assigned_to, req.ip);
        }

        res.json({ success: true, data: message });
    } catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update message' 
        });
    }
});

/**
 * POST /api/admin/messages/:id/reply
 * Reply to a message
 */
router.post('/:id/reply', 
    authMiddleware, 
    hasPermission('can_manage_messages'),
    [
        body('content').trim().notEmpty().withMessage('Reply content is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    success: false,
                    errors: errors.array() 
                });
            }

            const { content, sendEmail = true } = req.body;
            
            // Get original message
            const message = await Message.findById(req.params.id);
            if (!message) {
                return res.status(404).json({ 
                    success: false,
                    message: 'Message not found' 
                });
            }

            // Create reply
            const reply = await Message.addReply(req.params.id, req.user.id, content);
            
            // Send email if requested
            if (sendEmail) {
                const { sendReplyEmail } = require('../services/emailService');
                sendReplyEmail(message, content, req.user.name).catch(console.error);
            }
            
            // Log action
            await AuditService.log({
                staffId: req.user.id,
                action: 'reply',
                entityType: 'message',
                entityId: req.params.id,
                details: { sendEmail },
                ipAddress: req.ip
            });

            res.json({ success: true, data: reply });
        } catch (error) {
            console.error('Reply to message error:', error);
            res.status(500).json({ 
                success: false,
                message: 'Failed to send reply' 
            });
        }
    }
);

/**
 * POST /api/admin/messages/bulk
 * Bulk operations on messages
 */
router.post('/bulk', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const { action, messageIds, data } = req.body;
        
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Message IDs array is required' 
            });
        }
        
        const validActions = ['update_status', 'assign', 'delete', 'archive'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid bulk action' 
            });
        }
        
        let affectedCount = 0;
        
        switch (action) {
            case 'update_status':
                if (!data?.status) {
                    return res.status(400).json({ success: false, message: 'Status is required' });
                }
                const statusResult = await db.query(
                    'UPDATE messages SET status = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id',
                    [data.status, messageIds]
                );
                affectedCount = statusResult.rowCount;
                break;
                
            case 'assign':
                if (!data?.assigned_to) {
                    return res.status(400).json({ success: false, message: 'Assignee is required' });
                }
                const assignResult = await db.query(
                    'UPDATE messages SET assigned_to = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id',
                    [data.assigned_to, messageIds]
                );
                affectedCount = assignResult.rowCount;
                break;
                
            case 'archive':
                const archiveResult = await db.query(
                    `UPDATE messages SET status = 'archived', updated_at = NOW() WHERE id = ANY($1) RETURNING id`,
                    [messageIds]
                );
                affectedCount = archiveResult.rowCount;
                break;
                
            case 'delete':
                // Soft delete or hard delete based on policy
                const deleteResult = await db.query(
                    `UPDATE messages SET status = 'deleted', updated_at = NOW() WHERE id = ANY($1) RETURNING id`,
                    [messageIds]
                );
                affectedCount = deleteResult.rowCount;
                break;
        }
        
        // Log bulk action
        await AuditService.log({
            staffId: req.user.id,
            action: `bulk_${action}`,
            entityType: 'messages',
            details: { count: affectedCount, messageIds, data },
            ipAddress: req.ip
        });
        
        res.json({
            success: true,
            message: `Successfully processed ${affectedCount} messages`,
            affectedCount
        });
    } catch (error) {
        console.error('Bulk message operation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to process bulk operation' 
        });
    }
});

/**
 * DELETE /api/admin/messages/:id
 * Delete a message (soft delete)
 */
router.delete('/:id', authMiddleware, hasPermission('can_manage_messages'), async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }
        
        // Soft delete
        await db.query(
            `UPDATE messages SET status = 'deleted', updated_at = NOW() WHERE id = $1`,
            [req.params.id]
        );
        
        // Log deletion
        await AuditService.log({
            staffId: req.user.id,
            action: 'delete',
            entityType: 'message',
            entityId: req.params.id,
            details: { email: message.email },
            ipAddress: req.ip
        });
        
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete message' 
        });
    }
});

module.exports = router;
