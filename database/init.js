/**
 * Database Initialization Script
 * Run with: npm run db:init
 * Supports DATABASE_URL (hosted providers) and local PostgreSQL
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function initDatabase() {
    let pool;
    const hasHostedUrl = !!process.env.DATABASE_URL;

    if (hasHostedUrl) {
        // Hosted provider: database already exists, connect directly
        console.log('Detected hosted DATABASE_URL environment');
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    } else {
        // Local: Check/create database first
        const adminPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            database: 'postgres'
        });

        const dbName = process.env.DB_NAME || 'tekvwa';

        try {
            const dbCheck = await adminPool.query(
                'SELECT 1 FROM pg_database WHERE datname = $1',
                [dbName]
            );

            if (dbCheck.rows.length === 0) {
                await adminPool.query(`CREATE DATABASE ${dbName}`);
                console.log(`Database "${dbName}" created successfully`);
            } else {
                console.log(`Database "${dbName}" already exists`);
            }
        } catch (error) {
            if (error.code !== '42P04') {
                console.error('Error checking/creating database:', error.message);
            }
        } finally {
            await adminPool.end();
        }

        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: dbName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
        });
    }

    try {
        console.log('Initializing database schema...');

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await pool.query(schema);
        console.log('Schema created successfully');

        // Apply migrations (saved replies/drafts, password reset tokens, etc.)
        const migrationsDir = path.join(__dirname, 'migrations');
        if (fs.existsSync(migrationsDir)) {
            const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
            for (const migration of migrations) {
                try {
                    const sql = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
                    await pool.query(sql);
                    console.log(`Migration applied: ${migration}`);
                } catch (err) {
                    if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
                        console.log(`Migration ${migration} note:`, err.message);
                    }
                }
            }
        }

        // Create default admin user (hardcoded as per requirement)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@tekvwa.org';
        const adminPassword = process.env.ADMIN_PASSWORD || 'TekvwaAdmin2026!';
        const adminName = process.env.ADMIN_NAME || 'System Administrator';
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Check if admin exists
        const existingAdmin = await pool.query(
            'SELECT id FROM staff WHERE email = $1',
            [adminEmail]
        );

        if (existingAdmin.rows.length === 0) {
            await pool.query(
                `INSERT INTO staff (
                    email, password_hash, name, role,
                    must_change_password, is_active,
                    can_manage_messages, can_manage_consultations,
                    can_manage_chats, can_view_analytics
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    adminEmail,
                    hashedPassword,
                    adminName,
                    'admin',
                    false, // Admin doesn't need to change password
                    true,
                    true, true, true, true // All permissions
                ]
            );
            console.log(`Admin user created: ${adminEmail}`);
            console.log(`Admin password: ${adminPassword}`);
        } else {
            // Update admin password in case it changed in .env
            await pool.query(
                `UPDATE staff SET
                    password_hash = $1,
                    name = $2,
                    must_change_password = false,
                    can_manage_messages = true,
                    can_manage_consultations = true,
                    can_manage_chats = true,
                    can_view_analytics = true
                WHERE email = $3 AND role = 'admin'`,
                [hashedPassword, adminName, adminEmail]
            );
            console.log('Admin user updated');
        }

        console.log('\n===========================================');
        console.log('Database initialization complete!');
        console.log('===========================================');
        console.log(`Admin Email: ${adminEmail}`);
        console.log(`Admin Password: ${adminPassword}`);
        console.log('===========================================\n');

    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDatabase();
