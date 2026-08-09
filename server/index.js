/**
 * Tekvwa IT Solutions - Main Server
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
const fs = require('fs');
const WebSocket = require('ws');
const bcrypt = require('bcryptjs');

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
const documentsRoutes = require('./routes/documents');
const paystubsRoutes = require('./routes/paystubs');
const contractsRoutes = require('./routes/contracts');
const ticketsRoutes = require('./routes/tickets');
const letterheadRoutes = require('./routes/letterhead');
const complianceRoutes = require('./routes/compliance');
const onboardingRoutes = require('./routes/onboarding');

// Import middleware
const { securityHeaders, corsOptions, botProtection } = require('./middleware/securityHeaders');
const { requestId, errorHandler, notFoundHandler, Logger } = require('./middleware/errorHandler');
const { sanitizeRequest } = require('./middleware/sanitizer');
const {
    contactFormLimiter,
    newsletterLimiter,
    bookingLimiter
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
// Note: newsletterLimiter only applies to the public subscribe/unsubscribe
// endpoints - not to admin's GET /subscribers list.
const newsletterLimiterGuard = (req, res, next) => {
    if (req.method === 'POST' && (req.path === '/subscribe' || req.path === '/unsubscribe')) {
        return newsletterLimiter(req, res, next);
    }
    next();
};
app.use('/api/newsletter', newsletterLimiterGuard, newsletterRoutes);
// Note: bookingLimiter only applies to the public booking-creation endpoints
// (POST /book or POST /) - not to staff/admin listing, filtering, or updating
// consultations, which routinely need far more than a handful of requests/hour.
const consultationBookingLimiterGuard = (req, res, next) => {
    if (req.method === 'POST' && (req.path === '/' || req.path === '/book')) {
        return bookingLimiter(req, res, next);
    }
    next();
};
app.use('/api/consultation', consultationBookingLimiterGuard, consultationRoutes);
app.use('/api/consultations', consultationBookingLimiterGuard, consultationRoutes);

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
app.use('/api/documents', documentsRoutes);
app.use('/api/paystubs', paystubsRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/letterhead', letterheadRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/onboarding', onboardingRoutes);

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

// ======================
// DATABASE AUTO-INITIALIZATION
// ======================
async function initializeDatabase() {
    const db = require('./config/database');

    console.log('Checking database connection...');
    console.log(`DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);

    try {
        // Test connection first
        const testResult = await db.query('SELECT NOW() as now');
        console.log(`Database connected at: ${testResult.rows[0].now}`);

        // Check if staff table exists
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'staff'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            console.log('First run detected - initializing database schema...');

            // Read and execute schema
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            await db.query(schema);
            console.log('Database schema created');
        }

        // Check/create admin user
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@tekvwa.org';
        const adminPassword = process.env.ADMIN_PASSWORD || 'TekvwaAdmin2026!';
        const adminName = process.env.ADMIN_NAME || 'System Administrator';

        const existingAdmin = await db.query(
            'SELECT id FROM staff WHERE email = $1',
            [adminEmail]
        );

        if (existingAdmin.rows.length === 0) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            await db.query(
                `INSERT INTO staff (
                    email, password_hash, name, role,
                    must_change_password, is_active,
                    can_manage_messages, can_manage_consultations,
                    can_manage_chats, can_view_analytics
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [adminEmail, hashedPassword, adminName, 'admin', false, true, true, true, true, true]
            );
            console.log(`Admin user created: ${adminEmail}`);
        } else {
            console.log(`Admin user exists: ${adminEmail}`);
        }

        // Run migrations
        const migrationsDir = path.join(__dirname, '../database/migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            for (const migration of migrations) {
                try {
                    const sql = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
                    await db.query(sql);
                } catch (err) {
                    // Ignore errors from migrations already applied
                    if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
                        console.log(`Migration ${migration} note:`, err.message);
                    }
                }
            }
        }

        console.log('Database ready');
    } catch (error) {
        console.error('Database initialization error:', error.message);
        console.error('Full error:', error);
        // Don't crash - let server start and show proper errors
    }
}

// Initialize database then start server
initializeDatabase().then(() => {
    server.listen(PORT, () => {
        console.log('\nTekvwa IT Solutions Server Started');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Server running on port ${PORT}`);
        console.log(`WebSocket server on ws://localhost:${PORT}/ws/chat`);
        console.log('Admin dashboard at /admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Security: Rate limiting, XSS protection, CSP headers');
        console.log('Auth: JWT with refresh token rotation');
        console.log('Logging: Structured JSON with request IDs');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

module.exports = { app, server, wss };
