/**
 * Authentication Middleware Tests
 */

const jwt = require('jsonwebtoken');

// Mock the auth middleware for testing
const mockAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'No token provided' 
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token format' 
            });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        return res.status(401).json({ 
            success: false,
            message: 'Invalid token' 
        });
    }
};

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = global.testUtils.mockRequest();
        mockRes = global.testUtils.mockResponse();
        mockNext = global.testUtils.mockNext();
    });

    describe('Token Validation', () => {
        it('should reject request without authorization header', () => {
            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'No token provided'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with invalid token format', () => {
            mockReq.headers.authorization = 'InvalidFormat token123';
            
            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token format'
            });
        });

        it('should reject request with malformed Bearer token', () => {
            mockReq.headers.authorization = 'Bearer';
            
            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should accept valid JWT token', () => {
            const token = global.testUtils.generateTestToken();
            mockReq.headers.authorization = `Bearer ${token}`;

            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.email).toBe('test@tekvwarho.com');
        });

        it('should reject expired token', () => {
            const expiredToken = jwt.sign(
                { id: 'test', email: 'test@test.com' },
                process.env.JWT_SECRET,
                { expiresIn: '-1h' }
            );
            mockReq.headers.authorization = `Bearer ${expiredToken}`;

            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Token expired'
            });
        });

        it('should reject token with invalid signature', () => {
            const invalidToken = jwt.sign(
                { id: 'test', email: 'test@test.com' },
                'wrong-secret'
            );
            mockReq.headers.authorization = `Bearer ${invalidToken}`;

            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Invalid token'
            });
        });
    });

    describe('User Payload', () => {
        it('should attach user data to request object', () => {
            const customPayload = {
                id: 'custom-id',
                email: 'custom@test.com',
                role: 'manager',
                name: 'Custom User'
            };
            const token = global.testUtils.generateTestToken(customPayload);
            mockReq.headers.authorization = `Bearer ${token}`;

            mockAuthMiddleware(mockReq, mockRes, mockNext);

            expect(mockReq.user.id).toBe('custom-id');
            expect(mockReq.user.email).toBe('custom@test.com');
            expect(mockReq.user.role).toBe('manager');
        });
    });
});
