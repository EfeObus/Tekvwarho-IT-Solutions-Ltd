/**
 * Settings Routes
 * Handles system settings management
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const AuditService = require('../services/auditService');

/**
 * GET /api/settings
 * Get all system settings (admin only)
 */
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { category } = req.query;
        
        let query = 'SELECT * FROM system_settings';
        const params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        query += ' ORDER BY category, setting_key';
        
        const result = await db.query(query, params);
        
        // Group by category
        const grouped = result.rows.reduce((acc, setting) => {
            if (!acc[setting.category]) {
                acc[setting.category] = [];
            }
            // Parse value based on type
            let value = setting.setting_value;
            if (setting.setting_type === 'boolean') {
                value = setting.setting_value === 'true';
            } else if (setting.setting_type === 'number') {
                value = parseFloat(setting.setting_value);
            } else if (setting.setting_type === 'json') {
                try { value = JSON.parse(setting.setting_value); } catch (e) {}
            }
            
            acc[setting.category].push({
                ...setting,
                value
            });
            return acc;
        }, {});
        
        res.json({ success: true, data: grouped });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve settings' });
    }
});

/**
 * GET /api/settings/:key
 * Get a specific setting (for internal use, some are public)
 */
router.get('/:key', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM system_settings WHERE setting_key = $1',
            [req.params.key]
        );
        
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Setting not found' });
        }
        
        const setting = result.rows[0];
        let value = setting.setting_value;
        
        if (setting.setting_type === 'boolean') {
            value = setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
            value = parseFloat(setting.setting_value);
        } else if (setting.setting_type === 'json') {
            try { value = JSON.parse(setting.setting_value); } catch (e) {}
        }
        
        res.json({ success: true, data: { ...setting, value } });
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve setting' });
    }
});

/**
 * PATCH /api/settings/:key
 * Update a setting (admin only)
 */
router.patch('/:key', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { value } = req.body;
        const key = req.params.key;
        
        // Get current setting
        const current = await db.query(
            'SELECT * FROM system_settings WHERE setting_key = $1',
            [key]
        );
        
        if (!current.rows.length) {
            return res.status(404).json({ success: false, message: 'Setting not found' });
        }
        
        const oldValue = current.rows[0].setting_value;
        
        // Convert value to string for storage
        let stringValue = value;
        if (typeof value === 'object') {
            stringValue = JSON.stringify(value);
        } else {
            stringValue = String(value);
        }
        
        const result = await db.query(
            `UPDATE system_settings 
             SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
             WHERE setting_key = $3
             RETURNING *`,
            [stringValue, req.user.id, key]
        );
        
        // Log the change
        await AuditService.logSettingsChange(
            req.user.id, 
            key, 
            oldValue, 
            stringValue, 
            req.ip
        );
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ success: false, message: 'Failed to update setting' });
    }
});

/**
 * POST /api/settings/bulk
 * Update multiple settings at once (admin only)
 */
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ success: false, message: 'Settings array required' });
        }
        
        const updated = [];
        
        for (const { key, value } of settings) {
            let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            
            const result = await db.query(
                `UPDATE system_settings 
                 SET setting_value = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
                 WHERE setting_key = $3
                 RETURNING *`,
                [stringValue, req.user.id, key]
            );
            
            if (result.rows.length) {
                updated.push(result.rows[0]);
            }
        }
        
        // Log bulk change
        await AuditService.log({
            staffId: req.user.id,
            action: 'bulk_settings_update',
            entityType: 'settings',
            details: { count: updated.length },
            ipAddress: req.ip
        });
        
        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Bulk update settings error:', error);
        res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
});

module.exports = router;
