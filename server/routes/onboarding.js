/**
 * Onboarding Routes
 * Per-hire checklist for new staff. Gated to admin, HR (implicitly, via
 * hasPermission('onboarding')), and anyone explicitly granted
 * can_manage_onboarding - the intended path for IT Support, which is a
 * department today rather than a role (see contract_templates), to get
 * scoped access without full staff/payroll visibility.
 *
 * Contract-generated and handbook/code-of-conduct-acknowledged status are
 * read live from employee_contracts / document_acknowledgments rather than
 * duplicated here, so there's one system of record per fact.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, hasPermission } = require('../middleware/auth');
const db = require('../config/database');
const Staff = require('../models/Staff');
const { provisionWorkspaceUser, isWorkspaceConfigured, resetWorkspacePassword, hasLoggedIn } = require('../services/googleWorkspaceService');
const { sendWelcomeEmail } = require('../services/emailService');

async function getAutoStatus(staffId) {
    const [contract, handbook, codeOfConduct, salary] = await Promise.all([
        db.query('SELECT id FROM employee_contracts WHERE staff_id = $1 LIMIT 1', [staffId]),
        db.query(`SELECT id FROM document_acknowledgments WHERE staff_id = $1 AND doc_type = 'handbook' LIMIT 1`, [staffId]),
        db.query(`SELECT id FROM document_acknowledgments WHERE staff_id = $1 AND doc_type = 'code_of_conduct' LIMIT 1`, [staffId]),
        db.query('SELECT base_salary FROM staff WHERE id = $1', [staffId])
    ]);
    return {
        contractGenerated: contract.rows.length > 0,
        handbookAcknowledged: handbook.rows.length > 0,
        codeOfConductAcknowledged: codeOfConduct.rows.length > 0,
        salarySet: !!(salary.rows[0] && Number(salary.rows[0].base_salary) > 0)
    };
}

/**
 * GET /api/onboarding
 * List every staff member with an onboarding checklist, with progress
 * counts, most-incomplete first.
 */
router.get('/', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.id, s.name, s.email, s.role, s.department, s.hire_date, s.workspace_email,
                   s.workspace_provisioned_at, s.offer_accepted_at, s.welcome_email_sent_at, s.workspace_activated_at,
                   COUNT(t.id) AS total_tasks,
                   COUNT(t.id) FILTER (WHERE t.status = 'done') AS completed_tasks
            FROM staff s
            LEFT JOIN onboarding_tasks t ON t.staff_id = s.id
            GROUP BY s.id
            HAVING COUNT(t.id) > 0
            ORDER BY (COUNT(t.id) FILTER (WHERE t.status = 'done') = COUNT(t.id)), s.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('List onboarding error:', error);
        res.status(500).json({ success: false, message: 'Failed to load onboarding list' });
    }
});

/**
 * GET /api/onboarding/:staffId
 * Full onboarding detail for one hire: auto-computed status + manual tasks.
 */
router.get('/:staffId', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        const [autoStatus, tasksResult] = await Promise.all([
            getAutoStatus(staff.id),
            db.query(
                `SELECT t.*, c.name AS completed_by_name
                 FROM onboarding_tasks t
                 LEFT JOIN staff c ON c.id = t.completed_by
                 WHERE t.staff_id = $1
                 ORDER BY t.owner, t.created_at`,
                [staff.id]
            )
        ]);

        res.json({
            success: true,
            data: {
                staff: {
                    id: staff.id, name: staff.name, email: staff.email, role: staff.role,
                    department: staff.department, hireDate: staff.hire_date,
                    workspaceEmail: staff.workspace_email, workspaceProvisionedAt: staff.workspace_provisioned_at,
                    welcomeEmailSentAt: staff.welcome_email_sent_at, workspaceActivatedAt: staff.workspace_activated_at,
                    offerAcceptedAt: staff.offer_accepted_at
                },
                autoStatus,
                tasks: tasksResult.rows,
                workspaceConfigured: isWorkspaceConfigured()
            }
        });
    } catch (error) {
        console.error('Get onboarding detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to load onboarding detail' });
    }
});

/**
 * PATCH /api/onboarding/tasks/:taskId
 * Mark a manual task done/pending.
 */
router.patch('/tasks/:taskId', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'done'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const result = status === 'done'
            ? await db.query(
                `UPDATE onboarding_tasks
                 SET status = 'done', completed_by = $1, completed_at = CURRENT_TIMESTAMP
                 WHERE id = $2 RETURNING *`,
                [req.user.id, req.params.taskId]
            )
            : await db.query(
                `UPDATE onboarding_tasks
                 SET status = 'pending', completed_by = NULL, completed_at = NULL
                 WHERE id = $1 RETURNING *`,
                [req.params.taskId]
            );

        if (!result.rows[0]) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update onboarding task error:', error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
});

