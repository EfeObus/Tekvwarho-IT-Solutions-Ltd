/**
 * WebSocket Chat Handler
 * Manages real-time chat connections and messages
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const Visitor = require('../models/Visitor');
const Staff = require('../models/Staff');
const db = require('../config/database');
const { sendMissedChatResponse } = require('../services/emailService');

// Store active connections
const connections = new Map(); // sessionId -> { visitor: ws, admin: ws, staffId: number }
const adminConnections = new Map(); // ws -> { staffId, staffName, role }
const sessionAssignments = new Map(); // sessionId -> { staffId, staffName, assignedAt }

/**
 * Get chat settings from database
 */
const getChatSettings = async () => {
    try {
        const result = await db.query(
            `SELECT setting_key, setting_value, setting_type FROM system_settings
             WHERE setting_key IN ('chat_auto_reply_enabled', 'chat_auto_reply')`
        );

        const settings = {};
        result.rows.forEach(row => {
            let value = row.setting_value;
            if (row.setting_type === 'boolean') {
                value = row.setting_value === 'true';
            }
            settings[row.setting_key] = value;
        });

        return settings;
    } catch (error) {
        console.error('Failed to get chat settings:', error);
        return {
            chat_auto_reply_enabled: true,
            chat_auto_reply: 'Thank you for your message! One of our team members will be with you shortly.'
        };
    }
};

/**
 * Send auto-reply message to visitor
 */
const sendAutoReply = async (ws, sessionId) => {
    try {
        const settings = await getChatSettings();

        if (!settings.chat_auto_reply_enabled) {
            return;
        }

        // Store auto-reply as a system message
        const autoReplyMessage = await Chat.addMessage({
            sessionId: sessionId,
            senderType: 'staff',
            senderId: null, // null means system message
            content: settings.chat_auto_reply
        });

        // Send to visitor
        ws.send(JSON.stringify({
            type: 'message',
            message: {
                ...autoReplyMessage,
                sender_name: 'Support Team'
            }
        }));
    } catch (error) {
        console.error('Failed to send auto-reply:', error);
    }
};

/**
 * Get list of online staff IDs
 */
const getOnlineStaffIds = () => {
    const onlineIds = [];
    for (const [ws, staffInfo] of adminConnections) {
        if (staffInfo.staffId && ws.readyState === WebSocket.OPEN) {
            onlineIds.push(staffInfo.staffId);
        }
    }
    return onlineIds;
};

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
    // Initialize with no staff info - must authenticate first
    adminConnections.set(ws, { staffId: null, staffName: null, role: null });
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

    // Send pending sessions (will work for all admins)
    sendPendingSessions(ws);
};

/**
 * Handle visitor connection
 */
const handleVisitorConnection = async (ws, sessionId) => {
    ws.sessionId = sessionId;

    // If visitor has an existing session, restore it
    if (sessionId) {
        await restoreVisitorSession(ws, sessionId);
    }

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
 * Restore visitor session on reconnection
 */
const restoreVisitorSession = async (ws, sessionId) => {
    try {
        // Check if session exists in database
        const session = await Chat.getSession(sessionId);

        if (!session || session.status !== 'active') {
            // Session doesn't exist or is closed
            ws.send(JSON.stringify({
                type: 'session_expired',
                message: 'Your previous session has ended. Please start a new chat.'
            }));
            ws.sessionId = null;
            return;
        }

        // Re-add visitor to connections map
        if (!connections.has(sessionId)) {
            connections.set(sessionId, { visitor: null, admin: null, staffId: null });
        }
        connections.get(sessionId).visitor = ws;

        // Load previous messages
        const messages = await Chat.getMessages(sessionId);

        // Get assignment info
        const assignment = sessionAssignments.get(sessionId);

        // Notify visitor that session is restored
        ws.send(JSON.stringify({
            type: 'session_restored',
            sessionId: sessionId,
            visitorName: session.visitor_name,
            messages: messages || [],
            assignedTo: assignment?.staffName || null,
            message: 'Your chat session has been restored.'
        }));

        console.log(`Visitor session ${sessionId} restored`);

    } catch (error) {
        console.error('Restore session error:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to restore session'
        }));
    }
};

