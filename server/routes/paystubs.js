/**
 * Paystub Routes
 * Monthly paystub generation and retrieval. Deductions are entered
 * manually by the Accountant (see migration 008 for why) - this is not
 * an automatic Nigerian PAYE/pension calculator.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, accountantOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const Staff = require('../models/Staff');
const AuditService = require('../services/auditService');
const { generatePaystubPDF } = require('../services/pdfService');

const canAccessStaffPaystubs = (req, staffId) => {
    return req.user.id === staffId || req.user.role === 'admin' || req.user.role === 'accountant';
};

/**
 * GET /api/paystubs/staff/:staffId
 * List a staff member's paystubs (self, or Accountant/Admin)
 */
router.get('/staff/:staffId', authMiddleware, async (req, res) => {
    try {
        if (!canAccessStaffPaystubs(req, req.params.staffId)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await db.query(
            `SELECT id, staff_id, pay_period_month, pay_period_year, gross_pay,
                    deductions, net_pay, currency, generated_at
             FROM paystubs WHERE staff_id = $1
             ORDER BY pay_period_year DESC, pay_period_month DESC`,
            [req.params.staffId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List paystubs error:', error);
        res.status(500).json({ success: false, message: 'Failed to load paystubs' });
    }
});

/**
 * POST /api/paystubs
 * Generate a paystub for a staff member's pay period (Accountant/Admin only).
 * Pulls the staff member's CURRENT salary structure as a snapshot - later
 * salary changes won't retroactively alter an already-generated paystub.
 */
router.post('/', authMiddleware, accountantOrAdmin, [
    body('staffId').notEmpty(),
    body('month').isInt({ min: 1, max: 12 }),
    body('year').isInt({ min: 2020, max: 2100 }),
    body('deductions').optional().isFloat({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { staffId, month, year, deductions, deductionsNote } = req.body;

        const salary = await Staff.getSalaryInfo(staffId);
        if (!salary) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        if (!salary.base_salary) {
            return res.status(400).json({ success: false, message: 'This staff member has no salary on file yet - set it on the Payroll page first' });
        }

        const basic = parseFloat(salary.base_salary) || 0;
        const housing = parseFloat(salary.housing_allowance) || 0;
        const transport = parseFloat(salary.transport_allowance) || 0;
        const utility = parseFloat(salary.utility_allowance) || 0;
        const meal = parseFloat(salary.meal_allowance) || 0;
        const gross = basic + housing + transport + utility + meal;
        const deductionAmount = parseFloat(deductions) || 0;
        const net = gross - deductionAmount;

        const result = await db.query(
            `INSERT INTO paystubs (
                staff_id, pay_period_month, pay_period_year, basic_salary,
                housing_allowance, transport_allowance, utility_allowance, meal_allowance,
                gross_pay, deductions, deductions_note, net_pay, currency, generated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            ON CONFLICT (staff_id, pay_period_month, pay_period_year)
            DO UPDATE SET
                basic_salary = EXCLUDED.basic_salary, housing_allowance = EXCLUDED.housing_allowance,
                transport_allowance = EXCLUDED.transport_allowance, utility_allowance = EXCLUDED.utility_allowance,
                meal_allowance = EXCLUDED.meal_allowance, gross_pay = EXCLUDED.gross_pay,
                deductions = EXCLUDED.deductions, deductions_note = EXCLUDED.deductions_note,
                net_pay = EXCLUDED.net_pay, generated_by = EXCLUDED.generated_by, generated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [staffId, month, year, basic, housing, transport, utility, meal,
                gross, deductionAmount, deductionsNote || null, net, salary.salary_currency || 'NGN', req.user.id]
        );

        await AuditService.log({
            staffId: req.user.id,
            action: 'paystub_generated',
            entityType: 'paystub',
            entityId: result.rows[0].id,
            details: { forStaffId: staffId, month, year, netPay: net },
            ipAddress: req.ip
        });

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Generate paystub error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate paystub' });
    }
});

/**
 * GET /api/paystubs/:id/pdf
 * Download a paystub as a PDF (self, or Accountant/Admin)
 */
router.get('/:id/pdf', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM paystubs WHERE id = $1', [req.params.id]);
        const paystub = result.rows[0];
        if (!paystub) {
            return res.status(404).json({ success: false, message: 'Paystub not found' });
        }
        if (!canAccessStaffPaystubs(req, paystub.staff_id)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const staff = await Staff.findById(paystub.staff_id);
        const pdfBuffer = await generatePaystubPDF(paystub, staff);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${paystub.pay_period_year}-${String(paystub.pay_period_month).padStart(2, '0')}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Paystub PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
});

module.exports = router;
