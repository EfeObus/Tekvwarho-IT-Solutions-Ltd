/**
 * Database Configuration
 * PostgreSQL connection using pg module
 * Supports both DATABASE_URL (Railway/Heroku) and individual env vars
 */

const { Pool } = require('pg');

// Determine if we're using Railway (DATABASE_URL with railway in the host)
const isRailway = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway');

// Configure pool - prefer DATABASE_URL for Railway/cloud deployments
const poolConfig = process.env.DATABASE_URL 
    ? {
        connectionString: process.env.DATABASE_URL,
        // Always use SSL for Railway, regardless of NODE_ENV
        ssl: isRailway || process.env.NODE_ENV === 'production' 
            ? { rejectUnauthorized: false } 
            : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'tekvwarho',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

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