/**
 * Handle admin messages
 */
const handleAdminMessage = async (ws, message) => {
    switch (message.type) {
        case 'authenticate':
            // Set staff identity for this connection
            await authenticateStaff(ws, message);
            break;

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

        case 'transfer_session':
            await transferSession(ws, message);
            break;

        case 'release_session':
            await releaseSession(ws, message.sessionId);
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
        // Create or update visitor using upsert
        const visitor = await Visitor.upsert({
            name: data.name,
            email: data.email,
            source: 'chat'
        });

        // Create chat session
        const session = await Chat.createSession({
            visitorId: visitor.id,
            visitorName: data.name,
            visitorEmail: data.email
        });

        ws.sessionId = session.id;
        ws.visitorId = visitor.id;

        // Store connection
        if (!connections.has(session.id)) {
            connections.set(session.id, { visitor: null, admin: null, staffId: null });
        }
        connections.get(session.id).visitor = ws;

        // Auto-assign to available staff (prefer online staff)
        let assignedStaff = null;
        const onlineStaffIds = getOnlineStaffIds();

        if (onlineStaffIds.length > 0) {
            // Try to assign to an online staff member first
            assignedStaff = await Staff.getNextAvailableForChats(onlineStaffIds);
        }

        if (!assignedStaff) {
            // Fall back to any available staff with chat permission
            assignedStaff = await Staff.getNextAvailableForChats();
        }

        // If still no staff available, assign to admin
        if (!assignedStaff) {
            // Find an admin user
            const adminUser = await Staff.findAdminForFallback();
            if (adminUser) {
                assignedStaff = adminUser;
                console.log(`No staff available, falling back to admin: ${adminUser.name}`);
            }
        }

        if (assignedStaff) {
            // Assign session in database
            await Chat.assignSession(session.id, assignedStaff.id);

            // Track assignment in memory
            sessionAssignments.set(session.id, {
                staffId: assignedStaff.id,
                staffName: assignedStaff.name,
                assignedAt: new Date()
            });

            connections.get(session.id).staffId = assignedStaff.id;

            console.log(`Chat ${session.id} auto-assigned to ${assignedStaff.name}`);

            // Notify the assigned staff specifically
            for (const [adminWs, staffInfo] of adminConnections) {
                if (staffInfo.staffId === assignedStaff.id && adminWs.readyState === WebSocket.OPEN) {
                    adminWs.send(JSON.stringify({
                        type: 'chat_assigned',
                        session: {
                            id: session.id,
                            visitor: { name: data.name, email: data.email },
                            created_at: session.created_at,
                            assigned_to: assignedStaff.id,
                            assigned_to_name: assignedStaff.name
                        },
                        message: 'A new chat has been assigned to you'
                    }));
                }
            }

            // Update session info for visitor
            ws.send(JSON.stringify({
                type: 'session_started',
                sessionId: session.id,
                assignedTo: assignedStaff.name,
                message: `Connected to support. ${assignedStaff.name} will be with you shortly.`
            }));

            // Send auto-reply
            await sendAutoReply(ws, session.id);
        } else {
            // No staff available - inform visitor
            ws.send(JSON.stringify({
                type: 'session_started',
                sessionId: session.id,
                message: 'Connected to support. An agent will be with you shortly.'
            }));

            // Send auto-reply
            await sendAutoReply(ws, session.id);
        }

        // Always notify ALL admins/managers of new session (so they have a copy for records)
        broadcastToAdmins({
            type: 'new_session',
            session: {
                id: session.id,
                visitor: { name: data.name, email: data.email },
                created_at: session.created_at,
                assigned_to: assignedStaff?.id || null,
                assigned_to_name: assignedStaff?.name || null
            }
        });

        // Send special admin notification for record keeping
        for (const [adminWs, staffInfo] of adminConnections) {
            if (staffInfo.role === 'admin' && adminWs.readyState === WebSocket.OPEN) {
                // Admin always gets notified for records
                adminWs.send(JSON.stringify({
                    type: 'admin_chat_notification',
                    session: {
                        id: session.id,
                        visitor: { name: data.name, email: data.email },
                        created_at: session.created_at,
                        assigned_to: assignedStaff?.id || null,
                        assigned_to_name: assignedStaff?.name || 'Unassigned'
                    },
                    message: assignedStaff
                        ? `New chat from ${data.name} assigned to ${assignedStaff.name}`
                        : `New chat from ${data.name} - NO STAFF AVAILABLE`
                }));
            }
        }

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

        const chatMessage = await Chat.addMessage({
            sessionId: ws.sessionId,
            senderType: 'visitor',
            senderId: null,
            content: data.content
        });

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
 * Authenticate staff connection
 * Verifies the same JWT access token issued at login (server/services/tokenManager.js) -
 * never trusts client-supplied staffId/staffName/role directly.
 */
const authenticateStaff = async (ws, data) => {
    const { token } = data;

    if (!token) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication token required' }));
        return;
    }

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured - refusing WebSocket authentication');
        ws.send(JSON.stringify({ type: 'error', message: 'Server misconfiguration' }));
        return;
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
        return;
    }

    const staffId = decoded.id;
    const staffName = decoded.name || decoded.email;
    const role = decoded.role;

    adminConnections.set(ws, { staffId, staffName, role });
    console.log(`Staff authenticated: ${staffName} (ID: ${staffId})`);

    ws.send(JSON.stringify({
        type: 'authenticated',
        message: 'Successfully authenticated'
    }));
};

