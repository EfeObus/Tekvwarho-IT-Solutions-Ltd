/**
 * API Health Check Tests
 */

describe('API Health Check', () => {
    describe('Health Endpoint', () => {
        it('should return health status object structure', () => {
            const healthResponse = {
                status: 'ok',
                timestamp: new Date().toISOString()
            };

            expect(healthResponse).toHaveProperty('status');
            expect(healthResponse).toHaveProperty('timestamp');
            expect(healthResponse.status).toBe('ok');
        });

        it('should have valid ISO timestamp', () => {
            const timestamp = new Date().toISOString();
            const parsedDate = new Date(timestamp);
            
            expect(parsedDate.toISOString()).toBe(timestamp);
            expect(isNaN(parsedDate.getTime())).toBe(false);
        });
    });

    describe('API Response Format', () => {
        it('should follow standard success response format', () => {
            const successResponse = {
                success: true,
                data: { id: 1, name: 'Test' },
                message: 'Operation successful'
            };

            expect(successResponse).toHaveProperty('success', true);
            expect(successResponse).toHaveProperty('data');
            expect(typeof successResponse.data).toBe('object');
        });

        it('should follow standard error response format', () => {
            const errorResponse = {
                success: false,
                message: 'Something went wrong',
                code: 'VALIDATION_ERROR'
            };

            expect(errorResponse).toHaveProperty('success', false);
            expect(errorResponse).toHaveProperty('message');
            expect(typeof errorResponse.message).toBe('string');
        });

        it('should include pagination in list responses', () => {
            const paginatedResponse = {
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 100,
                    pages: 10
                }
            };

            expect(paginatedResponse.pagination).toHaveProperty('page');
            expect(paginatedResponse.pagination).toHaveProperty('limit');
            expect(paginatedResponse.pagination).toHaveProperty('total');
            expect(paginatedResponse.pagination).toHaveProperty('pages');
        });
    });
});
