/**
 * Contact Routes
 * Handles contact form submissions
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Visitor = require('../models/Visitor');
const { sendContactNotification, sendContactConfirmation } = require('../services/emailService');
const AuditService = require('../services/auditService');

// Validation rules
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('service').optional().trim(),
    body('company').optional().trim()
];

/**
 * POST /api/contact
 * Submit a contact form
 */
router.post('/', contactValidation, async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { name, email, company, service, message } = req.body;

        // Create or update visitor
        const visitor = await Visitor.upsert({
            email,
            name,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            source: 'contact_form'
        });

        // Create message
        const newMessage = await Message.create({
            name,
            email,
            company,
            service,
            message,
            visitorId: visitor.id
        });

        // Send email notifications (async, don't wait)
        sendContactNotification(newMessage).catch(console.error);
        sendContactConfirmation(newMessage).catch(console.error);

        res.status(201).json({
            success: true,
            message: 'Thank you for your message. We\'ll get back to you soon!',
            id: newMessage.id
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to submit message. Please try again.' 
        });
    }
});

/**
 * GET /api/contact
 * Get all messages (admin only - add auth middleware in production)
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const messages = await Message.findAll({ 
            status, 
            limit: parseInt(limit) || 50, 
            offset: parseInt(offset) || 0 
        });
        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve messages' 
        });
    }
});

/**
 * GET /api/contact/:id
 * Get a single message
 */
router.get('/:id', async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }
        
        // Get replies
        const replies = await Message.getReplies(req.params.id);
        
        res.json({ 
            success: true, 
            data: { ...message, replies } 
        });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve message' 
        });
    }
});

/**
 * PATCH /api/contact/:id/status
 * Update message status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status, assignedTo, staffId } = req.body;
        const validStatuses = ['new', 'in_progress', 'converted', 'archived'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status' 
            });
        }

        // Get the old status for audit
        const oldMessage = await Message.findById(req.params.id);
        
        const message = await Message.updateStatus(req.params.id, status, assignedTo);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }

        // Log status change
        if (staffId) {
            await AuditService.logStatusChange(staffId, 'message', req.params.id, oldMessage?.status, status, req.ip);
            
            // Log assignment if different
            if (assignedTo && assignedTo !== oldMessage?.assigned_to) {
                await AuditService.logAssignment(staffId, 'message', req.params.id, assignedTo, req.ip);
            }
        }

        res.json({ success: true, data: message });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to update status' 
        });
    }
});

/**
 * POST /api/contact/:id/reply
 * Reply to a message
 */
router.post('/:id/reply', [
    body('content').trim().notEmpty().withMessage('Reply content is required'),
    body('staffId').notEmpty().withMessage('Staff ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { content, staffId, sendEmail } = req.body;
        
        // Get original message
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ 
                success: false,
                message: 'Message not found' 
            });
        }

        // Create reply
        const reply = await Message.addReply(
            req.params.id, 
            staffId, 
            content, 
            sendEmail || false
        );

        // Send email if requested
        if (sendEmail) {
            const { sendReplyEmail } = require('../services/emailService');
            sendReplyEmail(message.email, content, message.name).catch(console.error);
        }

        // Update message status to in_progress if it's new
        if (message.status === 'new') {
            await Message.updateStatus(req.params.id, 'in_progress', staffId);
        }

        // Log the reply action
        await AuditService.logMessageReply(staffId, req.params.id, sendEmail || false, req.ip);

        res.status(201).json({ success: true, data: reply });
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send reply' 
        });
    }
});

module.exports = router;
