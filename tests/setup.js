/**
 * Jest Test Setup
 * This file runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'tekvwa_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Increase timeout for database operations
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
    /**
     * Generate a valid JWT token for testing
     */
    generateTestToken: (payload = {}) => {
        const jwt = require('jsonwebtoken');
        const defaultPayload = {
            id: 'test-user-id',
            email: 'test@tekvwa.org',
            role: 'admin',
            name: 'Test User',
            permissions: {
                canManageMessages: true,
                canManageConsultations: true,
                canManageChats: true,
                canViewAnalytics: true
            }
        };
        return jwt.sign({ ...defaultPayload, ...payload }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });
    },

    /**
     * Wait for a specified duration
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Create a mock request object
     */
    mockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ip: '127.0.0.1',
        get: jest.fn(),
        ...overrides
    }),

    /**
     * Create a mock response object
     */
    mockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.setHeader = jest.fn().mockReturnValue(res);
        res.removeHeader = jest.fn().mockReturnValue(res);
        return res;
    },

    /**
     * Create a mock next function
     */
    mockNext: () => jest.fn()
};

// Console output suppression for cleaner test output (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
        // Keep error for debugging
    };
}
