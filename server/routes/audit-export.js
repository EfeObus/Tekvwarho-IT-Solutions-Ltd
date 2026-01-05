/**
 * Audit & Export Routes
 * Handles audit logs viewing and data export
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const AuditService = require('../services/auditService');

// ==========================================
// AUDIT LOGS
// ==========================================

/**
 * GET /api/audit
 * Get audit logs (admin only)
 */
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { staffId, action, entityType, startDate, endDate, limit, offset } = req.query;
        
        const logs = await AuditService.findAll({
            staffId,
            action,
            entityType,
            startDate,
            endDate,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });
        
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve audit logs' });
    }
});

/**
 * GET /api/audit/summary
 * Get activity summary for staff performance
 */
router.get('/summary', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        
        const summary = await AuditService.getActivitySummary(start, end);
        
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Get audit summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve summary' });
    }
});

/**
 * GET /api/audit/staff/:staffId
 * Get activity for a specific staff member
 */
router.get('/staff/:staffId', authMiddleware, async (req, res) => {
    try {
        // Staff can view their own, admins can view all
        if (req.user.role !== 'admin' && req.user.id !== req.params.staffId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const logs = await AuditService.getStaffActivity(req.params.staffId, 50);
        
        res.json({ success: true, data: logs });
    } catch (error) {
        console.error('Get staff activity error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve activity' });
    }
});

// ==========================================
// EXPORT
// ==========================================

/**
 * GET /api/export/messages
 * Export messages to CSV
 */
router.get('/messages', authMiddleware, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        
        let query = `
            SELECT m.id, m.name, m.email, m.company, m.service, m.message, m.status,
                   m.created_at, s.name as assigned_to
            FROM messages m
            LEFT JOIN staff s ON m.assigned_to = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND m.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (startDate) {
            query += ` AND m.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND m.created_at <= $${paramIndex}::date + interval '1 day'`;
            params.push(endDate);
            paramIndex++;
        }
        
        query += ' ORDER BY m.created_at DESC';
        
        const result = await db.query(query, params);
        
        // Convert to CSV
        const csv = convertToCSV(result.rows, [
            'id', 'name', 'email', 'company', 'service', 'message', 'status', 'assigned_to', 'created_at'
        ]);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=messages-export.csv');
        res.send(csv);
        
        // Log export
        await AuditService.log({
            staffId: req.user.id,
            action: 'export',
            entityType: 'messages',
            details: { count: result.rows.length },
            ipAddress: req.ip
        });
    } catch (error) {
        console.error('Export messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to export' });
    }
});

/**
 * GET /api/export/consultations
 * Export consultations to CSV
 */
router.get('/consultations', authMiddleware, async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        
        let query = `
            SELECT c.id, c.name, c.email, c.phone, c.company, c.service, 
                   c.booking_date, c.booking_time, c.status, c.notes,
                   c.created_at, s.name as assigned_to
            FROM consultations c
            LEFT JOIN staff s ON c.assigned_to = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (startDate) {
            query += ` AND c.booking_date >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND c.booking_date <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }
        
        query += ' ORDER BY c.booking_date DESC, c.booking_time DESC';
        
        const result = await db.query(query, params);
        
        const csv = convertToCSV(result.rows, [
            'id', 'name', 'email', 'phone', 'company', 'service', 
            'booking_date', 'booking_time', 'status', 'assigned_to', 'notes', 'created_at'
        ]);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=consultations-export.csv');
        res.send(csv);
        
        await AuditService.log({
            staffId: req.user.id,
            action: 'export',
            entityType: 'consultations',
            details: { count: result.rows.length },
            ipAddress: req.ip
        });
    } catch (error) {
        console.error('Export consultations error:', error);
        res.status(500).json({ success: false, message: 'Failed to export' });
    }
});

/**
 * GET /api/export/visitors
 * Export visitors to CSV
 */
router.get('/visitors', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT id, name, email, source, page_views, first_visit, last_visit
            FROM visitors
            WHERE email IS NOT NULL
        `;
        const params = [];
        let paramIndex = 1;
        
        if (startDate) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }
        
        if (endDate) {
            query += ` AND created_at <= $${paramIndex}::date + interval '1 day'`;
            params.push(endDate);
            paramIndex++;
        }
        
        query += ' ORDER BY last_visit DESC';
        
        const result = await db.query(query, params);
        
        const csv = convertToCSV(result.rows, [
            'id', 'name', 'email', 'source', 'page_views', 'first_visit', 'last_visit'
        ]);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=visitors-export.csv');
        res.send(csv);
        
        await AuditService.log({
            staffId: req.user.id,
            action: 'export',
            entityType: 'visitors',
            details: { count: result.rows.length },
            ipAddress: req.ip
        });
    } catch (error) {
        console.error('Export visitors error:', error);
        res.status(500).json({ success: false, message: 'Failed to export' });
    }
});

/**
 * GET /api/export/report
 * Generate monthly performance report
 */
router.get('/report', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { month, year } = req.query;
        const reportMonth = parseInt(month) || new Date().getMonth() + 1;
        const reportYear = parseInt(year) || new Date().getFullYear();
        
        const startDate = `${reportYear}-${String(reportMonth).padStart(2, '0')}-01`;
        const endDate = new Date(reportYear, reportMonth, 0).toISOString().split('T')[0];
        
        // Gather all stats
        const [
            messagesResult,
            consultationsResult,
            chatsResult,
            visitorsResult,
            staffPerformance
        ] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'new') as new,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                    COUNT(*) FILTER (WHERE status = 'converted') as converted
                FROM messages
                WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            `, [startDate, endDate]),
            
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
                FROM consultations
                WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            `, [startDate, endDate]),
            
            db.query(`
                SELECT COUNT(*) as total
                FROM chat_sessions
                WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            `, [startDate, endDate]),
            
            db.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(DISTINCT email) as unique_with_email
                FROM visitors
                WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            `, [startDate, endDate]),
            
            AuditService.getActivitySummary(startDate, endDate)
        ]);
        
        const report = {
            period: {
                month: reportMonth,
                year: reportYear,
                startDate,
                endDate
            },
            summary: {
                messages: messagesResult.rows[0],
                consultations: consultationsResult.rows[0],
                chats: chatsResult.rows[0],
                visitors: visitorsResult.rows[0]
            },
            staffPerformance
        };
        
        res.json({ success: true, data: report });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

/**
 * Helper: Convert array of objects to CSV
 */
function convertToCSV(data, columns) {
    if (!data.length) return '';
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const header = columns.join(',');
    const rows = data.map(row => 
        columns.map(col => escapeCSV(row[col])).join(',')
    );
    
    return [header, ...rows].join('\n');
}

module.exports = router;
