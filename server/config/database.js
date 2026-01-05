/**
 * Database Configuration
 * PostgreSQL connection using pg module
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tekvwarho',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
            console.log('Executed query', { text, duration, rows: res.rowCount });
        }
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Get a client from the pool
 * @returns {Promise} Database client
 */
const getClient = async () => {
    const client = await pool.connect();
    return client;
};

module.exports = {
    query,
    getClient,
    pool
};
