/**
 * Newsletter Routes
 * Handles newsletter subscriptions
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Validation rules
const subscribeValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').optional().trim()
];

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 */
router.post('/subscribe', subscribeValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false,
                errors: errors.array() 
            });
        }

        const { email, name } = req.body;

        // Check if already subscribed
        const existing = await pool.query(
            'SELECT id, is_active FROM newsletter_subscribers WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            // Reactivate if previously unsubscribed
            if (!existing.rows[0].is_active) {
                await pool.query(
                    `UPDATE newsletter_subscribers 
                     SET is_active = true, unsubscribed_at = NULL, subscribed_at = CURRENT_TIMESTAMP
                     WHERE id = $1`,
                    [existing.rows[0].id]
                );
                return res.json({
                    success: true,
                    message: 'Welcome back! You have been resubscribed.'
                });
            }
            return res.json({
                success: true,
                message: 'You are already subscribed to our newsletter.'
            });
        }

        // Create new subscriber
        await pool.query(
            `INSERT INTO newsletter_subscribers (id, email, name, source)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), email, name || null, 'website']
        );

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing! We\'ll keep you updated.'
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to subscribe. Please try again.' 
        });
    }
});

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe from newsletter
 */
router.post('/unsubscribe', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false,
                message: 'Email is required' 
            });
        }

        const result = await pool.query(
            `UPDATE newsletter_subscribers 
             SET is_active = false, unsubscribed_at = CURRENT_TIMESTAMP
             WHERE email = $1`,
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Email not found in our subscriber list.'
            });
        }

        res.json({
            success: true,
            message: 'You have been unsubscribed from our newsletter.'
        });
    } catch (error) {
        console.error('Newsletter unsubscribe error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to unsubscribe. Please try again.' 
        });
    }
});

/**
 * GET /api/newsletter/subscribers
 * List all subscribers (admin only)
 */
router.get('/subscribers', async (req, res) => {
    try {
        const { active } = req.query;
        
        let query = 'SELECT * FROM newsletter_subscribers';
        const params = [];
        
        if (active !== undefined) {
            query += ' WHERE is_active = $1';
            params.push(active === 'true');
        }
        
        query += ' ORDER BY subscribed_at DESC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('List subscribers error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch subscribers.' 
        });
    }
});

module.exports = router;
