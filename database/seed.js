/**
 * Database Seed Script
 * Run with: npm run db:seed
 *
 * Seeds the database with sample data for development and testing.
 * WARNING: This will insert sample data - do not run in production!
 * Supports DATABASE_URL (hosted providers) and local PostgreSQL
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Configure pool - prefer DATABASE_URL when set, otherwise local Postgres
const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'tekvwa',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
    };

const pool = new Pool(poolConfig);

async function seedDatabase() {
    console.log('\nStarting database seeding...\n');

    try {
        // =====================
        // Seed Staff Members
        // =====================
        console.log('Seeding staff members...');

        const staffMembers = [
            {
                email: 'john.doe@tekvwa.org',
                password: 'Staff123!',
                name: 'John Doe',
                role: 'manager',
                department: 'Sales',
                phone: '+1 (905) 555-0101',
                can_manage_messages: true,
                can_manage_consultations: true,
                can_manage_chats: true,
                can_view_analytics: true
            },
            {
                email: 'jane.smith@tekvwa.org',
                password: 'Staff123!',
                name: 'Jane Smith',
                role: 'staff',
                department: 'Support',
                phone: '+1 (905) 555-0102',
                can_manage_messages: true,
                can_manage_consultations: true,
                can_manage_chats: true,
                can_view_analytics: false
            },
            {
                email: 'mike.wilson@tekvwa.org',
                password: 'Staff123!',
                name: 'Mike Wilson',
                role: 'staff',
                department: 'Development',
                phone: '+1 (905) 555-0103',
                can_manage_messages: true,
                can_manage_consultations: false,
                can_manage_chats: true,
                can_view_analytics: false
            }
        ];

        const staffIds = [];
        for (const staff of staffMembers) {
            const existingStaff = await pool.query(
                'SELECT id FROM staff WHERE email = $1',
                [staff.email]
            );

            if (existingStaff.rows.length === 0) {
                const hashedPassword = await bcrypt.hash(staff.password, 12);
                const result = await pool.query(
                    `INSERT INTO staff (
                        email, password_hash, name, role, department, phone,
                        must_change_password, is_active,
                        can_manage_messages, can_manage_consultations,
                        can_manage_chats, can_view_analytics
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id`,
                    [
                        staff.email, hashedPassword, staff.name, staff.role,
                        staff.department, staff.phone, true, true,
                        staff.can_manage_messages, staff.can_manage_consultations,
                        staff.can_manage_chats, staff.can_view_analytics
                    ]
                );
                staffIds.push(result.rows[0].id);
                console.log(`Created staff: ${staff.email}`);
            } else {
                staffIds.push(existingStaff.rows[0].id);
                console.log(`- Staff exists: ${staff.email}`);
            }
        }

        // =====================
        // Seed Visitors
        // =====================
        console.log('\nSeeding visitors...');

        const visitors = [
            { name: 'Alice Johnson', email: 'alice.johnson@example.com', source: 'google' },
            { name: 'Bob Williams', email: 'bob.williams@example.com', source: 'linkedin' },
            { name: 'Carol Davis', email: 'carol.davis@example.com', source: 'referral' },
            { name: 'David Brown', email: 'david.brown@example.com', source: 'direct' },
            { name: 'Eva Martinez', email: 'eva.martinez@example.com', source: 'google' }
        ];

        const visitorIds = [];
        for (const visitor of visitors) {
            const existingVisitor = await pool.query(
                'SELECT id FROM visitors WHERE email = $1',
                [visitor.email]
            );

            if (existingVisitor.rows.length === 0) {
                const result = await pool.query(
                    `INSERT INTO visitors (name, email, source, page_views)
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [visitor.name, visitor.email, visitor.source, Math.floor(Math.random() * 10) + 1]
                );
                visitorIds.push(result.rows[0].id);
                console.log(`Created visitor: ${visitor.email}`);
            } else {
                visitorIds.push(existingVisitor.rows[0].id);
                console.log(`- Visitor exists: ${visitor.email}`);
            }
        }

        // =====================
        // Seed Messages
        // =====================
        console.log('\nSeeding contact messages...');

        const services = ['IT Consulting', 'Software Development', 'Website Development', 'Data Analytics'];
        const messages = [
            {
                name: 'Alice Johnson',
                email: 'alice.johnson@example.com',
                company: 'TechStart Inc.',
                service: 'Software Development',
                message: 'We need a custom CRM system for our sales team. Looking for a solution that integrates with our existing tools.',
                status: 'new'
            },
            {
                name: 'Bob Williams',
                email: 'bob.williams@example.com',
                company: 'Williams & Co.',
                service: 'IT Consulting',
                message: 'Our company is planning a cloud migration. We need expert guidance on the best approach for our infrastructure.',
                status: 'in_progress'
            },
            {
                name: 'Carol Davis',
                email: 'carol.davis@example.com',
                company: 'Davis Retail',
                service: 'Website Development',
                message: 'Looking to redesign our e-commerce website. Need modern design with improved user experience.',
                status: 'new'
            },
            {
                name: 'David Brown',
                email: 'david.brown@example.com',
                company: 'Brown Analytics',
                service: 'Data Analytics',
                message: 'We have large datasets that need analysis. Looking for insights to drive business decisions.',
                status: 'converted'
            },
            {
                name: 'Eva Martinez',
                email: 'eva.martinez@example.com',
                company: 'Martinez Media',
                service: 'Website Development',
                message: 'Need a portfolio website for our creative agency. Should showcase our work beautifully.',
                status: 'new'
            }
        ];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            const visitorId = visitorIds[i % visitorIds.length];
            const assignedTo = msg.status !== 'new' ? staffIds[i % staffIds.length] : null;

            const existingMsg = await pool.query(
                'SELECT id FROM messages WHERE email = $1 AND message = $2',
                [msg.email, msg.message]
            );

            if (existingMsg.rows.length === 0) {
                await pool.query(
                    `INSERT INTO messages (visitor_id, name, email, company, service, message, status, assigned_to)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [visitorId, msg.name, msg.email, msg.company, msg.service, msg.message, msg.status, assignedTo]
                );
                console.log(`Created message from: ${msg.email}`);
            } else {
                console.log(`- Message exists from: ${msg.email}`);
            }
        }

        // =====================
        // Seed Consultations
        // =====================
        console.log('\nSeeding consultations...');

        const today = new Date();
        const consultations = [
            {
                name: 'Alice Johnson',
                email: 'alice.johnson@example.com',
                phone: '+1 (555) 123-4567',
                company: 'TechStart Inc.',
                service: 'Software Development',
                booking_date: addDays(today, 2),
                booking_time: '10:00',
                notes: 'Interested in CRM development',
                status: 'confirmed'
            },
            {
                name: 'Bob Williams',
                email: 'bob.williams@example.com',
                phone: '+1 (555) 234-5678',
                company: 'Williams & Co.',
                service: 'IT Consulting',
                booking_date: addDays(today, 5),
                booking_time: '14:00',
                notes: 'Cloud migration discussion',
                status: 'pending'
            },
            {
                name: 'Carol Davis',
                email: 'carol.davis@example.com',
                phone: '+1 (555) 345-6789',
                company: 'Davis Retail',
                service: 'Website Development',
                booking_date: addDays(today, -3),
                booking_time: '11:00',
                notes: 'E-commerce redesign project',
                status: 'completed'
            },
            {
                name: 'David Brown',
                email: 'david.brown@example.com',
                phone: '+1 (555) 456-7890',
                company: 'Brown Analytics',
                service: 'Data Analytics',
                booking_date: addDays(today, 7),
                booking_time: '15:00',
                notes: 'Data analysis requirements',
                status: 'pending'
            }
        ];

        for (let i = 0; i < consultations.length; i++) {
            const consult = consultations[i];
            const visitorId = visitorIds[i % visitorIds.length];
            const assignedTo = consult.status !== 'pending' ? staffIds[i % staffIds.length] : null;

            const existingConsult = await pool.query(
                'SELECT id FROM consultations WHERE email = $1 AND booking_date = $2',
                [consult.email, formatDate(consult.booking_date)]
            );

            if (existingConsult.rows.length === 0) {
                await pool.query(
                    `INSERT INTO consultations (
                        visitor_id, name, email, phone, company, service,
                        booking_date, booking_time, notes, status, assigned_to
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        visitorId, consult.name, consult.email, consult.phone,
                        consult.company, consult.service, formatDate(consult.booking_date),
                        consult.booking_time, consult.notes, consult.status, assignedTo
                    ]
                );
                console.log(`Created consultation for: ${consult.email}`);
            } else {
                console.log(`- Consultation exists for: ${consult.email}`);
            }
        }

        // =====================
        // Seed Newsletter Subscribers
        // =====================
        console.log('\nSeeding newsletter subscribers...');

        const subscribers = [
            { email: 'subscriber1@example.com', name: 'Subscriber One' },
            { email: 'subscriber2@example.com', name: 'Subscriber Two' },
            { email: 'subscriber3@example.com', name: 'Subscriber Three' },
            { email: 'alice.johnson@example.com', name: 'Alice Johnson' },
            { email: 'bob.williams@example.com', name: 'Bob Williams' }
        ];

        for (const sub of subscribers) {
            const existingSub = await pool.query(
                'SELECT id FROM newsletter_subscribers WHERE email = $1',
                [sub.email]
            );

            if (existingSub.rows.length === 0) {
                await pool.query(
                    'INSERT INTO newsletter_subscribers (email, name, source) VALUES ($1, $2, $3)',
                    [sub.email, sub.name, 'seed']
                );
                console.log(`Created subscriber: ${sub.email}`);
            } else {
                console.log(`- Subscriber exists: ${sub.email}`);
            }
        }

        // =====================
        // Seed Analytics Events
        // =====================
        console.log('\nSeeding analytics events...');

        const eventTypes = ['page_view', 'form_submit', 'chat_start', 'booking'];
        const pages = ['/', '/it-consulting.html', '/software-development.html', '/website-development.html', '/data-analytics.html', '/contact.html', '/book-consultation.html'];

        for (let i = 0; i < 50; i++) {
            const visitorId = visitorIds[Math.floor(Math.random() * visitorIds.length)];
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const pageUrl = pages[Math.floor(Math.random() * pages.length)];
            const daysAgo = Math.floor(Math.random() * 30);
            const eventDate = addDays(today, -daysAgo);

            await pool.query(
                `INSERT INTO analytics_events (visitor_id, event_type, page_url, created_at)
                 VALUES ($1, $2, $3, $4)`,
                [visitorId, eventType, pageUrl, eventDate]
            );
        }
        console.log('Created 50 analytics events');

        // =====================
        // Summary
        // =====================
        console.log('\n' + '='.repeat(50));
        console.log('Database seeding complete!');
        console.log('='.repeat(50));
        console.log('\nSample Login Credentials:');
        console.log('-'.repeat(50));
        console.log('Admin:');
        console.log(`Email: ${process.env.ADMIN_EMAIL || 'admin@tekvwa.org'}`);
        console.log(`Password: ${process.env.ADMIN_PASSWORD || 'TekvwaAdmin2026!'}`);
        console.log('\nStaff Members:');
        staffMembers.forEach(staff => {
            console.log(`${staff.name} (${staff.role})`);
            console.log(`Email: ${staff.email}`);
            console.log(`Password: ${staff.password}`);
        });
        console.log('-'.repeat(50) + '\n');

    } catch (error) {
        console.error('\nSeeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Helper functions
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Run seeding
seedDatabase();