/**
 * Admin joins a session (claim/lock system)
 */
const joinSession = async (ws, sessionId) => {
    try {
        const staffInfo = adminConnections.get(ws);
        const staffId = staffInfo?.staffId;
        const staffName = staffInfo?.staffName;
        const role = staffInfo?.role;

        // Check if session is already assigned to another staff
        const existingAssignment = sessionAssignments.get(sessionId);

        if (existingAssignment && existingAssignment.staffId !== staffId) {
            // Admin can view any session, staff cannot
            if (role !== 'admin') {
                ws.send(JSON.stringify({
                    type: 'session_locked',
                    sessionId,
                    assignedTo: existingAssignment.staffName,
                    message: `This chat is being handled by ${existingAssignment.staffName}. Request a transfer if needed.`
                }));
                return;
            }
            // Admin can still view but gets a warning
            ws.send(JSON.stringify({
                type: 'info',
                message: `Note: This chat is assigned to ${existingAssignment.staffName}`
            }));
        }

        if (!connections.has(sessionId)) {
            connections.set(sessionId, { visitor: null, admin: null, staffId: null });
        }

        const sessionConn = connections.get(sessionId);
        sessionConn.admin = ws;
        sessionConn.staffId = staffId;
        ws.currentSessionId = sessionId;

        // Assign session to staff if not already assigned
        if (!existingAssignment && staffId) {
            sessionAssignments.set(sessionId, {
                staffId,
                staffName: staffName || 'Staff',
                assignedAt: new Date()
            });

            // Update database
            await Chat.assignSession(sessionId, staffId);

            // Notify all admins that session is now claimed
            broadcastToAdmins({
                type: 'session_claimed',
                sessionId,
                staffId,
                staffName: staffName || 'Staff'
            });
        }

        // Get session messages
        const messages = await Chat.getMessages(sessionId);
        const session = await Chat.getSession(sessionId);

        // Mark messages as read
        await Chat.markMessagesAsRead(sessionId, 'visitor');

        ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId,
            session,
            messages,
            assignedTo: existingAssignment || { staffId, staffName }
        }));

        // Notify visitor that agent joined (only if first time)
        if (!existingAssignment && sessionConn.visitor) {
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
 * Transfer session to another staff
 */
const transferSession = async (ws, data) => {
    try {
        const { sessionId, toStaffId, toStaffName } = data;
        const fromStaffInfo = adminConnections.get(ws);

        if (!fromStaffInfo?.staffId) {
            ws.send(JSON.stringify({ type: 'error', message: 'You must be authenticated to transfer' }));
            return;
        }

        const existingAssignment = sessionAssignments.get(sessionId);

        // Only the assigned staff or admin can transfer
        if (existingAssignment && existingAssignment.staffId !== fromStaffInfo.staffId && fromStaffInfo.role !== 'admin') {
            ws.send(JSON.stringify({ type: 'error', message: 'Only the assigned staff or admin can transfer this chat' }));
            return;
        }

        // Update assignment
        sessionAssignments.set(sessionId, {
            staffId: toStaffId,
            staffName: toStaffName || 'Staff',
            assignedAt: new Date()
        });

        // Update database
        await Chat.assignSession(sessionId, toStaffId);

        // Clear current connection's session
        const sessionConn = connections.get(sessionId);
        if (sessionConn) {
            sessionConn.admin = null;
            sessionConn.staffId = toStaffId;
        }

        // Notify all admins about transfer
        broadcastToAdmins({
            type: 'session_transferred',
            sessionId,
            fromStaffId: fromStaffInfo.staffId,
            fromStaffName: fromStaffInfo.staffName,
            toStaffId,
            toStaffName
        });

        ws.send(JSON.stringify({
            type: 'transfer_success',
            sessionId,
            message: `Chat transferred to ${toStaffName}`
        }));

    } catch (error) {
        console.error('Transfer session error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to transfer session' }));
    }
};

