# Tekvwarho IT Solutions - Dockerfile
# Multi-stage build for optimized production image

# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

# Add labels for metadata
LABEL maintainer="Tekvwarho IT Solutions <efe.obukohwo@outlook.com>"
LABEL version="1.0"
LABEL description="Tekvwarho IT Solutions Website with Admin Dashboard"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5500

# Copy package files
COPY package*.json ./

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Remove development files
RUN rm -rf .git .gitignore .env.example nodemon.json

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5500

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5500/api/health || exit 1

# Start the application
CMD ["node", "server/index.js"]
