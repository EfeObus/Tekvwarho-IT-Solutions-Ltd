/**
 * Performance Routes
 * Staff performance tracking and reporting
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');
const PerformanceService = require('../services/performanceService');

/**
 * GET /api/performance/staff/:id
 * Get detailed performance metrics for a specific staff member
 */
router.get('/staff/:id', authMiddleware, async (req, res) => {
    try {
        const staffId = req.params.id;
        const { startDate, endDate, period } = req.query;
        
        // Calculate dates based on period if not provided
        let start = startDate;
        let end = endDate || new Date().toISOString().split('T')[0];
        
        if (!startDate && period) {
            start = PerformanceService.getPeriodStart(period);
        } else if (!startDate) {
            start = PerformanceService.getPeriodStart('month');
        }
        
        // Staff can view their own, admin can view all
        if (req.user.role !== 'admin' && req.user.id !== staffId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        
        const metrics = await PerformanceService.getStaffMetrics(staffId, start, end);
        
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Get staff metrics error:', error);
        res.status(500).json({ success: false, message: 'Failed to get performance metrics' });
    }
});

/**
 * GET /api/performance/summary
 * Get performance summary for all staff (admin only)
 */
router.get('/summary', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        
        let start = startDate;
        let end = endDate || new Date().toISOString().split('T')[0];
        
        if (!startDate && period) {
            start = PerformanceService.getPeriodStart(period);
        } else if (!startDate) {
            start = PerformanceService.getPeriodStart('month');
        }
        
        const summary = await PerformanceService.getAllStaffPerformance(start, end);
        
        res.json({ 
            success: true, 
            data: summary,
            period: { startDate: start, endDate: end }
        });
    } catch (error) {
        console.error('Get performance summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to get performance summary' });
    }
});

/**
 * GET /api/performance/leaderboard
 * Get staff leaderboard (accessible to all authenticated users)
 */
router.get('/leaderboard', authMiddleware, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        
        const leaderboard = await PerformanceService.getLeaderboard(period);
        
        res.json({ success: true, data: leaderboard });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
    }
});

/**
 * GET /api/performance/my-stats
 * Get current user's own performance stats
 */
router.get('/my-stats', authMiddleware, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const staffId = req.user.id;
        
        const startDate = PerformanceService.getPeriodStart(period);
        const endDate = new Date().toISOString().split('T')[0];
        
        const metrics = await PerformanceService.getStaffMetrics(staffId, startDate, endDate);
        
        res.json({ success: true, data: metrics });
    } catch (error) {
        console.error('Get my stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to get your performance stats' });
    }
});

module.exports = router;
