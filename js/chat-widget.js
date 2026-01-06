/**
 * Live Chat Widget
 * Provides real-time chat functionality for website visitors
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        wsUrl: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chat`,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5
    };

    // State
    let ws = null;
    let sessionId = null;
    let isOpen = false;
    let isConnected = false;
    let reconnectAttempts = 0;
    let visitorInfo = null;

    // Create chat widget HTML
    const createWidget = () => {
        const widget = document.createElement('div');
        widget.id = 'chat-widget';
        widget.innerHTML = `
            <button class="chat-toggle" id="chat-toggle" aria-label="Open chat">
                <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span class="unread-badge" id="unread-badge">0</span>
            </button>
            
            <div class="chat-container" id="chat-container">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <h3>Chat with Us</h3>
                        <span class="chat-status" id="chat-status">Connecting...</span>
                    </div>
                    <button class="chat-minimize" id="chat-minimize" aria-label="Minimize chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                
                <div class="chat-body" id="chat-body">
                    <!-- Start form (shown initially) -->
                    <div class="chat-start-form" id="chat-start-form">
                        <h4>Start a Conversation</h4>
                        <p>Enter your details to begin chatting with our team.</p>
                        <form id="chat-init-form">
                            <div class="form-group">
                                <label for="chat-name">Name</label>
                                <input type="text" id="chat-name" name="name" required placeholder="Your name">
                            </div>
                            <div class="form-group">
                                <label for="chat-email">Email</label>
                                <input type="email" id="chat-email" name="email" required placeholder="your@email.com">
                            </div>
                            <button type="submit" class="btn-primary">Start Chat</button>
                        </form>
                    </div>
                    
                    <!-- Messages (shown after starting chat) -->
                    <div class="chat-messages" id="chat-messages" style="display: none;">
                        <div class="message system">
                            <p>Welcome! An agent will be with you shortly.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Input area (shown after starting chat) -->
                <div class="chat-footer" id="chat-footer" style="display: none;">
                    <form id="chat-message-form">
                        <input type="text" id="chat-input" placeholder="Type your message..." autocomplete="off">
                        <button type="submit" aria-label="Send message">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </form>
                    <div class="typing-indicator" id="typing-indicator">Agent is typing...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(widget);
    };

    // Inject CSS
    const injectStyles = () => {
        const styles = document.createElement('style');
        styles.textContent = `
            #chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            .chat-toggle {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0066CC, #0052a3);
                border: none;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0, 102, 204, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.3s, box-shadow 0.3s;
                position: relative;
            }
            
            .chat-toggle:hover {
                transform: scale(1.05);
                box-shadow: 0 6px 20px rgba(0, 102, 204, 0.5);
            }
            
            .chat-toggle svg {
                width: 28px;
                height: 28px;
                color: white;
            }
            
            .unread-badge {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #e74c3c;
                color: white;
                border-radius: 50%;
                width: 22px;
                height: 22px;
                font-size: 12px;
                font-weight: bold;
                display: none;
                align-items: center;
                justify-content: center;
            }
            
            .unread-badge.show {
                display: flex;
            }
            
            .chat-container {
                position: absolute;
                bottom: 75px;
                right: 0;
                width: 360px;
                height: 500px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            }
            
            .chat-container.open {
                display: flex;
                animation: slideUp 0.3s ease;
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .chat-header {
                background: linear-gradient(135deg, #0066CC, #0052a3);
                color: white;
                padding: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .chat-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }
            
            .chat-status {
                font-size: 12px;
                opacity: 0.9;
            }
            
            .chat-status.connected {
                color: #2ecc71;
            }
            
            .chat-minimize {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .chat-minimize svg {
                width: 18px;
                height: 18px;
                color: white;
            }
            
            .chat-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                background: #f8f9fa;
            }
            
            .chat-start-form {
                text-align: center;
                padding: 20px 0;
            }
            
            .chat-start-form h4 {
                margin: 0 0 8px 0;
                color: #333;
            }
            
            .chat-start-form p {
                margin: 0 0 20px 0;
                color: #666;
                font-size: 14px;
            }
            
            .chat-start-form .form-group {
                margin-bottom: 16px;
                text-align: left;
            }
            
            .chat-start-form label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            
            .chat-start-form input {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.3s;
                box-sizing: border-box;
            }
            
            .chat-start-form input:focus {
                outline: none;
                border-color: #0066CC;
            }
            
            .chat-start-form .btn-primary {
                width: 100%;
                padding: 12px;
                background: #0066CC;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .chat-start-form .btn-primary:hover {
                background: #0052a3;
            }
            
            .chat-messages {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .message {
                max-width: 85%;
                padding: 12px 16px;
                border-radius: 16px;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .message.visitor {
                background: #0066CC;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
            }
            
            .message.agent {
                background: white;
                color: #333;
                align-self: flex-start;
                border-bottom-left-radius: 4px;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .message.system {
                background: transparent;
                color: #666;
                font-size: 12px;
                text-align: center;
                align-self: center;
                padding: 8px;
            }
            
            .message-time {
                font-size: 10px;
                opacity: 0.7;
                margin-top: 4px;
                display: block;
            }
            
            .chat-footer {
                padding: 12px;
                background: white;
                border-top: 1px solid #eee;
            }
            
            .chat-footer form {
                display: flex;
                gap: 8px;
            }
            
            .chat-footer input {
                flex: 1;
                padding: 12px 16px;
                border: 1px solid #ddd;
                border-radius: 24px;
                font-size: 14px;
                outline: none;
            }
            
            .chat-footer input:focus {
                border-color: #0066CC;
            }
            
            .chat-footer button {
                width: 44px;
                height: 44px;
                background: #0066CC;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
            }
            
            .chat-footer button:hover {
                background: #0052a3;
            }
            
            .chat-footer button svg {
                width: 20px;
                height: 20px;
            }
            
            .typing-indicator {
                font-size: 12px;
                color: #666;
                font-style: italic;
                padding: 4px 0 0 16px;
                display: none;
            }
            
            .typing-indicator.show {
                display: block;
            }
            
            @media (max-width: 480px) {
                .chat-container {
                    width: calc(100vw - 40px);
                    height: calc(100vh - 120px);
                    bottom: 75px;
                }
            }
        `;
        document.head.appendChild(styles);
    };

    // Connect to WebSocket
    const connect = () => {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        const url = sessionId 
            ? `${config.wsUrl}?type=visitor&session=${sessionId}`
            : `${config.wsUrl}?type=visitor`;

        ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('Chat connected');
            isConnected = true;
            reconnectAttempts = 0;
            updateStatus('Online', true);
        };

        ws.onclose = () => {
            console.log('Chat disconnected');
            isConnected = false;
            updateStatus('Reconnecting...', false);
            
            if (reconnectAttempts < config.maxReconnectAttempts) {
                reconnectAttempts++;
                setTimeout(connect, config.reconnectDelay);
            } else {
                updateStatus('Offline', false);
            }
        };

        ws.onerror = (error) => {
            console.error('Chat error:', error);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (error) {
                console.error('Message parse error:', error);
            }
        };
    };

    // Handle incoming messages
    const handleMessage = (data) => {
        switch (data.type) {
            case 'session_started':
                sessionId = data.sessionId;
                sessionStorage.setItem('chat_session', sessionId);
                addSystemMessage(data.message);
                break;
                
            case 'new_message':
            case 'message_sent':
                if (data.message && data.message.sender_type !== 'visitor') {
                    addMessage(data.message.content, 'agent', data.message.created_at);
                    if (!isOpen) {
                        incrementUnread();
                    }
                }
                break;
                
            case 'agent_joined':
                addSystemMessage(data.message);
                break;
                
            case 'typing':
                showTyping();
                break;
                
            case 'session_closed':
                addSystemMessage(data.message);
                sessionId = null;
                sessionStorage.removeItem('chat_session');
                break;
                
            case 'error':
                console.error('Server error:', data.message);
                break;
        }
    };

    // Update connection status
    const updateStatus = (text, connected) => {
        const status = document.getElementById('chat-status');
        if (status) {
            status.textContent = text;
            status.classList.toggle('connected', connected);
        }
    };

    // Toggle chat window
    const toggleChat = () => {
        isOpen = !isOpen;
        const container = document.getElementById('chat-container');
        const chatIcon = document.querySelector('.chat-icon');
        const closeIcon = document.querySelector('.close-icon');
        
        container.classList.toggle('open', isOpen);
        chatIcon.style.display = isOpen ? 'none' : 'block';
        closeIcon.style.display = isOpen ? 'block' : 'none';
        
        if (isOpen) {
            resetUnread();
            if (!isConnected) {
                connect();
            }
        }
    };

    // Start chat session
    const startChat = (name, email) => {
        visitorInfo = { name, email };
        
        // Send start message
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'start_chat',
                name,
                email
            }));
            
            // Show messages area
            document.getElementById('chat-start-form').style.display = 'none';
            document.getElementById('chat-messages').style.display = 'flex';
            document.getElementById('chat-footer').style.display = 'block';
            
            // Focus input
            document.getElementById('chat-input').focus();
        }
    };

    // Send message
    const sendMessage = (content) => {
        if (!content.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

        ws.send(JSON.stringify({
            type: 'send_message',
            content: content.trim()
        }));

        addMessage(content.trim(), 'visitor');
        document.getElementById('chat-input').value = '';
    };

    // Add message to chat
    const addMessage = (content, type, timestamp) => {
        const messages = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        msg.innerHTML = `
            <p>${escapeHtml(content)}</p>
            <span class="message-time">${timeStr}</span>
        `;
        
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    };

    // Add system message
    const addSystemMessage = (content) => {
        const messages = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.className = 'message system';
        msg.innerHTML = `<p>${escapeHtml(content)}</p>`;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    };

    // Show typing indicator
    const showTyping = () => {
        const indicator = document.getElementById('typing-indicator');
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    };

    // Unread badge management
    let unreadCount = 0;
    
    const incrementUnread = () => {
        unreadCount++;
        updateUnreadBadge();
    };

    const resetUnread = () => {
        unreadCount = 0;
        updateUnreadBadge();
    };

    const updateUnreadBadge = () => {
        const badge = document.getElementById('unread-badge');
        if (badge) {
            badge.textContent = unreadCount;
            badge.classList.toggle('show', unreadCount > 0);
        }
    };

    // Escape HTML
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Initialize widget
    const init = () => {
        injectStyles();
        createWidget();
        
        // Check for existing session
        sessionId = sessionStorage.getItem('chat_session');
        
        // Event listeners
        document.getElementById('chat-toggle').addEventListener('click', toggleChat);
        document.getElementById('chat-minimize').addEventListener('click', toggleChat);
        
        document.getElementById('chat-init-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('chat-name').value;
            const email = document.getElementById('chat-email').value;
            startChat(name, email);
        });
        
        document.getElementById('chat-message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            sendMessage(document.getElementById('chat-input').value);
        });
        
        // Send typing indicator
        let typingTimeout;
        document.getElementById('chat-input').addEventListener('input', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    ws.send(JSON.stringify({ type: 'typing' }));
                }, 300);
            }
        });
        
        // Connect when toggle is clicked (lazy connection)
        console.log('Chat widget initialized');
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
