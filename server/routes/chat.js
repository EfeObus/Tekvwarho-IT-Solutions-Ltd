/**
 * Chat Routes
 * Handles chat session management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const AuditService = require('../services/auditService');

/**
 * POST /api/chat/start
 * Start a new chat session
 */
router.post('/start', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { name, email } = req.body;

        // Create or update visitor
        const visitor = await Visitor.upsert({
            email,
            name,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            source: 'chat'
        });

        // Create chat session
        const session = await Chat.createSession({
            visitorId: visitor.id,
            visitorName: name,
            visitorEmail: email
        });

        // Add welcome message
        await Chat.addMessage({
            sessionId: session.id,
            senderType: 'staff',
            senderId: null,
            content: `Hi ${name}! Thanks for reaching out. How can we help you today?`
        });

        res.status(201).json({
            success: true,
            data: {
                sessionId: session.id,
                visitorId: visitor.id
            }
        });
    } catch (error) {
        console.error('Start chat error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to start chat' 
        });
    }
});

/**
 * GET /api/chat/sessions
 * Get all chat sessions (admin)
 */
router.get('/sessions', async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const sessions = await Chat.getAllSessions({ 
            status, 
            limit: parseInt(limit) || 50, 
            offset: parseInt(offset) || 0 
        });
        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve sessions' 
        });
    }
});

/**
 * GET /api/chat/sessions/:id
 * Get a single chat session with messages
 */
router.get('/sessions/:id', async (req, res) => {
    try {
        const session = await Chat.getSession(req.params.id);
        if (!session) {
            return res.status(404).json({ 
                success: false,
                message: 'Session not found' 
            });
        }

        const messages = await Chat.getMessages(req.params.id);
        
        res.json({ 
            success: true, 
            data: { ...session, messages } 
        });
    } catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve session' 
        });
    }
});

/**
 * GET /api/chat/sessions/:id/messages
 * Get messages for a session
 */
router.get('/sessions/:id/messages', async (req, res) => {
    try {
        const messages = await Chat.getMessages(req.params.id);
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
 * POST /api/chat/sessions/:id/messages
 * Add a message to a session (HTTP fallback)
 */
router.post('/sessions/:id/messages', [
    body('content').trim().notEmpty().withMessage('Message content is required'),
    body('senderType').isIn(['visitor', 'staff']).withMessage('Invalid sender type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { content, senderType, senderId } = req.body;
        
        const message = await Chat.addMessage({
            sessionId: req.params.id,
            senderType,
            senderId: senderType === 'staff' ? senderId : null,
            content
        });

        // Log staff responses
        if (senderType === 'staff' && senderId) {
            await AuditService.logChatResponse(senderId, req.params.id, req.ip);
        }

        res.status(201).json({ success: true, data: message });
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to send message' 
        });
    }
});

/**
 * PATCH /api/chat/sessions/:id/close
 * Close a chat session
 */
router.patch('/sessions/:id/close', async (req, res) => {
    try {
        const { staffId } = req.body;
        const session = await Chat.closeSession(req.params.id);
        if (!session) {
            return res.status(404).json({ 
                success: false,
                message: 'Session not found' 
            });
        }
        
        // Log session closure
        if (staffId) {
            await AuditService.logStatusChange(staffId, 'chat', req.params.id, 'active', 'closed', req.ip);
        }
        
        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Close session error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to close session' 
        });
    }
});

/**
 * GET /api/chat/unread-count
 * Get unread message count
 */
router.get('/unread-count', async (req, res) => {
    try {
        const count = await Chat.getUnreadCount();
        res.json({ success: true, data: { count } });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get unread count' 
        });
    }
});

module.exports = router;
