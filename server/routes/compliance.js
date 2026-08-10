/**
 * Compliance Routes
 * Filing-deadline tracker, document vault, and company notices. Writes are
 * admin-only; reads also allow can_view_compliance (Legal Advisor) - a
 * deliberate read-only grant, not implied by any role tier, since this
 * data (filings, incorporation docs, licenses) is exactly what a Legal
 * Advisor needs visibility into without broader admin access. Notices are
 * readable by any authenticated staff member.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const db = require('../config/database');
const { uploadDocument, downloadDocument, deleteDocument } = require('../services/vaultStorage');
const { sendCompanyNoticeEmail } = require('../services/emailService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Read access: admin, or anyone explicitly granted can_view_compliance.
// Kept separate from adminOnly (writes) rather than folded into
// hasPermission(), since "admin OR this one flag" isn't expressible with
// that factory without also opening it to every other implicit role grant.
const adminOrComplianceViewer = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.permissions?.canViewCompliance) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Admin or compliance-view access required' });
};

// ── Compliance Deadlines ────────────────────────────────────────────────

router.get('/deadlines', authMiddleware, adminOrComplianceViewer, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM compliance_deadlines ORDER BY (status = 'completed'), due_date ASC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List deadlines error:', error);
        res.status(500).json({ success: false, message: 'Failed to load deadlines' });
    }
});

router.post('/deadlines', authMiddleware, adminOnly, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required'),
    body('recurring').optional().isIn(['none', 'monthly', 'yearly'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { title, description, dueDate, recurring } = req.body;
        const result = await db.query(
            `INSERT INTO compliance_deadlines (title, description, due_date, recurring, created_by)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [title, description || null, dueDate, recurring || 'none', req.user.id]
        );
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create deadline error:', error);
        res.status(500).json({ success: false, message: 'Failed to create deadline' });
    }
});

router.patch('/deadlines/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        const result = await db.query(
            `UPDATE compliance_deadlines SET status = $1, completed_at = ${status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL'}
             WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Deadline not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update deadline error:', error);
        res.status(500).json({ success: false, message: 'Failed to update deadline' });
    }
});

router.delete('/deadlines/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await db.query('DELETE FROM compliance_deadlines WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Deadline deleted' });
    } catch (error) {
        console.error('Delete deadline error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete deadline' });
    }
});

// ── Document Vault ──────────────────────────────────────────────────────

router.get('/vault', authMiddleware, adminOrComplianceViewer, async (req, res) => {
    try {
        const result = await db.query(`SELECT * FROM vault_documents ORDER BY uploaded_at DESC`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List vault documents error:', error);
        res.status(500).json({ success: false, message: 'Failed to load documents' });
    }
});

router.post('/vault', authMiddleware, adminOnly, upload.single('file'), [
    body('title').trim().notEmpty().withMessage('Title is required')
], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'A file is required' });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, category, expiryDate } = req.body;
        const storagePath = await uploadDocument(req.file.buffer, req.file.originalname, req.file.mimetype);

        const result = await db.query(
            `INSERT INTO vault_documents (title, category, file_name, storage_path, file_size, mime_type, expiry_date, uploaded_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [title, category || 'other', req.file.originalname, storagePath, req.file.size, req.file.mimetype, expiryDate || null, req.user.id]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Upload vault document error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload document' });
    }
});

router.get('/vault/:id/download', authMiddleware, adminOrComplianceViewer, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM vault_documents WHERE id = $1', [req.params.id]);
        const doc = result.rows[0];
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const buffer = await downloadDocument(doc.storage_path);
        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Download vault document error:', error);
        res.status(500).json({ success: false, message: 'Failed to download document' });
    }
});

router.delete('/vault/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const result = await db.query('SELECT storage_path FROM vault_documents WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        await deleteDocument(result.rows[0].storage_path);
        await db.query('DELETE FROM vault_documents WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Document deleted' });
    } catch (error) {
        console.error('Delete vault document error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
});

// ── Company Notices ─────────────────────────────────────────────────────

router.get('/notices', authMiddleware, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT n.*, s.name as posted_by_name FROM company_notices n
             LEFT JOIN staff s ON s.id = n.posted_by
             ORDER BY n.created_at DESC LIMIT 50`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List notices error:', error);
        res.status(500).json({ success: false, message: 'Failed to load notices' });
    }
});

router.post('/notices', authMiddleware, adminOnly, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const result = await db.query(
            `INSERT INTO company_notices (title, content, posted_by) VALUES ($1,$2,$3) RETURNING *`,
            [req.body.title, req.body.content, req.user.id]
        );
        const notice = result.rows[0];

        // Fan out to every active staff member's personal email - best
        // effort, one failed address shouldn't block the others or the
        // response. The dashboard widget already covers anyone who just
        // logs in, this is the copy that reaches people who don't.
        const staffResult = await db.query('SELECT email, name FROM staff WHERE is_active = true');
        const outcomes = await Promise.allSettled(
            staffResult.rows.map(s => sendCompanyNoticeEmail({
                staffEmail: s.email,
                staffName: s.name,
                title: notice.title,
                content: notice.content,
                postedByName: req.user.name
            }))
        );
        const emailedCount = outcomes.filter(o => o.status === 'fulfilled').length;
        await db.query('UPDATE company_notices SET emailed_at = CURRENT_TIMESTAMP WHERE id = $1', [notice.id]);

        res.status(201).json({ success: true, data: notice, emailedCount, totalStaff: staffResult.rows.length });
    } catch (error) {
        console.error('Create notice error:', error);
        res.status(500).json({ success: false, message: 'Failed to create notice' });
    }
});

router.delete('/notices/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await db.query('DELETE FROM company_notices WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Notice deleted' });
    } catch (error) {
        console.error('Delete notice error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete notice' });
    }
});

module.exports = router;