/**
 * Release session (unassign from self)
 */
const releaseSession = async (ws, sessionId) => {
    try {
        const staffInfo = adminConnections.get(ws);
        const existingAssignment = sessionAssignments.get(sessionId);

        if (!existingAssignment || existingAssignment.staffId !== staffInfo?.staffId) {
            ws.send(JSON.stringify({ type: 'error', message: 'You are not assigned to this session' }));
            return;
        }

        // Remove assignment
        sessionAssignments.delete(sessionId);

        // Update database
        await Chat.assignSession(sessionId, null);

        // Clear connection
        const sessionConn = connections.get(sessionId);
        if (sessionConn) {
            sessionConn.admin = null;
            sessionConn.staffId = null;
        }

        // Notify all admins
        broadcastToAdmins({
            type: 'session_released',
            sessionId,
            staffId: staffInfo.staffId,
            staffName: staffInfo.staffName
        });

        ws.send(JSON.stringify({
            type: 'release_success',
            sessionId,
            message: 'Chat released and available for other staff'
        }));

    } catch (error) {
        console.error('Release session error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to release session' }));
    }
};

/**
 * Send message from admin
 */
const sendAdminMessage = async (ws, data) => {
    try {
        const sessionId = data.sessionId || ws.currentSessionId;
        const staffInfo = adminConnections.get(ws);
        const staffId = staffInfo?.staffId || null;

        if (!sessionId) {
            ws.send(JSON.stringify({ type: 'error', message: 'No session selected' }));
            return;
        }

        // Verify staff is assigned to this session (unless admin)
        const assignment = sessionAssignments.get(sessionId);
        if (assignment && assignment.staffId !== staffId && staffInfo?.role !== 'admin') {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'You are not assigned to this chat'
            }));
            return;
        }

        const chatMessage = await Chat.addMessage({
            sessionId,
            senderType: 'staff',
            senderId: staffId,
            content: data.content
        });

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
    if (!sessionConn) {
        return;
    }

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
        const sessions = await Chat.getAllSessions({ status: 'active' });
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
    for (const [ws] of adminConnections) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    }
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
