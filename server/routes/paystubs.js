/**
 * Paystub Routes
 * Monthly paystub generation and retrieval. PAYE tax and the DBIR
 * Development Levy are auto-calculated (see payeService.js); pension and
 * NHF are deliberately not included yet. "Other deductions" (advances,
 * etc.) are still entered manually by the Accountant.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, accountantOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const Staff = require('../models/Staff');
const AuditService = require('../services/auditService');
const { generatePaystubPDF } = require('../services/pdfService');
const { calculateMonthlyPAYE, monthlyDevelopmentLevy } = require('../services/payeService');

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

        const paye = calculateMonthlyPAYE(gross);
        const devLevy = monthlyDevelopmentLevy();
        const otherDeductions = parseFloat(deductions) || 0;
        const net = gross - paye.monthlyTax - devLevy - otherDeductions;

        const result = await db.query(
            `INSERT INTO paystubs (
                staff_id, pay_period_month, pay_period_year, basic_salary,
                housing_allowance, transport_allowance, utility_allowance, meal_allowance,
                gross_pay, paye_tax, cra_amount, development_levy,
                deductions, deductions_note, net_pay, currency, generated_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            ON CONFLICT (staff_id, pay_period_month, pay_period_year)
            DO UPDATE SET
                basic_salary = EXCLUDED.basic_salary, housing_allowance = EXCLUDED.housing_allowance,
                transport_allowance = EXCLUDED.transport_allowance, utility_allowance = EXCLUDED.utility_allowance,
                meal_allowance = EXCLUDED.meal_allowance, gross_pay = EXCLUDED.gross_pay,
                paye_tax = EXCLUDED.paye_tax, cra_amount = EXCLUDED.cra_amount,
                development_levy = EXCLUDED.development_levy,
                deductions = EXCLUDED.deductions, deductions_note = EXCLUDED.deductions_note,
                net_pay = EXCLUDED.net_pay, generated_by = EXCLUDED.generated_by, generated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [staffId, month, year, basic, housing, transport, utility, meal,
                gross, paye.monthlyTax, paye.monthlyCRA, devLevy,
                otherDeductions, deductionsNote || null, net, salary.salary_currency || 'NGN', req.user.id]
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

/**
 * GET /api/paystubs/dbir-schedule?month=&year=
 * Monthly DBIR PAYE Schedule export (Employee Name, Tax ID, Gross Income,
 * CRA, PAYE Tax Deducted) as CSV, ready for upload to the Delta State
 * Board of Internal Revenue portal. Accountant/Admin only.
 */
router.get('/dbir-schedule', authMiddleware, accountantOrAdmin, async (req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);
        if (!month || month < 1 || month > 12 || !year) {
            return res.status(400).json({ success: false, message: 'Valid month and year are required' });
        }

        const result = await db.query(
            `SELECT s.name, s.nin, s.tin, p.gross_pay, p.cra_amount, p.paye_tax, p.development_levy
             FROM paystubs p
             JOIN staff s ON s.id = p.staff_id
             WHERE p.pay_period_month = $1 AND p.pay_period_year = $2
             ORDER BY s.name`,
            [month, year]
        );

        const header = 'Employee Name,NIN,Tax ID (TIN),Gross Income (NGN),CRA (NGN),PAYE Tax (NGN),Development Levy (NGN)\n';
        const rows = result.rows.map(r => [
            `"${(r.name || '').replace(/"/g, '""')}"`,
            r.nin || 'MISSING',
            r.tin || 'PENDING',
            Number(r.gross_pay).toFixed(2),
            Number(r.cra_amount).toFixed(2),
            Number(r.paye_tax).toFixed(2),
            Number(r.development_levy).toFixed(2)
        ].join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=dbir-paye-schedule-${year}-${String(month).padStart(2, '0')}.csv`);
        res.send(header + rows);
    } catch (error) {
        console.error('DBIR schedule error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate DBIR schedule' });
    }
});

module.exports = router;
