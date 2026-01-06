# Contributing to Tekvwarho IT Solutions

> **Version:** 1.0  
> **Last Updated:** January 5, 2026

Thank you for considering contributing to Tekvwarho IT Solutions! This document provides guidelines and standards for contributing to this project.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Security Guidelines](#security-guidelines)

---

## Code of Conduct

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the project
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment, trolling, or personal attacks
- Publishing private information without consent
- Any conduct inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20.x)
- PostgreSQL 14+
- Git
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd.git
   cd Tekvwarho-IT-Solutions-Ltd
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Initialize database**
   ```bash
   createdb tekvwarho_IT_solutions
   psql -d tekvwarho_IT_solutions -f database/schema.sql
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branch Naming Convention

```
feature/    - New features (feature/add-user-export)
bugfix/     - Bug fixes (bugfix/fix-login-error)
security/   - Security updates (security/update-jwt-expiry)
docs/       - Documentation (docs/update-api-docs)
refactor/   - Code refactoring (refactor/clean-auth-logic)
```

### Workflow

1. Create a new branch from `main`
2. Make your changes
3. Write/update tests if applicable
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request

---

## Code Style Guidelines

### JavaScript/Node.js

#### General

- Use ES6+ features (const, let, arrow functions, async/await)
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Maximum line length: 100 characters

#### Naming Conventions

```javascript
// Variables and functions: camelCase
const userName = 'john';
function getUserById(id) { }

// Classes: PascalCase
class UserService { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private methods: _prefixUnderscore
_privateMethod() { }

// Files: camelCase or kebab-case
// userService.js or user-service.js
```

#### Functions

```javascript
// Good: Descriptive function names
async function findUserByEmail(email) { }

// Good: Early returns for validation
async function createUser(data) {
    if (!data.email) {
        throw new Error('Email is required');
    }
    
    if (!data.password) {
        throw new Error('Password is required');
    }
    
    // ... rest of logic
}

// Good: Use async/await over promises
async function getUsers() {
    try {
        const result = await db.query('SELECT * FROM users');
        return result.rows;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}
```

#### Error Handling

```javascript
// Good: Always handle errors
try {
    await someAsyncOperation();
} catch (error) {
    console.error('Operation failed:', error);
    throw new AppError('Operation failed', 500);
}

// Good: Use custom error classes
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}
```

### SQL

```sql
-- Use UPPERCASE for SQL keywords
SELECT id, name, email
FROM users
WHERE status = 'active'
ORDER BY created_at DESC;

-- Always use parameterized queries
const result = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [userId]
);

-- Never concatenate user input
// BAD: `SELECT * FROM users WHERE id = ${userId}`
// GOOD: Use parameterized queries
```

### CSS

```css
/* Use BEM naming convention */
.block { }
.block__element { }
.block--modifier { }

/* Example */
.pagination { }
.pagination__button { }
.pagination__button--active { }
```

### Comments

```javascript
/**
 * JSDoc for functions
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} User object with token
 */
async function login(email, password) { }

// Inline comments for complex logic
// Calculate weighted score based on multiple factors
const score = (messageRate * 0.25) + (chatRate * 0.20);

// TODO: Implement feature X in future sprint
// FIXME: This is a temporary workaround
// NOTE: This requires database migration
```

---

## Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation changes |
| style | Formatting (no code change) |
| refactor | Code restructuring |
| test | Adding/updating tests |
| chore | Maintenance tasks |
| security | Security improvements |
| perf | Performance improvements |

### Examples

```bash
feat(auth): add JWT refresh token support

- Implement token rotation on refresh
- Add session management endpoints
- Store refresh tokens in database

Closes #123

---

fix(messages): resolve pagination offset error

The offset calculation was incorrect when page > 1,
causing duplicate results.

---

docs(api): update authentication documentation

- Add refresh token endpoint
- Document rate limiting headers
- Add error response examples
```

---

## Pull Request Process

### Before Submitting

1. ✅ Code follows style guidelines
2. ✅ All tests pass
3. ✅ New code has appropriate tests
4. ✅ Documentation is updated
5. ✅ No console.log statements left behind
6. ✅ No commented-out code
7. ✅ Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
Describe testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No breaking changes

## Screenshots (if applicable)
```

### Review Process

1. Submit PR with completed template
2. Automated checks run (if configured)
3. Code review by maintainer
4. Address feedback if needed
5. Approval and merge

---

## Testing Guidelines

### Unit Tests

```javascript
// Test file naming: *.test.js or *.spec.js
// Example: userService.test.js

describe('UserService', () => {
    describe('findByEmail', () => {
        it('should return user when email exists', async () => {
            // Arrange
            const email = 'test@example.com';
            
            // Act
            const user = await UserService.findByEmail(email);
            
            // Assert
            expect(user).toBeDefined();
            expect(user.email).toBe(email);
        });
        
        it('should return null when email not found', async () => {
            const user = await UserService.findByEmail('nonexistent@example.com');
            expect(user).toBeNull();
        });
    });
});
```

### API Tests

```javascript
describe('POST /api/admin/login', () => {
    it('should return tokens on valid credentials', async () => {
        const response = await request(app)
            .post('/api/admin/login')
            .send({
                email: 'admin@test.com',
                password: 'validpassword'
            });
        
        expect(response.status).toBe(200);
        expect(response.body.accessToken).toBeDefined();
        expect(response.body.refreshToken).toBeDefined();
    });
    
    it('should return 401 on invalid credentials', async () => {
        const response = await request(app)
            .post('/api/admin/login')
            .send({
                email: 'admin@test.com',
                password: 'wrongpassword'
            });
        
        expect(response.status).toBe(401);
    });
});
```

---

## Security Guidelines

### DO

- ✅ Use parameterized queries for all database operations
- ✅ Validate and sanitize all user input
- ✅ Use bcrypt for password hashing
- ✅ Implement rate limiting on sensitive endpoints
- ✅ Use HTTPS in production
- ✅ Log security events to audit log
- ✅ Use environment variables for secrets

### DON'T

- ❌ Never log passwords or tokens
- ❌ Never commit secrets to repository
- ❌ Never trust user input
- ❌ Never expose stack traces in production
- ❌ Never disable security headers
- ❌ Never use eval() or similar

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email **efe.obukohwo@outlook.com** with:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
3. Allow time for fix before disclosure

---

## Questions?

Contact **efe.obukohwo@outlook.com** for any questions about contributing.

---

<p align="center">
  <strong>Thank you for contributing to Tekvwarho IT Solutions!</strong>
</p>
