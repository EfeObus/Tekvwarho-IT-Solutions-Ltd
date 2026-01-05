/**
 * WebSocket Chat Handler
 * Manages real-time chat connections and messages
 */

const WebSocket = require('ws');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const { sendMissedChatResponse } = require('../services/emailService');

// Store active connections
const connections = new Map(); // sessionId -> { visitor: ws, admin: ws }
const adminConnections = new Set(); // All admin connections

/**
 * Initialize WebSocket handling
 */
const initChatHandler = (wss) => {
    wss.on('connection', (ws, req) => {
        console.log('New WebSocket connection');
        
        // Parse URL to determine connection type
        const url = new URL(req.url, `http://${req.headers.host}`);
        const type = url.searchParams.get('type') || 'visitor';
        const sessionId = url.searchParams.get('session');

        if (type === 'admin') {
            handleAdminConnection(ws);
        } else {
            handleVisitorConnection(ws, sessionId);
        }

        // Handle close
        ws.on('close', () => {
            handleDisconnect(ws, type, sessionId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('Chat WebSocket handler initialized');
};

/**
 * Handle admin connection
 */
const handleAdminConnection = (ws) => {
    adminConnections.add(ws);
    console.log('Admin connected. Total admins:', adminConnections.size);

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleAdminMessage(ws, message);
        } catch (error) {
            console.error('Admin message error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    // Send pending sessions
    sendPendingSessions(ws);
};

/**
 * Handle visitor connection
 */
const handleVisitorConnection = (ws, sessionId) => {
    ws.sessionId = sessionId;
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            await handleVisitorMessage(ws, message);
        } catch (error) {
            console.error('Visitor message error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });
};

/**
 * Handle admin messages
 */
const handleAdminMessage = async (ws, message) => {
    switch (message.type) {
        case 'join_session':
            await joinSession(ws, message.sessionId);
            break;
            
        case 'send_message':
            await sendAdminMessage(ws, message);
            break;
            
        case 'close_session':
            await closeSession(message.sessionId);
            break;
            
        case 'get_sessions':
            await sendPendingSessions(ws);
            break;
            
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
};

/**
 * Handle visitor messages
 */
const handleVisitorMessage = async (ws, message) => {
    switch (message.type) {
        case 'start_chat':
            await startChat(ws, message);
            break;
            
        case 'send_message':
            await sendVisitorMessage(ws, message);
            break;
            
        case 'typing':
            notifyTyping(ws.sessionId, 'visitor');
            break;
            
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
};

/**
 * Start a new chat session
 */
const startChat = async (ws, data) => {
    try {
        // Create or update visitor
        let visitor = await Visitor.findByEmail(data.email);
        if (!visitor) {
            visitor = await Visitor.create({
                name: data.name,
                email: data.email
            });
        } else {
            await Visitor.updateLastSeen(visitor.id);
        }

        // Create chat session
        const session = await Chat.createSession(visitor.id);
        
        ws.sessionId = session.id;
        ws.visitorId = visitor.id;

        // Store connection
        if (!connections.has(session.id)) {
            connections.set(session.id, { visitor: null, admin: null });
        }
        connections.get(session.id).visitor = ws;

        // Send session info to visitor
        ws.send(JSON.stringify({
            type: 'session_started',
            sessionId: session.id,
            message: 'Connected to support. An agent will be with you shortly.'
        }));

        // Notify all admins of new session
        broadcastToAdmins({
            type: 'new_session',
            session: {
                id: session.id,
                visitor: { name: data.name, email: data.email },
                created_at: session.created_at
            }
        });

    } catch (error) {
        console.error('Start chat error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to start chat' }));
    }
};

/**
 * Send message from visitor
 */
const sendVisitorMessage = async (ws, data) => {
    try {
        if (!ws.sessionId) {
            ws.send(JSON.stringify({ type: 'error', message: 'No active session' }));
            return;
        }

        const chatMessage = await Chat.addMessage(ws.sessionId, data.content, 'visitor');

        // Send confirmation to visitor
        ws.send(JSON.stringify({
            type: 'message_sent',
            message: chatMessage
        }));

        // Forward to admin if connected
        const sessionConn = connections.get(ws.sessionId);
        if (sessionConn && sessionConn.admin) {
            sessionConn.admin.send(JSON.stringify({
                type: 'new_message',
                sessionId: ws.sessionId,
                message: chatMessage
            }));
        }

        // Notify all admins of new message
        broadcastToAdmins({
            type: 'session_message',
            sessionId: ws.sessionId,
            preview: data.content.substring(0, 50)
        });

    } catch (error) {
        console.error('Send visitor message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
};

/**
 * Admin joins a session
 */
const joinSession = async (ws, sessionId) => {
    try {
        if (!connections.has(sessionId)) {
            connections.set(sessionId, { visitor: null, admin: null });
        }
        connections.get(sessionId).admin = ws;
        ws.currentSessionId = sessionId;

        // Get session messages
        const messages = await Chat.getMessages(sessionId);
        const session = await Chat.getSession(sessionId);

        // Mark messages as read
        await Chat.markMessagesRead(sessionId);

        ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId,
            session,
            messages
        }));

        // Notify visitor that agent joined
        const sessionConn = connections.get(sessionId);
        if (sessionConn && sessionConn.visitor) {
            sessionConn.visitor.send(JSON.stringify({
                type: 'agent_joined',
                message: 'An agent has joined the chat.'
            }));
        }

    } catch (error) {
        console.error('Join session error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to join session' }));
    }
};

/**
 * Send message from admin
 */
const sendAdminMessage = async (ws, data) => {
    try {
        const sessionId = data.sessionId || ws.currentSessionId;
        
        if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', message: 'No session selected' }));
            return;
        }

        const chatMessage = await Chat.addMessage(sessionId, data.content, 'agent');

        // Send confirmation to admin
        ws.send(JSON.stringify({
            type: 'message_sent',
            message: chatMessage
        }));

        // Forward to visitor
        const sessionConn = connections.get(sessionId);
        const visitorConnected = sessionConn && sessionConn.visitor && sessionConn.visitor.readyState === WebSocket.OPEN;
        
        if (visitorConnected) {
            sessionConn.visitor.send(JSON.stringify({
                type: 'new_message',
                message: chatMessage
            }));
        } else {
            // Visitor is disconnected - send email with full conversation
            const session = await Chat.getSession(sessionId);
            if (session && session.visitor_email) {
                const messages = await Chat.getMessages(sessionId);
                try {
                    await sendMissedChatResponse(
                        session.visitor_email,
                        session.visitor_name || 'Visitor',
                        messages,
                        sessionId
                    );
                    ws.send(JSON.stringify({
                        type: 'info',
                        message: 'Visitor is offline. Response sent to their email.'
                    }));
                } catch (emailError) {
                    console.error('Failed to send missed chat email:', emailError);
                    ws.send(JSON.stringify({
                        type: 'warning',
                        message: 'Visitor is offline. Email notification failed.'
                    }));
                }
            }
        }

    } catch (error) {
        console.error('Send admin message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
    }
};

/**
 * Close a chat session
 */
const closeSession = async (sessionId) => {
    try {
        await Chat.closeSession(sessionId);

        const sessionConn = connections.get(sessionId);
        
        // Notify visitor
        if (sessionConn && sessionConn.visitor) {
            sessionConn.visitor.send(JSON.stringify({
                type: 'session_closed',
                message: 'This chat session has been closed. Thank you for contacting us!'
            }));
        }

        // Notify admins
        broadcastToAdmins({
            type: 'session_closed',
            sessionId
        });

        connections.delete(sessionId);

    } catch (error) {
        console.error('Close session error:', error);
    }
};

/**
 * Notify typing indicator
 */
const notifyTyping = (sessionId, sender) => {
    const sessionConn = connections.get(sessionId);
    if (!sessionConn) return;

    if (sender === 'visitor' && sessionConn.admin) {
        sessionConn.admin.send(JSON.stringify({
            type: 'typing',
            sessionId,
            sender: 'visitor'
        }));
    } else if (sender === 'agent' && sessionConn.visitor) {
        sessionConn.visitor.send(JSON.stringify({
            type: 'typing',
            sender: 'agent'
        }));
    }
};

/**
 * Send pending sessions to admin
 */
const sendPendingSessions = async (ws) => {
    try {
        const sessions = await Chat.getActiveSessions();
        ws.send(JSON.stringify({
            type: 'sessions_list',
            sessions
        }));
    } catch (error) {
        console.error('Get pending sessions error:', error);
    }
};

/**
 * Broadcast message to all admins
 */
const broadcastToAdmins = (message) => {
    const data = JSON.stringify(message);
    adminConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
};

/**
 * Handle disconnect
 */
const handleDisconnect = (ws, type, sessionId) => {
    if (type === 'admin') {
        adminConnections.delete(ws);
        console.log('Admin disconnected. Total admins:', adminConnections.size);
        
        // Remove from any session
        if (ws.currentSessionId) {
            const sessionConn = connections.get(ws.currentSessionId);
            if (sessionConn) {
                sessionConn.admin = null;
            }
        }
    } else {
        // Visitor disconnected
        const sid = ws.sessionId || sessionId;
        if (sid) {
            const sessionConn = connections.get(sid);
            if (sessionConn) {
                sessionConn.visitor = null;
                
                // Notify admin
                if (sessionConn.admin) {
                    sessionConn.admin.send(JSON.stringify({
                        type: 'visitor_disconnected',
                        sessionId: sid
                    }));
                }
            }
        }
    }
};

module.exports = { initChatHandler };
