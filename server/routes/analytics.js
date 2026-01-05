/**
 * Analytics Routes
 * Handles visitor tracking and advanced analytics
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Visitor = require('../models/Visitor');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/analytics/track
 * Track a page view or event (public endpoint)
 */
router.post('/track', async (req, res) => {
    try {
        const { visitorId, eventType, pageUrl, referrer, metadata } = req.body;
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;

        let actualVisitorId = visitorId;

        // Create or update visitor if no visitorId provided
        if (!visitorId) {
            const visitorResult = await db.query(
                `INSERT INTO visitors (id, ip_address, user_agent, source)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [uuidv4(), ipAddress, userAgent, referrer || 'direct']
            );
            actualVisitorId = visitorResult.rows[0].id;
        } else {
            // Update last visit
            await db.query(
                `UPDATE visitors SET last_visit = CURRENT_TIMESTAMP, page_views = page_views + 1 WHERE id = $1`,
                [visitorId]
            );
        }

        // Create analytics event
        await db.query(
            `INSERT INTO analytics_events (id, visitor_id, event_type, page_url, referrer, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [uuidv4(), actualVisitorId, eventType || 'page_view', pageUrl, referrer, metadata ? JSON.stringify(metadata) : null]
        );

        res.json({ success: true, visitorId: actualVisitorId });
    } catch (error) {
        console.error('Track event error:', error);
        res.status(500).json({ success: false });
    }
});

/**
 * GET /api/analytics/visitor
 * Get or create visitor session (public endpoint)
 */
router.get('/visitor', async (req, res) => {
    try {
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip || req.connection.remoteAddress;
        const referrer = req.headers.referer || 'direct';

        const visitorResult = await db.query(
            `INSERT INTO visitors (id, ip_address, user_agent, source)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            [uuidv4(), ipAddress, userAgent, referrer]
        );

        res.json({ 
            success: true, 
            visitorId: visitorResult.rows[0].id 
        });
    } catch (error) {
        console.error('Create visitor error:', error);
        res.status(500).json({ success: false });
    }
});

/**
 * GET /api/analytics
 * Get comprehensive analytics data (admin)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        
        // Calculate date range based on period
        let start, end;
        const now = new Date();
        
        if (period) {
            const days = parseInt(period) || 30;
            end = now.toISOString().split('T')[0];
            start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        } else {
            end = endDate || now.toISOString().split('T')[0];
            start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }

        // Calculate previous period for comparison
        const daysDiff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
        const prevEnd = new Date(new Date(start).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const prevStart = new Date(new Date(start).getTime() - (daysDiff + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Get page views by day with trend data
        const pageViewsResult = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [start, end]);

        // Get total visitors for current and previous period
        const currentVisitorsResult = await db.query(`
            SELECT COUNT(DISTINCT visitor_id) as unique_visitors,
                   COUNT(*) as total_page_views
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
        `, [start, end]);

        const prevVisitorsResult = await db.query(`
            SELECT COUNT(DISTINCT visitor_id) as unique_visitors,
                   COUNT(*) as total_page_views
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
        `, [prevStart, prevEnd]);

        // Get top pages
        const topPagesResult = await db.query(`
            SELECT page_url, COUNT(*) as count,
                   COUNT(DISTINCT visitor_id) as unique_visitors
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY page_url
            ORDER BY count DESC
            LIMIT 10
        `, [start, end]);

        // Get traffic sources (referrers)
        const referrersResult = await db.query(`
            SELECT 
                CASE 
                    WHEN referrer IS NULL OR referrer = '' OR referrer = 'direct' THEN 'Direct'
                    WHEN referrer LIKE '%google%' THEN 'Google'
                    WHEN referrer LIKE '%facebook%' THEN 'Facebook'
                    WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
                    WHEN referrer LIKE '%twitter%' THEN 'Twitter'
                    ELSE 'Other'
                END as source,
                COUNT(*) as count
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY source
            ORDER BY count DESC
        `, [start, end]);

        // Get device/browser breakdown
        const devicesResult = await db.query(`
            SELECT 
                CASE 
                    WHEN v.user_agent LIKE '%Mobile%' OR v.user_agent LIKE '%Android%' OR v.user_agent LIKE '%iPhone%' THEN 'Mobile'
                    WHEN v.user_agent LIKE '%Tablet%' OR v.user_agent LIKE '%iPad%' THEN 'Tablet'
                    ELSE 'Desktop'
                END as device_type,
                COUNT(*) as count
            FROM analytics_events e
            LEFT JOIN visitors v ON e.visitor_id = v.id
            WHERE e.event_type = 'page_view'
            AND e.created_at >= $1 AND e.created_at <= $2::date + interval '1 day'
            GROUP BY device_type
            ORDER BY count DESC
        `, [start, end]);

        // Get conversion events
        const conversionsResult = await db.query(`
            SELECT event_type, COUNT(*) as count
            FROM analytics_events
            WHERE event_type IN ('form_submit', 'chat_start', 'booking', 'consultation_booked')
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY event_type
        `, [start, end]);

        // Get hourly traffic distribution
        const hourlyResult = await db.query(`
            SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
            FROM analytics_events
            WHERE event_type = 'page_view'
            AND created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY hour
            ORDER BY hour ASC
        `, [start, end]);

        // Get messages by service
        const serviceMessagesResult = await db.query(`
            SELECT COALESCE(service, 'General') as service, COUNT(*) as count
            FROM messages
            WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY service
            ORDER BY count DESC
        `, [start, end]);

        // Get message status breakdown
        const messageStatusResult = await db.query(`
            SELECT status, COUNT(*) as count
            FROM messages
            WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY status
        `, [start, end]);

        // Get consultation status breakdown
        const consultationStatusResult = await db.query(`
            SELECT status, COUNT(*) as count
            FROM consultations
            WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
            GROUP BY status
        `, [start, end]);

        // Get new vs returning visitors
        const visitorTypesResult = await db.query(`
            SELECT 
                CASE WHEN v.page_views = 1 THEN 'New' ELSE 'Returning' END as visitor_type,
                COUNT(DISTINCT e.visitor_id) as count
            FROM analytics_events e
            LEFT JOIN visitors v ON e.visitor_id = v.id
            WHERE e.event_type = 'page_view'
            AND e.created_at >= $1 AND e.created_at <= $2::date + interval '1 day'
            GROUP BY visitor_type
        `, [start, end]);

        // Calculate metrics
        const currentVisitors = parseInt(currentVisitorsResult.rows[0]?.unique_visitors || 0);
        const prevVisitors = parseInt(prevVisitorsResult.rows[0]?.unique_visitors || 0);
        const visitorChange = prevVisitors > 0 
            ? Math.round(((currentVisitors - prevVisitors) / prevVisitors) * 100) 
            : 100;

        const currentPageViews = parseInt(currentVisitorsResult.rows[0]?.total_page_views || 0);
        const prevPageViews = parseInt(prevVisitorsResult.rows[0]?.total_page_views || 0);
        const pageViewChange = prevPageViews > 0 
            ? Math.round(((currentPageViews - prevPageViews) / prevPageViews) * 100) 
            : 100;

        // Average session duration (estimate based on page views)
        const avgPagesPerSession = currentVisitors > 0 
            ? (currentPageViews / currentVisitors).toFixed(1) 
            : 0;

        res.json({
            success: true,
            data: {
                dateRange: { start, end },
                summary: {
                    uniqueVisitors: currentVisitors,
                    visitorChange,
                    totalPageViews: currentPageViews,
                    pageViewChange,
                    avgPagesPerSession,
                    conversions: conversionsResult.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
                },
                pageViews: pageViewsResult.rows,
                topPages: topPagesResult.rows,
                trafficSources: referrersResult.rows,
                devices: devicesResult.rows,
                conversions: conversionsResult.rows,
                hourlyTraffic: hourlyResult.rows,
                serviceMessages: serviceMessagesResult.rows,
                messageStatus: messageStatusResult.rows,
                consultationStatus: consultationStatusResult.rows,
                visitorTypes: visitorTypesResult.rows
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve analytics' 
        });
    }
});

/**
 * GET /api/analytics/summary
 * Get quick summary stats for dashboard
 */
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Today's stats
        const todayStats = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
                COUNT(DISTINCT visitor_id) as unique_visitors
            FROM analytics_events
            WHERE DATE(created_at) = $1
        `, [today]);

        // This week's stats
        const weekStats = await db.query(`
            SELECT 
                COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
                COUNT(DISTINCT visitor_id) as unique_visitors
            FROM analytics_events
            WHERE created_at >= $1
        `, [weekAgo]);

        // Total counts
        const totalsResult = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM visitors) as total_visitors,
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM messages WHERE status = 'new') as new_messages,
                (SELECT COUNT(*) FROM consultations) as total_consultations,
                (SELECT COUNT(*) FROM consultations WHERE status = 'pending') as pending_consultations,
                (SELECT COUNT(*) FROM chat_sessions) as total_chats,
                (SELECT COUNT(*) FROM chat_sessions WHERE status = 'active') as active_chats
        `);

        // Get conversion rate (bookings per visitor)
        const conversionResult = await db.query(`
            SELECT 
                COUNT(DISTINCT e.visitor_id) as visitors_with_action
            FROM analytics_events e
            WHERE e.event_type IN ('form_submit', 'booking', 'chat_start')
            AND e.created_at >= $1
        `, [monthAgo]);

        const monthVisitors = await db.query(`
            SELECT COUNT(DISTINCT visitor_id) as visitors
            FROM analytics_events
            WHERE created_at >= $1
        `, [monthAgo]);

        const conversionRate = monthVisitors.rows[0]?.visitors > 0
            ? ((conversionResult.rows[0]?.visitors_with_action / monthVisitors.rows[0]?.visitors) * 100).toFixed(1)
            : 0;

        // Recent activity (last 10 events)
        const recentActivity = await db.query(`
            SELECT 
                'message' as type,
                m.name as title,
                m.service as details,
                m.created_at
            FROM messages m
            UNION ALL
            SELECT 
                'consultation' as type,
                c.name as title,
                c.service as details,
                c.created_at
            FROM consultations c
            UNION ALL
            SELECT 
                'chat' as type,
                cs.visitor_name as title,
                'Chat session' as details,
                cs.created_at
            FROM chat_sessions cs
            ORDER BY created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                today: todayStats.rows[0],
                week: weekStats.rows[0],
                totals: totalsResult.rows[0],
                conversionRate,
                recentActivity: recentActivity.rows
            }
        });
    } catch (error) {
        console.error('Get summary error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve summary' 
        });
    }
});

/**
 * GET /api/analytics/realtime
 * Get real-time visitor data
 */
router.get('/realtime', authMiddleware, async (req, res) => {
    try {
        // Get visitors in the last 5 minutes
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const activeVisitorsResult = await db.query(`
            SELECT 
                COUNT(DISTINCT visitor_id) as active_visitors,
                COUNT(*) as page_views
            FROM analytics_events
            WHERE created_at >= $1
        `, [fiveMinAgo]);

        // Get current pages being viewed
        const currentPagesResult = await db.query(`
            SELECT page_url, COUNT(DISTINCT visitor_id) as visitors
            FROM analytics_events
            WHERE created_at >= $1
            GROUP BY page_url
            ORDER BY visitors DESC
            LIMIT 5
        `, [fiveMinAgo]);

        res.json({
            success: true,
            data: {
                activeVisitors: parseInt(activeVisitorsResult.rows[0]?.active_visitors || 0),
                pageViews: parseInt(activeVisitorsResult.rows[0]?.page_views || 0),
                currentPages: currentPagesResult.rows
            }
        });
    } catch (error) {
        console.error('Get realtime error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to retrieve realtime data' 
        });
    }
});

module.exports = router;
