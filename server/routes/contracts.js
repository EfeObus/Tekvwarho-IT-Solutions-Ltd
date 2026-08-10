/**
 * Contract Routes
 * Department contract templates and generated employment contracts,
 * with auto-PDF-on-hire emailed to the new staff member.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authMiddleware, hrOrAdmin } = require('../middleware/auth');
const { contractAcceptLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');
const Staff = require('../models/Staff');
const AuditService = require('../services/auditService');
const { generateContractPDF } = require('../services/pdfService');
const { sendContractEmail } = require('../services/emailService');

const EMPLOYMENT_STATUSES = ['Full-Time', 'Part-Time', 'Contract'];

const canAccessStaffContracts = (req, staffId) => {
    return req.user.id === staffId || req.user.role === 'admin' || req.user.role === 'hr';
};

// Templates are generic per-department boilerplate (job title/description),
// not individual employee contracts - no salary data - so a compliance
// viewer (Legal Advisor) can read them without the broader hrOrAdmin tier.
const canViewTemplates = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'hr' || req.user.permissions?.canViewCompliance) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'HR, admin, or compliance-view access required' });
};

/**
 * GET /api/contracts/templates
 * List all department contract templates (HR/Admin, or read-only for
 * compliance viewers)
 */
router.get('/templates', authMiddleware, canViewTemplates, async (req, res) => {
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
 * Generate a full employment offer letter for a staff member and email it
 * with a secure accept link. Department, salary, and allowances default to
 * the staff record / Payroll but are all overridable here, since an offer's
 * terms are proposed at hire time and may not match what's saved yet - a
 * candidate isn't fully in Payroll until they've accepted.
 */
router.post('/staff/:id', authMiddleware, hrOrAdmin, [
    body('jobTitle').trim().notEmpty().withMessage('Job title is required'),
    body('startDate').optional({ checkFalsy: true }).isISO8601(),
    body('offerExpirationDate').optional({ checkFalsy: true }).isISO8601(),
    body('employmentStatus').optional({ checkFalsy: true }).isIn(EMPLOYMENT_STATUSES),
    body('basicSalary').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('housingAllowance').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('transportAllowance').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('utilityAllowance').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('mealAllowance').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('ptoDays').optional({ checkFalsy: true }).isInt({ min: 0 })
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
        const payrollSalary = await Staff.getSalaryInfo(req.params.id);

        const {
            jobTitle, jobDescription, startDate, sendEmail: shouldEmail,
            department, reportingTo, employmentStatus, ptoDays,
            probationPeriod, resignationNotice, terminationNotice,
            offerExpirationDate, senderName, senderTitle,
            basicSalary, housingAllowance, transportAllowance, utilityAllowance, mealAllowance
        } = req.body;

        const basic = basicSalary != null && basicSalary !== '' ? parseFloat(basicSalary) : (parseFloat(payrollSalary?.base_salary) || 0);
        const housing = housingAllowance != null && housingAllowance !== '' ? parseFloat(housingAllowance) : (parseFloat(payrollSalary?.housing_allowance) || 0);
        const transport = transportAllowance != null && transportAllowance !== '' ? parseFloat(transportAllowance) : (parseFloat(payrollSalary?.transport_allowance) || 0);
        const utility = utilityAllowance != null && utilityAllowance !== '' ? parseFloat(utilityAllowance) : (parseFloat(payrollSalary?.utility_allowance) || 0);
        const meal = mealAllowance != null && mealAllowance !== '' ? parseFloat(mealAllowance) : (parseFloat(payrollSalary?.meal_allowance) || 0);
        const gross = basic + housing + transport + utility + meal;

        if (basic <= 0) {
            return res.status(400).json({ success: false, message: 'Enter a basic salary for this offer, or set one on the Payroll page first' });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpiresAt = offerExpirationDate
            ? new Date(offerExpirationDate)
            : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // default 14-day offer window

        const result = await db.query(
            `INSERT INTO employee_contracts (
                staff_id, department, job_title, job_description, start_date,
                basic_salary, housing_allowance, transport_allowance, utility_allowance,
                meal_allowance, gross_salary, currency, generated_by,
                reporting_to, employment_status, pto_days, probation_period,
                resignation_notice, termination_notice, offer_expiration_date,
                sender_name, sender_title, acceptance_token_hash, acceptance_token_expires_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
            RETURNING *`,
            [req.params.id, department || staff.department, jobTitle, jobDescription || null, startDate || null,
                basic, housing, transport, utility, meal, gross, payrollSalary?.salary_currency || 'NGN', req.user.id,
                reportingTo || null, employmentStatus || 'Full-Time', ptoDays || null, probationPeriod || null,
                resignationNotice || null, terminationNotice || null, offerExpirationDate || null,
                senderName || req.user.name || null, senderTitle || null, tokenHash, tokenExpiresAt]
        );
        const contract = result.rows[0];

        const acceptUrl = `${process.env.SITE_URL || 'http://localhost:5500'}/admin/accept-offer.html?token=${rawToken}`;
        const pdfBuffer = await generateContractPDF(contract, staff);

        let emailed = false;
        if (shouldEmail !== false) {
            try {
                await sendContractEmail(staff, jobTitle, pdfBuffer, acceptUrl, contract);
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
 * GET /api/contracts/accept/:token
 * Public (unauthenticated) - a candidate follows the emailed link to review
 * their offer before accepting. Token is looked up by hash, never stored
 * raw, same pattern as password-reset tokens. Returns just enough to render
 * the offer; salary fields intentionally included since the candidate is
 * the one person for whom that isn't sensitive.
 */
router.get('/accept/:token', contractAcceptLimiter, async (req, res) => {
    try {
        const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const result = await db.query(
            `SELECT ec.*, s.name AS staff_name, s.email AS staff_email
             FROM employee_contracts ec
             JOIN staff s ON s.id = ec.staff_id
             WHERE ec.acceptance_token_hash = $1`,
            [tokenHash]
        );
        const contract = result.rows[0];
        if (!contract) {
            return res.status(404).json({ success: false, message: 'This offer link is invalid.' });
        }
        if (contract.accepted_at) {
            return res.status(200).json({ success: true, alreadyAccepted: true, data: { acceptedAt: contract.accepted_at, staffName: contract.staff_name } });
        }
        if (contract.acceptance_token_expires_at && new Date(contract.acceptance_token_expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: 'This offer link has expired. Please contact HR for a new offer.' });
        }

        res.json({ success: true, data: contract });
    } catch (error) {
        console.error('Get offer for acceptance error:', error);
        res.status(500).json({ success: false, message: 'Failed to load offer' });
    }
});

/**
 * POST /api/contracts/accept/:token
 * Public (unauthenticated) - records the candidate's electronic acceptance:
 * typed full name, timestamp, and IP, then auto-marks the staff record's
 * offer as accepted so Workspace provisioning unlocks without an admin
 * having to manually flip the toggle.
 */
router.post('/accept/:token', contractAcceptLimiter, [
    body('signatureName').trim().notEmpty().withMessage('Please type your full name to accept')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
        const result = await db.query('SELECT * FROM employee_contracts WHERE acceptance_token_hash = $1', [tokenHash]);
        const contract = result.rows[0];
        if (!contract) {
            return res.status(404).json({ success: false, message: 'This offer link is invalid.' });
        }
        if (contract.accepted_at) {
            return res.status(409).json({ success: false, message: 'This offer has already been accepted.' });
        }
        if (contract.acceptance_token_expires_at && new Date(contract.acceptance_token_expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: 'This offer link has expired. Please contact HR for a new offer.' });
        }

        const updated = await db.query(
            `UPDATE employee_contracts
             SET accepted_at = CURRENT_TIMESTAMP, accepted_ip = $1, accepted_signature_name = $2
             WHERE id = $3 RETURNING *`,
            [req.ip, req.body.signatureName.trim(), contract.id]
        );

        // Acceptance is what actually makes this person a staff member, not
        // the earlier Add Staff form submission - they couldn't log in or
        // use any permission until this moment.
        await Staff.update(contract.staff_id, { offerAcceptedAt: new Date().toISOString(), isActive: true });

        // The offer's salary terms are the one place compensation is
        // negotiated and typed in - syncing them into Payroll here (instead
        // of also accepting manual entry on the Staff/Payroll pages at hire
        // time) means there's a single source of truth instead of two
        // numbers that can quietly drift apart.
        await Staff.updateSalary(contract.staff_id, {
            baseSalary: contract.basic_salary,
            housingAllowance: contract.housing_allowance,
            transportAllowance: contract.transport_allowance,
            utilityAllowance: contract.utility_allowance,
            mealAllowance: contract.meal_allowance,
            currency: contract.currency
        });

        await AuditService.log({
            staffId: contract.staff_id,
            action: 'offer_accepted',
            entityType: 'employee_contract',
            entityId: contract.id,
            details: { signatureName: req.body.signatureName.trim() },
            ipAddress: req.ip
        });

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        console.error('Accept offer error:', error);
        res.status(500).json({ success: false, message: 'Failed to record acceptance' });
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
