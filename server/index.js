/**
 * Tekvwarho IT Solutions - Main Server
 * Express.js backend with WebSocket support
 * 
 * Security Features:
 * - JWT access tokens (15 min) + refresh tokens (7 days)
 * - Rate limiting on all endpoints
 * - Input sanitization & XSS protection
 * - Security headers (CSP, HSTS, etc.)
 * - Request ID tracking for observability
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

// Import routes
const contactRoutes = require('./routes/contact');
const chatRoutes = require('./routes/chat');
const consultationRoutes = require('./routes/consultation');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const notesTagsRoutes = require('./routes/notes-tags');
const auditExportRoutes = require('./routes/audit-export');
const performanceRoutes = require('./routes/performance');
const newsletterRoutes = require('./routes/newsletter');
const messagesRoutes = require('./routes/messages');
const savedRepliesRoutes = require('./routes/savedReplies');

// Import middleware
const { securityHeaders, corsOptions, botProtection } = require('./middleware/securityHeaders');
const { requestId, errorHandler, notFoundHandler, Logger } = require('./middleware/errorHandler');
const { sanitizeRequest } = require('./middleware/sanitizer');
const { 
    contactFormLimiter, 
    newsletterLimiter, 
    bookingLimiter,
    loginLimiter,
    authenticatedApiLimiter,
    publicApiLimiter
} = require('./middleware/rateLimiter');

// Import WebSocket handler
const { initChatHandler } = require('./websocket/chatHandler');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws/chat' });

// ======================
// GLOBAL MIDDLEWARE
// ======================

// Request ID for tracing
app.use(requestId);

// Security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(Logger.requestLogger);

// Bot protection
app.use(botProtection);

// Input sanitization
app.use(sanitizeRequest);

// Serve static files from project root (for HTML, CSS, JS files)
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/users', express.static(path.join(__dirname, '../users')));

// ======================
// API ROUTES WITH RATE LIMITING
// ======================

// Public routes with rate limiting
// Note: contactFormLimiter only applies to POST /api/contact (root) - not replies or other actions
app.use('/api/contact', (req, res, next) => {
    // Only rate limit the public contact form submission (POST to root)
    // Don't rate limit staff/admin actions like replies, status updates, etc.
    if (req.method === 'POST' && req.path === '/') {
        return contactFormLimiter(req, res, next);
    }
    next();
}, contactRoutes);
app.use('/api/newsletter', newsletterLimiter, newsletterRoutes);
app.use('/api/consultation', bookingLimiter, consultationRoutes);
app.use('/api/consultations', consultationRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Auth routes (login has its own rate limiting in admin.js)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/messages', messagesRoutes);
app.use('/api/admin', savedRepliesRoutes);

// Authenticated API routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', notesTagsRoutes);
app.use('/api/audit', auditExportRoutes);
app.use('/api/export', auditExportRoutes);
app.use('/api/performance', performanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Favicon (redirect .ico requests to .svg)
app.get('/favicon.ico', (req, res) => {
    res.redirect(301, '/favicon.svg');
});

// WebSocket connection handling
initChatHandler(wss);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Catch-all for frontend routes (HTML files at root level)
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, '..', req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, '../404.html'));
        }
    });
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler for API routes
app.use('/api/*', notFoundHandler);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5500;

server.listen(PORT, () => {
    console.log(`\n🚀 Tekvwarho IT Solutions Server Started`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket server on ws://localhost:${PORT}/ws/chat`);
    console.log(`👤 Admin dashboard at http://localhost:${PORT}/admin`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Security: Rate limiting, XSS protection, CSP headers`);
    console.log(`✅ Auth: JWT with refresh token rotation`);
    console.log(`✅ Logging: Structured JSON with request IDs`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});

module.exports = { app, server, wss };
