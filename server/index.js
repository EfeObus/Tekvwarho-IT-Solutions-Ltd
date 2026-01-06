/**
 * Tekvwarho IT Solutions - Main Server
 * Express.js backend with WebSocket support
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
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const notesTagsRoutes = require('./routes/notes-tags');
const auditExportRoutes = require('./routes/audit-export');
const performanceRoutes = require('./routes/performance');

// Import WebSocket handler
const { initChatHandler } = require('./websocket/chatHandler');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws/chat' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from project root (for HTML, CSS, JS files)
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/users', express.static(path.join(__dirname, '../users')));

// API Routes
app.use('/api/contact', contactRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/consultation', consultationRoutes); // Alias for frontend compatibility
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', notesTagsRoutes); // Notes and tags routes
app.use('/api/audit', auditExportRoutes);
app.use('/api/export', auditExportRoutes);
app.use('/api/performance', performanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
initChatHandler(wss);

// Serve index.html for root and other frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Catch-all for frontend routes
app.get('*.html', (req, res) => {
    const filePath = path.join(__dirname, '../public', req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('Page not found');
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}/ws/chat`);
    console.log(`Admin dashboard at http://localhost:${PORT}/admin`);
});

module.exports = { app, server, wss };
