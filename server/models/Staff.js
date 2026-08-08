/**
 * Staff Model
 * Handles admin/staff users with hierarchical permissions
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const Staff = {
    /**
     * Create a new staff member (onboarding by admin)
     */
    async create({
        email,
        password,
        name,
        role = 'staff',
        department = null,
        phone = null,
        createdBy = null,
        hireDate = null,
        permissions = {}
    }) {
        const id = uuidv4();
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.query(
            `INSERT INTO staff (
                id, email, password_hash, name, role, department, phone,
                must_change_password, is_active, created_by, hire_date,
                can_manage_messages, can_manage_consultations,
                can_manage_chats, can_view_analytics,
                can_manage_employees, can_manage_payroll
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id, email, name, role, department, phone, is_active,
                      must_change_password, can_manage_messages, can_manage_consultations,
                      can_manage_chats, can_view_analytics, can_manage_employees,
                      can_manage_payroll, hire_date, created_at`,
            [
                id, email, passwordHash, name, role, department, phone,
                true, // must_change_password - new staff must change password
                true, // is_active
                createdBy,
                hireDate,
                permissions.canManageMessages !== false,
                permissions.canManageConsultations !== false,
                permissions.canManageChats !== false,
                permissions.canViewAnalytics || false,
                permissions.canManageEmployees || false,
                permissions.canManagePayroll || false
            ]
        );
        return result.rows[0];
    },

    /**
     * Find staff by email
     */
    async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM staff WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    /**
     * Find staff by ID
     */
    async findById(id) {
        const result = await db.query(
            `SELECT id, email, name, role, department, phone, is_active,
                    must_change_password, can_manage_messages, can_manage_consultations,
                    can_manage_chats, can_view_analytics, can_manage_employees,
                    can_manage_payroll, hire_date, created_at, last_login
             FROM staff WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Get all staff members (excluding password hash and salary - salary is
     * only ever returned by getSalaryInfo(), gated to admin/accountant)
     */
    async findAll(filters = {}) {
        let query = `
            SELECT id, email, name, role, department, phone, is_active,
                   must_change_password, can_manage_messages, can_manage_consultations,
                   can_manage_chats, can_view_analytics, can_manage_employees,
                   can_manage_payroll, hire_date, created_at, last_login
            FROM staff
        `;
        const conditions = [];
        const values = [];
        let paramIndex = 1;

        if (filters.role) {
            conditions.push(`role = $${paramIndex}`);
            values.push(filters.role);
            paramIndex++;
        }

        if (filters.isActive !== undefined) {
            conditions.push(`is_active = $${paramIndex}`);
            values.push(filters.isActive);
            paramIndex++;
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    },

    /**
     * Get staff count by role
     */
    async getCountByRole() {
        const result = await db.query(`
            SELECT role, COUNT(*) as count
            FROM staff
            WHERE is_active = true
            GROUP BY role
        `);
        return result.rows;
    },

    /**
     * Verify password
     */
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    },

    /**
     * Update last login
     */
    async updateLastLogin(id) {
        await db.query(
            'UPDATE staff SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    },

    /**
     * Change password
     */
    async changePassword(id, newPassword, clearMustChange = true) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.query(
            `UPDATE staff SET
                password_hash = $1,
                must_change_password = $2,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [passwordHash, !clearMustChange, id]
        );
    },

    /**
     * Update staff member
     */
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = {
            name: 'name',
            role: 'role',
            department: 'department',
            phone: 'phone',
            isActive: 'is_active',
            mustChangePassword: 'must_change_password',
            canManageMessages: 'can_manage_messages',
            canManageConsultations: 'can_manage_consultations',
            canManageChats: 'can_manage_chats',
            canViewAnalytics: 'can_view_analytics',
            canManageEmployees: 'can_manage_employees',
            canManagePayroll: 'can_manage_payroll'
            // Note: base_salary is deliberately NOT editable through this method.
            // Use updateSalary() instead, which routes gate to admin-only, so a
            // salary change always requires Admin sign-off even for HR/Accountant.
        };

        for (const [key, dbField] of Object.entries(allowedFields)) {
            if (updates[key] !== undefined) {
                fields.push(`${dbField} = $${paramIndex}`);
                values.push(updates[key]);
                paramIndex++;
            }
        }

        if (updates.password) {
            const hash = await bcrypt.hash(updates.password, 12);
            fields.push(`password_hash = $${paramIndex}`);
            values.push(hash);
            paramIndex++;

            // If admin is setting password, staff must change it on first login
            fields.push(`must_change_password = $${paramIndex}`);
            values.push(true);
            paramIndex++;
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const result = await db.query(
            `UPDATE staff SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${paramIndex}
             RETURNING id, email, name, role, department, phone, is_active,
                       must_change_password, can_manage_messages, can_manage_consultations,
                       can_manage_chats, can_view_analytics, can_manage_employees,
                       can_manage_payroll, hire_date, created_at`,
            values
        );
        return result.rows[0];
    },

    /**
     * Get a staff member's salary info. Deliberately a separate method from
     * findById()/findAll() so payroll data is only ever fetched by routes
     * that explicitly ask for it (and are gated to admin/accountant/self).
     */
    async getSalaryInfo(id) {
        const result = await db.query(
            `SELECT id, name, email, department, base_salary, housing_allowance,
                    transport_allowance, utility_allowance, meal_allowance,
                    salary_currency, hire_date
             FROM staff WHERE id = $1`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Set a staff member's full salary structure (Basic + Nigerian standard
     * allowances: Housing, Transport, Utility, Meal/Entertainment). Kept
     * separate from update() and always gated to admin-only at the route
     * level, so an Accountant can process payroll without being able to
     * grant themselves or anyone else a raise.
     */
    async updateSalary(id, { baseSalary, housingAllowance = 0, transportAllowance = 0, utilityAllowance = 0, mealAllowance = 0, currency = 'NGN' }) {
        const result = await db.query(
            `UPDATE staff SET
                base_salary = $1, housing_allowance = $2, transport_allowance = $3,
                utility_allowance = $4, meal_allowance = $5, salary_currency = $6,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING id, name, email, base_salary, housing_allowance,
                       transport_allowance, utility_allowance, meal_allowance, salary_currency`,
            [baseSalary, housingAllowance, transportAllowance, utilityAllowance, mealAllowance, currency, id]
        );
        return result.rows[0];
    },

    /**
     * Deactivate staff member (soft delete)
     */
    async deactivate(id) {
        await db.query(
            'UPDATE staff SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    },

    /**
     * Activate staff member
     */
    async activate(id) {
        await db.query(
            'UPDATE staff SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
    },

    /**
     * Delete staff member permanently (admin only)
     */
    async delete(id) {
        // First check if this is the last admin
        const admins = await db.query(
            "SELECT COUNT(*) as count FROM staff WHERE role = 'admin' AND is_active = true"
        );

        const staff = await this.findById(id);

        if (staff && staff.role === 'admin' && parseInt(admins.rows[0].count) <= 1) {
            throw new Error('Cannot delete the last admin user');
        }

        await db.query('DELETE FROM staff WHERE id = $1', [id]);
    },

    /**
     * Check if user has permission
     */
    hasPermission(staff, permission) {
        if (staff.role === 'admin') {
            return true;
        }

        const permissionMap = {
            'messages': staff.can_manage_messages,
            'consultations': staff.can_manage_consultations,
            'chats': staff.can_manage_chats,
            'analytics': staff.can_view_analytics,
            'staff': staff.role === 'admin' || staff.role === 'manager'
        };

        return permissionMap[permission] || false;
    },

    /**
     * Get staff for assignment dropdown
     */
    async getActiveStaff() {
        const result = await db.query(
            `SELECT id, name, email, role, department
             FROM staff
             WHERE is_active = true
             ORDER BY name ASC`
        );
        return result.rows;
    },

    /**
     * Find an admin user for fallback assignment when no staff is available
     */
    async findAdminForFallback() {
        const result = await db.query(`
            SELECT id, name, email, role
            FROM staff
            WHERE is_active = true
              AND role = 'admin'
            ORDER BY last_login DESC NULLS LAST
            LIMIT 1
        `);
        return result.rows[0] || null;
    },

    /**
     * Get next available staff for chat assignment (round-robin by least active chats)
     * @param {Array} onlineStaffIds - Array of staff IDs currently online (optional)
     */
    async getNextAvailableForChats(onlineStaffIds = null) {
        let query = `
            SELECT s.id, s.name, s.email, s.role,
                   COALESCE(active_chats.count, 0) as active_chat_count
            FROM staff s
            LEFT JOIN (
                SELECT assigned_to, COUNT(*) as count
                FROM chat_sessions
                WHERE status = 'active' AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            ) active_chats ON s.id = active_chats.assigned_to
            WHERE s.is_active = true
              AND s.can_manage_chats = true
        `;

        const params = [];

        // Prefer online staff if provided
        if (onlineStaffIds && onlineStaffIds.length > 0) {
            query += ' AND s.id = ANY($1)';
            params.push(onlineStaffIds);
        }

        query += ' ORDER BY active_chat_count ASC, s.last_login DESC NULLS LAST LIMIT 1';

        const result = await db.query(query, params);
        return result.rows[0] || null;
    },

    /**
     * Get next available staff for consultation assignment (round-robin by least pending)
     */
    async getNextAvailableForConsultations() {
        const result = await db.query(`
            SELECT s.id, s.name, s.email, s.role,
                   COALESCE(pending_consults.count, 0) as pending_count
            FROM staff s
            LEFT JOIN (
                SELECT assigned_to, COUNT(*) as count
                FROM consultations
                WHERE status IN ('pending', 'confirmed') AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            ) pending_consults ON s.id = pending_consults.assigned_to
            WHERE s.is_active = true
              AND s.can_manage_consultations = true
            ORDER BY pending_count ASC, s.last_login DESC NULLS LAST
            LIMIT 1
        `);
        return result.rows[0] || null;
    },

    /**
     * Get next available staff for message assignment (round-robin by least active messages)
     */
    async getNextAvailableForMessages() {
        const result = await db.query(`
            SELECT s.id, s.name, s.email, s.role,
                   COALESCE(active_msgs.count, 0) as active_message_count
            FROM staff s
            LEFT JOIN (
                SELECT assigned_to, COUNT(*) as count
                FROM messages
                WHERE status IN ('new', 'in_progress') AND assigned_to IS NOT NULL
                GROUP BY assigned_to
            ) active_msgs ON s.id = active_msgs.assigned_to
            WHERE s.is_active = true
              AND s.can_manage_messages = true
            ORDER BY active_message_count ASC, s.last_login DESC NULLS LAST
            LIMIT 1
        `);
        return result.rows[0] || null;
    }
};

module.exports = Staff;
