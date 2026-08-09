/**
 * Company Letterhead Routes
 * Admin-only tool to generate branded official correspondence as PDF or DOCX.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { generateLetterheadPDF } = require('../services/pdfService');
const { generateLetterheadDOCX } = require('../services/docxService');

const validation = [
    body('body').trim().notEmpty().withMessage('Letter body is required'),
    body('subject').optional().trim(),
    body('recipient').optional().trim(),
    body('date').optional().isISO8601(),
    body('signatureName').optional().trim(),
    body('signatureTitle').optional().trim()
];

/**
 * POST /api/letterhead/pdf
 */
router.post('/pdf', authMiddleware, adminOnly, validation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const pdfBuffer = await generateLetterheadPDF(req.body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=tekvwa-letter.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Letterhead PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
});

/**
 * POST /api/letterhead/docx
 */
router.post('/docx', authMiddleware, adminOnly, validation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const docxBuffer = await generateLetterheadDOCX(req.body);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=tekvwa-letter.docx');
        res.send(docxBuffer);
    } catch (error) {
        console.error('Letterhead DOCX error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate DOCX' });
    }
});

module.exports = router;