/**
 * PATCH /api/onboarding/:staffId/offer-accepted
 * Mark whether the new hire has confirmed their offer. Gates Workspace
 * provisioning below - IT previously had no signal at all for this and
 * could provision the company mailbox before an offer was even sent.
 */
router.patch('/:staffId/offer-accepted', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const { accepted } = req.body;
        const staff = await Staff.update(req.params.staffId, {
            offerAcceptedAt: accepted ? new Date().toISOString() : null
        });
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        res.json({ success: true, data: { offerAcceptedAt: staff.offer_accepted_at } });
    } catch (error) {
        console.error('Update offer-accepted error:', error);
        res.status(500).json({ success: false, message: 'Failed to update offer status' });
    }
});

/**
 * POST /api/onboarding/:staffId/provision-email
 * Creates the @tekvwa.org Google Workspace mailbox via the Admin SDK and
 * marks the email_provisioned task done. Deliberately does NOT email
 * anything yet - that's the separate "Send Welcome Email" step below, so
 * IT can verify the account (licenses, groups, OU) before credentials go
 * out. Requires GOOGLE_WORKSPACE_* to be configured - returns 501
 * otherwise so the UI can fall back to the manual checklist toggle.
 */
router.post('/:staffId/provision-email', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        if (!isWorkspaceConfigured()) {
            return res.status(501).json({
                success: false,
                message: 'Google Workspace provisioning is not configured yet. Create the mailbox manually and check the task off instead.'
            });
        }

        const staff = await Staff.findById(req.params.staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        if (!staff.offer_accepted_at) {
            return res.status(400).json({ success: false, message: 'Mark the offer as accepted before provisioning the company email account' });
        }
        if (staff.workspace_email) {
            return res.status(400).json({ success: false, message: `Already provisioned: ${staff.workspace_email}` });
        }

        const { email: workspaceEmail } = await provisionWorkspaceUser({
            fullName: staff.name,
            department: staff.department
        });

        await db.query(
            'UPDATE staff SET workspace_email = $1, workspace_provisioned_at = CURRENT_TIMESTAMP WHERE id = $2',
            [workspaceEmail, staff.id]
        );

        await db.query(
            `UPDATE onboarding_tasks
             SET status = 'done', completed_by = $1, completed_at = CURRENT_TIMESTAMP
             WHERE staff_id = $2 AND task_key = 'email_provisioned'`,
            [req.user.id, staff.id]
        );

        res.json({ success: true, data: { workspaceEmail } });
    } catch (error) {
        console.error('Provision workspace email error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to provision Workspace account' });
    }
});

/**
 * POST /api/onboarding/:staffId/send-welcome-email
 * Sets a fresh temp password on the already-provisioned Workspace account
 * and emails it plus first-day info to the hire's personal address. The
 * explicit second step the flow calls for - IT confirms the account is
 * ready, then this fires the credentials out.
 */
router.post('/:staffId/send-welcome-email', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        if (!staff.workspace_email) {
            return res.status(400).json({ success: false, message: 'Create the Workspace account first' });
        }
        if (!staff.email) {
            return res.status(400).json({ success: false, message: 'Staff member has no personal email on file to send credentials to' });
        }

        const tempPassword = await resetWorkspacePassword(staff.workspace_email);
        await sendWelcomeEmail({ staff, workspaceEmail: staff.workspace_email, tempPassword });

        await db.query('UPDATE staff SET welcome_email_sent_at = CURRENT_TIMESTAMP WHERE id = $1', [staff.id]);

        res.json({ success: true, data: { workspaceEmail: staff.workspace_email } });
    } catch (error) {
        console.error('Send welcome email error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to send welcome email' });
    }
});

/**
 * POST /api/onboarding/:staffId/check-activation
 * The last of three gates: offer accepted -> Workspace provisioned +
 * welcome email sent -> confirmed first Google sign-in. There's no push
 * notification for Google login events, so this polls the Reports API on
 * demand (called when the New Hires detail page loads, and via a manual
 * "Check Now" button) rather than running continuously in the background.
 * Once confirmed, the hire is promoted to real Active staff and starts
 * showing up in Staff Management.
 */
router.post('/:staffId/check-activation', authMiddleware, hasPermission('onboarding'), async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.staffId);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }
        if (staff.workspace_activated_at) {
            return res.json({ success: true, data: { activated: true, alreadyActivated: true } });
        }
        if (!staff.workspace_email || !staff.workspace_provisioned_at) {
            return res.status(400).json({ success: false, message: 'Workspace account not yet provisioned' });
        }

        const loggedIn = await hasLoggedIn(staff.workspace_email, staff.workspace_provisioned_at);
        if (loggedIn) {
            await Staff.update(staff.id, { workspaceActivatedAt: new Date().toISOString() });
        }

        res.json({ success: true, data: { activated: loggedIn } });
    } catch (error) {
        console.error('Check activation error:', error);
        res.status(500).json({ success: false, message: 'Failed to check activation status' });
    }
});

module.exports = router;
