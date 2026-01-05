/**
 * Consultation Model
 * Handles booking/consultation management
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Consultation = {
    /**
     * Create a new consultation booking
     */
    async create({ name, email, phone, company, service, bookingDate, bookingTime, timezone, notes, visitorId }) {
        const id = uuidv4();
        const result = await db.query(
            `INSERT INTO consultations 
             (id, visitor_id, name, email, phone, company, service, booking_date, booking_time, timezone, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [id, visitorId, name, email, phone, company, service, bookingDate, bookingTime, timezone, notes]
        );
        return result.rows[0];
    },

    /**
     * Get all consultations with optional filters
     */
    async findAll({ status, startDate, endDate, limit = 50, offset = 0 }) {
        let query = `
            SELECT c.*, s.name as assigned_to_name
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
        
        query += ` ORDER BY c.booking_date ASC, c.booking_time ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        return result.rows;
    },

    /**
     * Get consultation by ID
     */
    async findById(id) {
        const result = await db.query(
            `SELECT c.*, s.name as assigned_to_name
             FROM consultations c
             LEFT JOIN staff s ON c.assigned_to = s.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0];
    },

    /**
     * Update consultation status
     */
    async updateStatus(id, status, assignedTo = null) {
        const result = await db.query(
            `UPDATE consultations 
             SET status = $1, assigned_to = COALESCE($2, assigned_to)
             WHERE id = $3
             RETURNING *`,
            [status, assignedTo, id]
        );
        return result.rows[0];
    },

    /**
     * Update consultation
     */
    async update(id, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = ['name', 'email', 'phone', 'company', 'service', 
                               'booking_date', 'booking_time', 'timezone', 'notes', 
                               'status', 'assigned_to', 'reminder_sent'];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey) && value !== undefined) {
                fields.push(`${snakeKey} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const result = await db.query(
            `UPDATE consultations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );
        return result.rows[0];
    },

    /**
     * Get available time slots for a date
     */
    async getAvailableSlots(date) {
        // Define available slots (9 AM to 5 PM, 30-minute intervals)
        const allSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
            '15:00', '15:30', '16:00', '16:30', '17:00'
        ];

        // Get booked slots for the date
        const result = await db.query(
            `SELECT booking_time FROM consultations 
             WHERE booking_date = $1 AND status != 'cancelled'`,
            [date]
        );

        const bookedSlots = result.rows.map(row => {
            // Convert time to HH:MM format
            const time = row.booking_time;
            return time.substring(0, 5);
        });

        // Filter out booked slots
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
        
        return availableSlots;
    },

    /**
     * Get upcoming consultations
     */
    async getUpcoming(limit = 5) {
        const result = await db.query(
            `SELECT * FROM consultations 
             WHERE booking_date >= CURRENT_DATE AND status != 'cancelled'
             ORDER BY booking_date ASC, booking_time ASC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    },

    /**
     * Get consultation count by status
     */
    async getCountByStatus() {
        const result = await db.query(`
            SELECT status, COUNT(*) as count
            FROM consultations
            GROUP BY status
        `);
        return result.rows;
    },

    /**
     * Get consultations needing reminders
     */
    async getNeedingReminders() {
        const result = await db.query(`
            SELECT * FROM consultations 
            WHERE booking_date = CURRENT_DATE + INTERVAL '1 day'
            AND status = 'confirmed'
            AND reminder_sent = false
        `);
        return result.rows;
    },

    /**
     * Mark reminder as sent
     */
    async markReminderSent(id) {
        await db.query(
            `UPDATE consultations SET reminder_sent = true WHERE id = $1`,
            [id]
        );
    }
};

module.exports = Consultation;
