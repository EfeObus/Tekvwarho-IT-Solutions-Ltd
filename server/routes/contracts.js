/**
 * Contract Routes
 * Department contract templates and generated employment contracts,
 * with auto-PDF-on-hire emailed to the new staff member.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, hrOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const Staff = require('../models/Staff');
const AuditService = require('../services/auditService');
const { generateContractPDF } = require('../services/pdfService');
const { sendContractEmail } = require('../services/emailService');

const canAccessStaffContracts = (req, staffId) => {
    return req.user.id === staffId || req.user.role === 'admin' || req.user.role === 'hr';
};

/**
 * GET /api/contracts/templates
 * List all department contract templates (HR/Admin)
 */
router.get('/templates', authMiddleware, hrOrAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM contract_templates ORDER BY department');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get contract templates error:', error);
        res.status(500).json({ success: false, message: 'Failed to load templates' });
    }
});

/**
 * PUT /api/contracts/templates/:department
 * Update a department's contract template (HR/Admin)
 */
router.put('/templates/:department', authMiddleware, hrOrAdmin, [
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('jobDescription').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const result = await db.query(
            `INSERT INTO contract_templates (department, job_title, job_description, updated_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (department) DO UPDATE SET
                job_title = EXCLUDED.job_title, job_description = EXCLUDED.job_description,
                updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.params.department, req.body.jobTitle, req.body.jobDescription || null, req.user.id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update contract template error:', error);
        res.status(500).json({ success: false, message: 'Failed to update template' });
    }
});

/**
 * POST /api/contracts/staff/:id
 * Generate an employment contract for a staff member, using their current
 * salary structure as a snapshot, and email it to them as a PDF.
 */
router.post('/staff/:id', authMiddleware, hrOrAdmin, [
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('startDate').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        const salary = await Staff.getSalaryInfo(req.params.id);
        if (!salary || !salary.base_salary) {
            return res.status(400).json({ success: false, message: 'This staff member has no salary on file yet - set it on the Payroll page first' });
        }

        const { jobTitle, jobDescription, startDate, sendEmail: shouldEmail } = req.body;
        const basic = parseFloat(salary.base_salary) || 0;
        const housing = parseFloat(salary.housing_allowance) || 0;
        const transport = parseFloat(salary.transport_allowance) || 0;
        const utility = parseFloat(salary.utility_allowance) || 0;
        const meal = parseFloat(salary.meal_allowance) || 0;
        const gross = basic + housing + transport + utility + meal;

        const result = await db.query(
            `INSERT INTO employee_contracts (
                staff_id, department, job_title, job_description, start_date,
                basic_salary, housing_allowance, transport_allowance, utility_allowance,
                meal_allowance, gross_salary, currency, generated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            RETURNING *`,
            [req.params.id, staff.department, jobTitle, jobDescription || null, startDate || null,
                basic, housing, transport, utility, meal, gross, salary.salary_currency || 'NGN', req.user.id]
        );
        const contract = result.rows[0];

        const pdfBuffer = await generateContractPDF(contract, staff);

        let emailed = false;
        if (shouldEmail !== false) {
            try {
                await sendContractEmail(staff, jobTitle, pdfBuffer);
                await db.query('UPDATE employee_contracts SET emailed_at = CURRENT_TIMESTAMP WHERE id = $1', [contract.id]);
                emailed = true;
            } catch (emailError) {
                console.error('Contract email error (contract still generated):', emailError);
            }
        }

        await AuditService.log({
            staffId: req.user.id,
            action: 'contract_generated',
            entityType: 'employee_contract',
            entityId: contract.id,
            details: { forStaffId: req.params.id, jobTitle, emailed },
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, data: contract, emailed });
    } catch (error) {
        console.error('Generate contract error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate contract' });
    }
});

/**
 * GET /api/contracts/staff/:id
 * List a staff member's contract history (self, or HR/Admin)
 */
router.get('/staff/:id', authMiddleware, async (req, res) => {
    try {
        if (!canAccessStaffContracts(req, req.params.id)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        const result = await db.query(
            `SELECT id, job_title, department, start_date, gross_salary, currency, emailed_at, generated_at
             FROM employee_contracts WHERE staff_id = $1 ORDER BY generated_at DESC`,
            [req.params.id]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List contracts error:', error);
        res.status(500).json({ success: false, message: 'Failed to load contracts' });
    }
});

/**
 * GET /api/contracts/:id/pdf
 * Download a generated contract PDF (self, or HR/Admin)
 */
router.get('/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employee_contracts WHERE id = $1', [req.params.id]);
        const contract = result.rows[0];
        if (!contract) {
            return res.status(404).json({ success: false, message: 'Contract not found' });
        }
        if (!canAccessStaffContracts(req, contract.staff_id)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const staff = await Staff.findById(contract.staff_id);
        const pdfBuffer = await generateContractPDF(contract, staff);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=employment-contract.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Contract PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
});

module.exports = router;
