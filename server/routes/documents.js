/**
 * Company Documents Routes
 * Employee Handbook and Code of Conduct - versioned content with
 * per-staff acknowledgment tracking.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, adminOnly, hrOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const AuditService = require('../services/auditService');

const VALID_DOC_TYPES = ['handbook', 'code_of_conduct'];

const validateDocType = (req, res, next) => {
    if (!VALID_DOC_TYPES.includes(req.params.type)) {
        return res.status(404).json({ success: false, message: 'Unknown document type' });
    }
    next();
};

/**
 * GET /api/documents/:type
 * Get current document content (any authenticated staff)
 */
router.get('/:type', authMiddleware, validateDocType, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT doc_type, title, content, version, updated_at FROM company_documents WHERE doc_type = $1',
            [req.params.type]
        );
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Get document error:', error);
        res.status(500).json({ success: false, message: 'Failed to load document' });
    }
});

/**
 * PUT /api/documents/:type
 * Update document content (admin only) - bumps the version, which means
 * every staff member's prior acknowledgment now points to a stale version
 * and they'll be asked to acknowledge again.
 */
router.put('/:type', authMiddleware, adminOnly, validateDocType, [
    body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const result = await db.query(
            `UPDATE company_documents
             SET content = $1, version = version + 1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
             WHERE doc_type = $3
             RETURNING doc_type, title, content, version, updated_at`,
            [req.body.content, req.user.id, req.params.type]
        );
        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        await AuditService.log({
            staffId: req.user.id,
            action: 'document_updated',
            entityType: 'company_document',
            entityId: req.params.type,
            details: { newVersion: result.rows[0].version },
            ipAddress: req.ip
        });

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update document error:', error);
        res.status(500).json({ success: false, message: 'Failed to update document' });
    }
});

/**
 * GET /api/documents/:type/my-status
 * Whether the current user has acknowledged the current version
 */
router.get('/:type/my-status', authMiddleware, validateDocType, async (req, res) => {
    try {
        const docResult = await db.query(
            'SELECT version FROM company_documents WHERE doc_type = $1',
            [req.params.type]
        );
        if (!docResult.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const currentVersion = docResult.rows[0].version;

        const ackResult = await db.query(
            'SELECT acknowledged_at FROM document_acknowledgments WHERE staff_id = $1 AND doc_type = $2 AND doc_version = $3',
            [req.user.id, req.params.type, currentVersion]
        );

        res.json({
            success: true,
            data: {
                currentVersion,
                acknowledged: !!ackResult.rows[0],
                acknowledgedAt: ackResult.rows[0]?.acknowledged_at || null
            }
        });
    } catch (error) {
        console.error('Get acknowledgment status error:', error);
        res.status(500).json({ success: false, message: 'Failed to check status' });
    }
});

/**
 * POST /api/documents/:type/acknowledge
 * Record that the current user has read and agreed to the current version
 */
router.post('/:type/acknowledge', authMiddleware, validateDocType, async (req, res) => {
    try {
        const docResult = await db.query(
            'SELECT version FROM company_documents WHERE doc_type = $1',
            [req.params.type]
        );
        if (!docResult.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const currentVersion = docResult.rows[0].version;

        await db.query(
            `INSERT INTO document_acknowledgments (staff_id, doc_type, doc_version, ip_address)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (staff_id, doc_type, doc_version) DO NOTHING`,
            [req.user.id, req.params.type, currentVersion, req.ip]
        );

        res.json({ success: true, message: 'Acknowledgment recorded' });
    } catch (error) {
        console.error('Acknowledge document error:', error);
        res.status(500).json({ success: false, message: 'Failed to record acknowledgment' });
    }
});

/**
 * GET /api/documents/:type/acknowledgments
 * Compliance view: which active staff have (not) acknowledged the current
 * version (HR/admin only)
 */
router.get('/:type/acknowledgments', authMiddleware, hrOrAdmin, validateDocType, async (req, res) => {
    try {
        const docResult = await db.query(
            'SELECT version FROM company_documents WHERE doc_type = $1',
            [req.params.type]
        );
        if (!docResult.rows[0]) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const currentVersion = docResult.rows[0].version;

        const result = await db.query(
            `SELECT s.id, s.name, s.email, s.department, a.acknowledged_at
             FROM staff s
             LEFT JOIN document_acknowledgments a
               ON a.staff_id = s.id AND a.doc_type = $1 AND a.doc_version = $2
             WHERE s.is_active = true
             ORDER BY (a.acknowledged_at IS NULL) DESC, s.name`,
            [req.params.type, currentVersion]
        );

        res.json({ success: true, data: result.rows, currentVersion });
    } catch (error) {
        console.error('Get acknowledgments error:', error);
        res.status(500).json({ success: false, message: 'Failed to load acknowledgments' });
    }
});

module.exports = router;
