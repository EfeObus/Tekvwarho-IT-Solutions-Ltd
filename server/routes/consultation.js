/**
 * Consultation Routes
 * Handles booking/consultation management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Consultation = require('../models/Consultation');
const Visitor = require('../models/Visitor');
const { sendBookingConfirmation, sendBookingNotification } = require('../services/emailService');
const { authMiddleware, hasPermission } = require('../middleware/auth');
const db = require('../config/database');
const AuditService = require('../services/auditService');

// Validation rules
const bookingValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('booking_date').notEmpty().withMessage('Date is required'),
    body('booking_time').notEmpty().withMessage('Time is required'),
    body('phone').optional().trim(),
    body('company').optional().trim(),
    body('service').notEmpty().withMessage('Service is required'),
    body('notes').optional().trim()
];

/**
 * POST /api/consultation/book
 * Book a new consultation (public endpoint)
 */
router.post('/book', bookingValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                message: errors.array()[0].msg,
                errors: errors.array() 
            });
        }

        const { name, email, phone, company, service, booking_date, booking_time, notes } = req.body;

        // Parse time from "09:00 AM" format to "09:00:00"
        let timeForDb = booking_time;
        if (booking_time.includes('AM') || booking_time.includes('PM')) {
            const [time, period] = booking_time.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            timeForDb = `${String(hours).padStart(2, '0')}:${minutes}:00`;
        }

        // Check if slot is already booked
        const existingBooking = await db.query(
            'SELECT id FROM consultations WHERE booking_date = $1 AND booking_time = $2 AND status != $3',
            [booking_date, timeForDb, 'cancelled']
        );

        if (existingBooking.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is no longer available. Please choose another time.'
            });
        }

        // Create or update visitor
        const visitor = await Visitor.upsert({
            email,
            name,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            source: 'booking'
        });

        // Create consultation
        const consultation = await Consultation.create({
            name,
            email,
            phone,
            company,
            service,
            bookingDate: booking_date,
            bookingTime: timeForDb,
            timezone: 'America/Toronto',
            notes,
            visitorId: visitor.id
        });

        // Send email notifications (async - don't wait)
        sendBookingConfirmation(consultation).catch(err => console.error('Email error:', err));
        sendBookingNotification(consultation).catch(err => console.error('Email error:', err));

        res.status(201).json({
            success: true,
            message: 'Consultation booked successfully! Check your email for confirmation.',
            data: consultation
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to book consultation. Please try again.' 
        });
    }
});

/**
 * POST /api/consultations
 * Book a new consultation (alias for /book)
 */
router.post('/', bookingValidation, async (req, res) => {
    // Forward to /book handler logic
    req.url = '/book';
    router.handle(req, res, () => {});
});

/**
 * GET /api/consultation/slots
 * Get available time slots for a date
 */
router.get('/slots', async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required'
            });
        }

        // Check if date is in the past or a weekend
        const selectedDate = new Date(date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return res.json({ success: true, data: [], bookedSlots: [] });
        }

        const dayOfWeek = selectedDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return res.json({ success: true, data: [], bookedSlots: [] });
        }

        // Get booked slots for this date
        const bookedResult = await db.query(
            `SELECT booking_time FROM consultations 
             WHERE booking_date = $1 AND status != 'cancelled'`,
            [date]
        );

        // Convert database times to display format
        const bookedSlots = bookedResult.rows.map(row => {
            const time = row.booking_time;
            if (typeof time === 'string' && time.includes(':')) {
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours);
                const period = hours >= 12 ? 'PM' : 'AM';
                if (hours > 12) hours -= 12;
                if (hours === 0) hours = 12;
                return `${String(hours).padStart(2, '0')}:${minutes.substring(0, 2)} ${period}`;
            }
            return time;
        });

        res.json({ success: true, data: [], bookedSlots });
    } catch (error) {
        console.error('Get slots error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve available slots' 
        });
    }
});

/**
 * GET /api/consultations
 * Get all consultations (admin)
 */
router.get('/', async (req, res) => {
    try {
        const { status, startDate, endDate, limit, offset } = req.query;
        const consultations = await Consultation.findAll({ 
            status, 
            startDate,
            endDate,
            limit: parseInt(limit) || 50, 
            offset: parseInt(offset) || 0 
        });
        res.json({ success: true, data: consultations });
    } catch (error) {
        console.error('Get consultations error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve consultations' 
        });
    }
});

/**
 * GET /api/consultations/upcoming
 * Get upcoming consultations
 */
router.get('/upcoming', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const consultations = await Consultation.getUpcoming(limit);
        res.json({ success: true, data: consultations });
    } catch (error) {
        console.error('Get upcoming error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve upcoming consultations' 
        });
    }
});

/**
 * GET /api/consultations/:id
 * Get a single consultation
 */
router.get('/:id', async (req, res) => {
    try {
        const consultation = await Consultation.findById(req.params.id);
        if (!consultation) {
            return res.status(404).json({ 
                success: false,
                message: 'Consultation not found' 
            });
        }
        res.json({ success: true, data: consultation });
    } catch (error) {
        console.error('Get consultation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve consultation' 
        });
    }
});

/**
 * PATCH /api/consultations/:id
 * Update a consultation
 */
router.patch('/:id', async (req, res) => {
    try {
        const consultation = await Consultation.update(req.params.id, req.body);
        if (!consultation) {
            return res.status(404).json({ 
                success: false,
                message: 'Consultation not found' 
            });
        }
        
        // Log update if staffId is provided
        if (req.body.staffId) {
            await AuditService.log({
                staffId: req.body.staffId,
                action: 'consultation_updated',
                entityType: 'consultation',
                entityId: req.params.id,
                details: { updates: Object.keys(req.body) },
                ipAddress: req.ip
            });
        }
        
        res.json({ success: true, data: consultation });
    } catch (error) {
        console.error('Update consultation error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update consultation' 
        });
    }
});

/**
 * PATCH /api/consultations/:id/status
 * Update consultation status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, assignedTo, staffId } = req.body;
        const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status' 
            });
        }

        // Get old consultation for audit
        const oldConsultation = await Consultation.findById(req.params.id);
        
        const consultation = await Consultation.updateStatus(req.params.id, status, assignedTo);
        if (!consultation) {
            return res.status(404).json({ 
                success: false,
                message: 'Consultation not found' 
            });
        }

        // Log status change
        if (staffId) {
            await AuditService.logStatusChange(staffId, 'consultation', req.params.id, oldConsultation?.status, status, req.ip);
            
            // Log assignment if different
            if (assignedTo && assignedTo !== oldConsultation?.assigned_to) {
                await AuditService.logAssignment(staffId, 'consultation', req.params.id, assignedTo, req.ip);
            }
        }

        res.json({ success: true, data: consultation });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update status' 
        });
    }
});

module.exports = router;
