# Deployment Guide

> **Version:** 1.0  
> **Last Updated:** January 5, 2026

This guide covers deploying Tekvwarho IT Solutions to various environments.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Cloud Deployment Options](#cloud-deployment-options)
- [Database Setup](#database-setup)
- [SSL/HTTPS Configuration](#sslhttps-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ (20.x recommended) | Application runtime |
| npm | 9+ | Package manager |
| PostgreSQL | 14+ | Database |
| Git | 2.x | Version control |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| PM2 | Process management |
| Nginx | Reverse proxy |
| Certbot | SSL certificates |

---

## Environment Configuration

### Required Variables

Create a `.env` file with these variables:

```env
# Server Configuration
PORT=5500
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tekvwarho_IT_solutions

# Authentication (MUST be unique, strong secrets)
JWT_SECRET=generate-a-256-bit-random-string-here
JWT_REFRESH_SECRET=generate-another-256-bit-random-string

# Admin Account
ADMIN_EMAIL=admin@tekvwarho.com
ADMIN_PASSWORD=strong-initial-password

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@tekvwarho.com
ADMIN_NOTIFICATION_EMAIL=admin@tekvwarho.com

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Generating Secrets

```bash
# Generate a secure JWT secret (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using openssl
openssl rand -hex 64
```

---

## Local Development

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd.git
cd Tekvwarho-IT-Solutions-Ltd

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 4. Set up database
createdb tekvwarho_IT_solutions
psql -d tekvwarho_IT_solutions -f database/schema.sql
psql -d tekvwarho_IT_solutions -f database/migrations/003_saved_replies_drafts.sql

# 5. Start development server
npm run dev
```

### Development URLs

- **Website:** http://localhost:5500
- **Admin Dashboard:** http://localhost:5500/admin
- **API:** http://localhost:5500/api

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Configure production database with SSL
- [ ] Set up SMTP for email notifications
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Review and test rate limiting
- [ ] Remove any test/debug code

### Step-by-Step Deployment

#### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

#### 2. Set Up Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE tekvwarho_IT_solutions;
CREATE USER tekvwarho_user WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE tekvwarho_IT_solutions TO tekvwarho_user;
\q

# Import schema
psql -U tekvwarho_user -d tekvwarho_IT_solutions -f database/schema.sql
psql -U tekvwarho_user -d tekvwarho_IT_solutions -f database/migrations/003_saved_replies_drafts.sql
```

#### 3. Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/EfeObus/Tekvwarho-IT-Solutions-Ltd.git tekvwarho
cd tekvwarho

# Install production dependencies
npm install --production

# Create .env file
sudo cp .env.example .env
sudo nano .env  # Configure for production

# Start with PM2
pm2 start server/index.js --name tekvwarho
pm2 save
pm2 startup
```

#### 4. Configure Nginx

```nginx
# /etc/nginx/sites-available/tekvwarho
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tekvwarho /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 5. Set Up SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (should be automatic, but verify)
sudo certbot renew --dry-run
```

---

## Cloud Deployment Options

### AWS (EC2 + RDS)

1. Launch EC2 instance (t3.small or larger)
2. Create RDS PostgreSQL instance
3. Configure security groups
4. Follow production deployment steps
5. Set up Elastic IP

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create tekvwarho-it-solutions

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... set other variables

# Deploy
git push heroku main
```

### DigitalOcean

1. Create Droplet (2GB RAM minimum)
2. Create Managed PostgreSQL
3. Follow production deployment steps
4. Configure firewall (UFW)

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add -p postgresql

# Deploy
railway up
```

---

## Database Setup

### Production PostgreSQL Configuration

```sql
-- /etc/postgresql/14/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 7864kB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 6553kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Enable SSL for Database

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add:
hostssl all all 0.0.0.0/0 scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Database Connection String

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

---

## SSL/HTTPS Configuration

### Let's Encrypt (Recommended)

```bash
# Automatic renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Self-Signed (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs tekvwarho

# Monitor processes
pm2 monit

# View status
pm2 status
```

### Application Logging

Logs are stored in:
- `~/.pm2/logs/tekvwarho-out.log` (stdout)
- `~/.pm2/logs/tekvwarho-error.log` (stderr)

### Log Rotation

```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Health Check

```bash
# Add health check endpoint
curl http://localhost:5500/api/health
```

---

## Backup Strategy

See [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) for complete backup procedures.

### Quick Backup Commands

```bash
# Database backup
pg_dump -h localhost -U tekvwarho_user -d tekvwarho_IT_solutions > backup_$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h localhost -U tekvwarho_user -d tekvwarho_IT_solutions | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
psql -h localhost -U tekvwarho_user -d tekvwarho_IT_solutions < backup.sql
```

### Automated Backups

```bash
# Create backup script
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/home/ubuntu/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U tekvwarho_user tekvwarho_IT_solutions | gzip > $BACKUP_DIR/db_$DATE.sql.gz
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup.sh
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :5500
# Kill process
kill -9 <PID>
```

#### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U tekvwarho_user -d tekvwarho_IT_solutions

# Check logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

#### PM2 Issues

```bash
# Restart application
pm2 restart tekvwarho

# Delete and restart
pm2 delete tekvwarho
pm2 start server/index.js --name tekvwarho

# Clear PM2 logs
pm2 flush
```

#### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log

# Restart
sudo systemctl restart nginx
```

#### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

---

## Support

For deployment assistance, contact **efe.obukohwo@outlook.com**
