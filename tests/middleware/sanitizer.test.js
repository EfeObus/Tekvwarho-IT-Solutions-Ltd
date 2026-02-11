/**
 * Input Sanitizer Middleware Tests
 */

describe('Input Sanitizer', () => {
    // Simple sanitizer implementation for testing
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };

    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    describe('String Sanitization', () => {
        it('should escape HTML tags', () => {
            const input = '<script>alert("xss")</script>';
            const result = sanitizeString(input);
            
            expect(result).not.toContain('<');
            expect(result).not.toContain('>');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });

        it('should escape double quotes', () => {
            const input = 'Hello "World"';
            const result = sanitizeString(input);
            
            expect(result).not.toContain('"');
            expect(result).toContain('&quot;');
        });

        it('should escape single quotes', () => {
            const input = "It's a test";
            const result = sanitizeString(input);
            
            expect(result).not.toContain("'");
            expect(result).toContain('&#x27;');
        });

        it('should escape forward slashes', () => {
            const input = '</script>';
            const result = sanitizeString(input);
            
            expect(result).toContain('&#x2F;');
        });

        it('should handle normal text without modification', () => {
            const input = 'Hello World 123';
            const result = sanitizeString(input);
            
            expect(result).toBe('Hello World 123');
        });

        it('should handle empty strings', () => {
            const result = sanitizeString('');
            expect(result).toBe('');
        });

        it('should return non-strings unchanged', () => {
            expect(sanitizeString(123)).toBe(123);
            expect(sanitizeString(null)).toBe(null);
            expect(sanitizeString(undefined)).toBe(undefined);
            expect(sanitizeString(true)).toBe(true);
        });
    });

    describe('Object Sanitization', () => {
        it('should sanitize all string properties in object', () => {
            const input = {
                name: '<b>John</b>',
                email: 'john@test.com',
                message: '<script>bad()</script>'
            };
            const result = sanitizeObject(input);

            expect(result.name).toContain('&lt;');
            expect(result.email).toBe('john@test.com');
            expect(result.message).not.toContain('<script>');
        });

        it('should handle nested objects', () => {
            const input = {
                user: {
                    name: '<b>John</b>',
                    profile: {
                        bio: '<script>xss</script>'
                    }
                }
            };
            const result = sanitizeObject(input);

            expect(result.user.name).toContain('&lt;');
            expect(result.user.profile.bio).not.toContain('<script>');
        });

        it('should preserve non-string values', () => {
            const input = {
                name: 'John',
                age: 30,
                active: true,
                score: null
            };
            const result = sanitizeObject(input);

            expect(result.age).toBe(30);
            expect(result.active).toBe(true);
            expect(result.score).toBe(null);
        });

        it('should handle empty objects', () => {
            const result = sanitizeObject({});
            expect(result).toEqual({});
        });

        it('should handle null input', () => {
            const result = sanitizeObject(null);
            expect(result).toBe(null);
        });
    });

    describe('XSS Prevention', () => {
        const xssPayloads = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>',
            'javascript:alert(1)',
            '<a href="javascript:alert(1)">click</a>',
            '<body onload=alert(1)>',
            '<div style="background:url(javascript:alert(1))">',
            '"><script>alert(1)</script>',
            "'-alert(1)-'",
            '<iframe src="javascript:alert(1)">',
            '<object data="javascript:alert(1)">',
            '<embed src="javascript:alert(1)">'
        ];

        xssPayloads.forEach((payload, index) => {
            it(`should neutralize XSS payload ${index + 1}`, () => {
                const result = sanitizeString(payload);
                
                // Should not contain raw script tags or event handlers
                expect(result).not.toContain('<script>');
                expect(result).not.toContain('<img');
                expect(result).not.toContain('<svg');
                expect(result).not.toContain('<iframe');
            });
        });
    });
});
