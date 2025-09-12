# ProcessPilot Environment Variables Documentation

*Comprehensive guide to all environment variables and configuration options*

---

## 📋 Table of Contents

- [Overview](#overview)
- [Variable Categories](#variable-categories)
- [Complete Variable Reference](#complete-variable-reference)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Security Considerations](#security-considerations)
- [Validation and Troubleshooting](#validation-and-troubleshooting)
- [Provider-Specific Setup](#provider-specific-setup)

---

## 🌍 Overview

ProcessPilot uses **30+ environment variables** to configure various aspects of the application, from database connections to security settings. All variables are validated at startup using a comprehensive validation system that ensures proper configuration across all environments.

### Key Features

- **Schema-based validation** with detailed error messages
- **Environment-aware defaults** (development vs production)
- **Multi-provider database support** (6 different providers)
- **Security validation** with production-specific checks
- **Conditional requirements** (variables required only in specific scenarios)

### Configuration Files

- **Backend**: `backend/.env` (main configuration)
- **Backend BaaS**: `backend/.env.baas.example` (multi-provider examples)
- **Validation**: `backend/src/config/env-validation.js` (schema definitions)

---

## 📊 Variable Categories

### Core Configuration (5 variables)
- Server settings (NODE_ENV, PORT, HOST)
- Application environment configuration

### Database Configuration (13 variables)
- Multi-provider support (PostgreSQL, Supabase, PlanetScale, Neon, Railway)
- Connection pooling and SSL configuration

### Security & Authentication (7 variables)
- JWT tokens and session management
- CSRF protection and rate limiting

### Communication (5 variables)
- Email/SMTP configuration
- External webhook integrations

### Operational (6+ variables)
- Logging, file uploads, monitoring
- Development and debugging tools

---

## 📖 Complete Variable Reference

### Core Server Configuration

#### `NODE_ENV` ⭐ **Required**
- **Type**: String
- **Values**: `development` | `test` | `production`
- **Default**: `development`
- **Description**: Application environment mode

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
```

**Impact**:
- **Development**: Permissive CORS, detailed logging, hot reload support
- **Production**: Strict security, optimized logging, production optimizations
- **Test**: Isolated test database, mock services

#### `PORT`
- **Type**: Number
- **Range**: 1000-65535
- **Default**: `5000`
- **Description**: Server port number

```bash
PORT=5000                    # Default
PORT=3001                    # Alternative port
PORT=${PORT:-5000}           # Use system PORT or default
```

#### `HOST`
- **Type**: String
- **Default**: `localhost`
- **Description**: Server bind address

```bash
HOST=localhost               # Local development
HOST=0.0.0.0                # Accept all connections
HOST=192.168.1.100          # Specific interface
```

---

### Database Configuration

#### `DB_PROVIDER` ⭐ **Core**
- **Type**: String
- **Values**: `postgresql` | `supabase` | `planetscale` | `neon` | `railway` | `generic`
- **Default**: `postgresql`
- **Description**: Database provider type

```bash
DB_PROVIDER=postgresql       # Local/hosted PostgreSQL
DB_PROVIDER=supabase        # Supabase (recommended for quick setup)
DB_PROVIDER=planetscale     # PlanetScale (MySQL)
DB_PROVIDER=neon            # Neon (serverless PostgreSQL)
DB_PROVIDER=railway         # Railway (managed PostgreSQL)
DB_PROVIDER=generic         # Generic PostgreSQL-compatible
```

#### `DB_HOST` **Conditional**
- **Type**: String
- **Required**: When `DB_PROVIDER=postgresql` and no `DATABASE_URL`
- **Description**: Database hostname

```bash
DB_HOST=localhost            # Local PostgreSQL
DB_HOST=my-db.example.com   # Remote PostgreSQL
DB_HOST=127.0.0.1           # IP address
```

#### `DB_PORT`
- **Type**: Number
- **Range**: 1-65535
- **Default**: `5432` (PostgreSQL) | `3306` (PlanetScale)
- **Description**: Database port number

```bash
DB_PORT=5432                # PostgreSQL default
DB_PORT=3306                # MySQL/PlanetScale
DB_PORT=5433                # Alternative PostgreSQL port
```

#### `DB_NAME` **Conditional**
- **Type**: String
- **Required**: When `DB_PROVIDER=postgresql` and no `DATABASE_URL`
- **Description**: Database name

```bash
DB_NAME=process_pilot        # Main database
DB_NAME=process_pilot_prod  # Production database
```

#### `DB_USER` **Conditional**
- **Type**: String
- **Required**: When `DB_PROVIDER=postgresql` and no `DATABASE_URL`
- **Description**: Database username

```bash
DB_USER=postgres            # Default PostgreSQL user
DB_USER=processpilot       # Custom user
DB_USER=admin              # Administrative user
```

#### `DB_PASSWORD` 🔐 **Sensitive, Conditional**
- **Type**: String (Sensitive)
- **Required**: When `DB_PROVIDER=postgresql` and no `DATABASE_URL`
- **Description**: Database password

```bash
DB_PASSWORD=your_password   # Custom password
DB_PASSWORD=                # Empty for local development
# In production: use strong, unique passwords
```

#### `DATABASE_URL` 🔐 **Sensitive, Conditional**
- **Type**: URL (Sensitive)
- **Required**: For BaaS providers (supabase, planetscale, neon, railway)
- **Description**: Complete database connection string

```bash
# PostgreSQL format
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# PlanetScale
DATABASE_URL=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}

# Neon
DATABASE_URL=postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require

# Railway
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/railway
```

#### `DB_SSL`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable SSL for database connections

```bash
DB_SSL=false                # Local development
DB_SSL=true                 # Production (recommended)
```

**Production Note**: Always enable SSL in production environments for security.

#### `DB_POOL_MIN`
- **Type**: Number
- **Range**: 0-50
- **Default**: `2`
- **Description**: Minimum database connection pool size

```bash
DB_POOL_MIN=2               # Development
DB_POOL_MIN=5               # Production with higher load
DB_POOL_MIN=0               # Serverless (Neon)
```

#### `DB_POOL_MAX`
- **Type**: Number
- **Range**: 1-100
- **Default**: `10`
- **Description**: Maximum database connection pool size

```bash
DB_POOL_MAX=10              # Standard setup
DB_POOL_MAX=20              # High-traffic production
DB_POOL_MAX=5               # Resource-constrained environments
```

**Sizing Guidelines**:
- **Development**: MIN=2, MAX=10
- **Production**: MIN=5, MAX=20
- **Serverless**: MIN=0, MAX=5

---

### Security & Authentication

#### `JWT_SECRET` ⭐🔐 **Required, Sensitive**
- **Type**: String (Sensitive)
- **Minimum Length**: 32 characters
- **Description**: JWT access token signing secret

```bash
# ❌ NEVER use in production
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# ✅ Generate secure secret
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Generate with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security Requirements**:
- **Minimum**: 32 characters
- **Production**: Cryptographically secure random string
- **Rotation**: Should be rotated periodically

#### `JWT_EXPIRES_IN`
- **Type**: String (Time format)
- **Pattern**: `/^(\d+[smhd]|\d+)$/`
- **Default**: `15m`
- **Description**: JWT access token expiration time

```bash
JWT_EXPIRES_IN=15m          # 15 minutes (recommended)
JWT_EXPIRES_IN=1h           # 1 hour
JWT_EXPIRES_IN=30m          # 30 minutes
JWT_EXPIRES_IN=3600         # 3600 seconds (1 hour)
```

**Format Examples**:
- `s` = seconds: `300s` (5 minutes)
- `m` = minutes: `15m` (15 minutes)
- `h` = hours: `2h` (2 hours)  
- `d` = days: `1d` (1 day)

#### `JWT_REFRESH_SECRET` ⭐🔐 **Required, Sensitive**
- **Type**: String (Sensitive)
- **Minimum Length**: 32 characters
- **Description**: JWT refresh token signing secret

```bash
# Must be different from JWT_SECRET
JWT_REFRESH_SECRET=different-secure-secret-for-refresh-tokens-minimum-32-chars

# Generate separately from JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security Note**: Must be different from `JWT_SECRET` for security isolation.

#### `JWT_REFRESH_EXPIRES_IN`
- **Type**: String (Time format)
- **Default**: `7d`
- **Description**: JWT refresh token expiration time

```bash
JWT_REFRESH_EXPIRES_IN=7d   # 7 days (recommended)
JWT_REFRESH_EXPIRES_IN=30d  # 30 days
JWT_REFRESH_EXPIRES_IN=168h # 168 hours (7 days)
```

#### `SESSION_SECRET` ⭐🔐 **Required, Sensitive**
- **Type**: String (Sensitive)
- **Minimum Length**: 32 characters
- **Description**: Session secret for CSRF protection

```bash
# Generate secure session secret
SESSION_SECRET=session-secret-for-csrf-protection-minimum-32-characters-long

# Generate with Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Purpose**: Used for CSRF protection with Double Submit Cookie pattern.

#### `RATE_LIMIT_WINDOW_MS`
- **Type**: Number
- **Range**: 60000-3600000 (1 minute to 1 hour)
- **Default**: `900000` (15 minutes)
- **Description**: Rate limiting time window in milliseconds

```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes (recommended)
RATE_LIMIT_WINDOW_MS=300000  # 5 minutes (stricter)
RATE_LIMIT_WINDOW_MS=1800000 # 30 minutes (more permissive)
```

#### `RATE_LIMIT_MAX_REQUESTS`
- **Type**: Number
- **Range**: 10-10000
- **Default**: `100`
- **Description**: Maximum requests per rate limit window

```bash
RATE_LIMIT_MAX_REQUESTS=100  # Standard (100 requests/15min)
RATE_LIMIT_MAX_REQUESTS=50   # Strict (50 requests/15min)
RATE_LIMIT_MAX_REQUESTS=200  # Permissive (200 requests/15min)
```

**Rate Limit Examples**:
- **Development**: 200 requests/15min
- **Production**: 100 requests/15min
- **High-security**: 50 requests/5min

---

### CORS Configuration

#### `CORS_ORIGIN`
- **Type**: String
- **Default**: `http://localhost:3000` (development) | `''` (production)
- **Description**: CORS allowed origins (comma-separated for multiple)

```bash
# Development
CORS_ORIGIN=http://localhost:3000

# Production - single domain
CORS_ORIGIN=https://app.processpilot.com

# Production - multiple domains
CORS_ORIGIN=https://app.processpilot.com,https://processpilot.com,https://www.processpilot.com

# Staging
CORS_ORIGIN=https://staging.processpilot.com
```

**Security Warning**: Never use `*` in production. Always specify exact domains.

---

### Email/SMTP Configuration

#### `SMTP_HOST` **Optional**
- **Type**: String
- **Description**: SMTP server hostname

```bash
# Gmail
SMTP_HOST=smtp.gmail.com

# Outlook/Hotmail
SMTP_HOST=smtp-mail.outlook.com

# Custom SMTP
SMTP_HOST=mail.yourdomain.com
```

#### `SMTP_PORT` **Conditional**
- **Type**: Number
- **Range**: 1-65535
- **Default**: `587`
- **Required**: When `SMTP_HOST` is set
- **Description**: SMTP server port

```bash
SMTP_PORT=587               # TLS (recommended)
SMTP_PORT=465               # SSL
SMTP_PORT=25                # Unencrypted (not recommended)
```

#### `SMTP_USER` **Conditional**
- **Type**: Email
- **Required**: When `SMTP_HOST` is set
- **Description**: SMTP authentication username

```bash
SMTP_USER=your-email@gmail.com
SMTP_USER=notifications@yourdomain.com
```

#### `SMTP_PASS` 🔐 **Sensitive, Conditional**
- **Type**: String (Sensitive)
- **Required**: When `SMTP_HOST` is set
- **Description**: SMTP authentication password

```bash
# Gmail: Use App Password (not regular password)
SMTP_PASS=your-app-password

# Other providers: Regular password or API key
SMTP_PASS=your-smtp-password
```

**Gmail Setup**: Use App Passwords, not regular passwords. Enable 2FA first.

#### `FROM_EMAIL` **Conditional**
- **Type**: Email
- **Required**: When `SMTP_HOST` is set
- **Description**: Default sender email address

```bash
FROM_EMAIL=noreply@processpilot.com
FROM_EMAIL=notifications@yourdomain.com
```

---

### Logging & Monitoring

#### `LOG_LEVEL`
- **Type**: String
- **Values**: `error` | `warn` | `info` | `http` | `verbose` | `debug` | `silly`
- **Default**: `info` (production) | `debug` (development)
- **Description**: Winston logging level

```bash
# Production
LOG_LEVEL=info              # Standard production logging

# Development
LOG_LEVEL=debug             # Detailed development logs

# Troubleshooting
LOG_LEVEL=verbose           # Very detailed logs
LOG_LEVEL=silly             # Everything (use sparingly)

# Error-only
LOG_LEVEL=error             # Only errors and above
```

**Level Hierarchy**: `error` > `warn` > `info` > `http` > `verbose` > `debug` > `silly`

#### `LOG_FORMAT`
- **Type**: String
- **Values**: `combined` | `common` | `dev` | `short` | `tiny`
- **Default**: `combined`
- **Description**: HTTP request logging format (Morgan)

```bash
LOG_FORMAT=combined         # Standard Apache format
LOG_FORMAT=dev              # Development-friendly format
LOG_FORMAT=short            # Minimal logging
```

#### `DEBUG_SQL`
- **Type**: Boolean
- **Default**: `false`
- **Description**: Enable SQL query debugging

```bash
DEBUG_SQL=false             # Production (recommended)
DEBUG_SQL=true              # Development debugging
```

**Warning**: Never enable in production - exposes sensitive data in logs.

---

### File Upload & Storage

#### `MAX_FILE_SIZE`
- **Type**: Number
- **Range**: 1024-104857600 (1KB to 100MB)
- **Default**: `5242880` (5MB)
- **Description**: Maximum file upload size in bytes

```bash
MAX_FILE_SIZE=5242880       # 5MB (default)
MAX_FILE_SIZE=10485760      # 10MB
MAX_FILE_SIZE=1048576       # 1MB
MAX_FILE_SIZE=52428800      # 50MB
```

**Size Calculations**:
- 1KB = 1,024 bytes
- 1MB = 1,048,576 bytes
- 5MB = 5,242,880 bytes
- 10MB = 10,485,760 bytes

#### `UPLOAD_PATH`
- **Type**: String
- **Default**: `./uploads`
- **Description**: File upload directory path

```bash
UPLOAD_PATH=./uploads        # Relative path
UPLOAD_PATH=/var/uploads     # Absolute path
UPLOAD_PATH=/tmp/uploads     # Temporary storage
```

---

### External Integrations

#### `REDIS_URL` **Optional**
- **Type**: URL
- **Description**: Redis connection URL for caching

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# Redis with auth
REDIS_URL=redis://:password@localhost:6379

# Redis Cloud
REDIS_URL=redis://user:password@redis-host:port
```

#### `SLACK_WEBHOOK_URL` 🔐 **Sensitive, Optional**
- **Type**: URL (Sensitive)
- **Description**: Slack webhook URL for notifications

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

#### `TEAMS_WEBHOOK_URL` 🔐 **Sensitive, Optional**
- **Type**: URL (Sensitive)  
- **Description**: Microsoft Teams webhook URL for notifications

```bash
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/[webhook-id]/[webhook-token]
```

---

## 🏗️ Environment-Specific Configuration

### Development Environment

**Purpose**: Local development with hot reload and debugging

```bash
# Core
NODE_ENV=development
PORT=5000
HOST=localhost

# Database - Local PostgreSQL
DB_PROVIDER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=process_pilot
DB_USER=postgres
DB_PASSWORD=
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Security - Development secrets (CHANGE THESE!)
JWT_SECRET=dev-jwt-secret-minimum-32-characters-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=dev-refresh-secret-minimum-32-characters-different
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=dev-session-secret-minimum-32-characters-for-csrf

# CORS - Permissive for local development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting - Permissive
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# Logging - Detailed
LOG_LEVEL=debug
LOG_FORMAT=dev
DEBUG_SQL=false

# Email - Optional for development
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-dev-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=dev@processpilot.com

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### Staging Environment

**Purpose**: Production-like environment for final testing

```bash
# Core
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database - Managed service (example: Supabase)
DB_PROVIDER=supabase
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
DB_SSL=true
DB_POOL_MIN=2
DB_POOL_MAX=15

# Security - Staging secrets (MUST be secure)
JWT_SECRET=[64-char-secure-random-string]
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=[64-char-secure-random-string-different]
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=[64-char-secure-random-string-for-csrf]

# CORS - Staging domain only
CORS_ORIGIN=https://staging.processpilot.com

# Rate Limiting - Production-like
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging - Production level
LOG_LEVEL=info
LOG_FORMAT=combined
DEBUG_SQL=false

# Email - Production SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging@processpilot.com
SMTP_PASS=[secure-app-password]
FROM_EMAIL=staging@processpilot.com

# File Upload - Production limits
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/uploads
```

### Production Environment

**Purpose**: Live production system with maximum security

```bash
# Core
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database - Production-grade with SSL
DB_PROVIDER=postgresql
DB_HOST=prod-db.processpilot.com
DB_PORT=5432
DB_NAME=processpilot_prod
DB_USER=processpilot_prod
DB_PASSWORD=[secure-database-password]
DB_SSL=true
DB_POOL_MIN=5
DB_POOL_MAX=20

# Security - Maximum security
JWT_SECRET=[128-char-cryptographically-secure-secret]
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=[128-char-cryptographically-secure-secret-different]
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=[128-char-cryptographically-secure-secret-for-csrf]

# CORS - Exact production domains only
CORS_ORIGIN=https://app.processpilot.com,https://processpilot.com

# Rate Limiting - Restrictive
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging - Optimized for production
LOG_LEVEL=info
LOG_FORMAT=combined
DEBUG_SQL=false

# Email - Production SMTP with monitoring
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=[sendgrid-api-key]
FROM_EMAIL=noreply@processpilot.com

# File Upload - Security-conscious
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/secure/uploads

# Monitoring & Integration
REDIS_URL=redis://:[password]@prod-redis.processpilot.com:6379
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/[prod-webhook]
```

---

## 🔐 Security Considerations

### Critical Security Variables

#### Sensitive Variables (Never log or expose)
- `DB_PASSWORD` - Database authentication
- `DATABASE_URL` - Complete connection strings
- `JWT_SECRET` - Access token signing
- `JWT_REFRESH_SECRET` - Refresh token signing  
- `SESSION_SECRET` - CSRF protection
- `SMTP_PASS` - Email authentication
- `SLACK_WEBHOOK_URL` - Webhook endpoints
- `TEAMS_WEBHOOK_URL` - Webhook endpoints

#### Production Security Requirements

**Secret Strength**:
```bash
# ❌ WEAK - Never use in production
JWT_SECRET=your-secret-key

# ✅ STRONG - Cryptographically secure
JWT_SECRET=a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef
```

**Secret Generation**:
```bash
# Generate 32-byte (64-char) hex secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate 64-byte (128-char) hex secrets for production
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate base64 secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### CORS Security

```bash
# ❌ DANGEROUS - Never use in production
CORS_ORIGIN=*

# ✅ SECURE - Exact domains only
CORS_ORIGIN=https://app.processpilot.com

# ✅ SECURE - Multiple specific domains
CORS_ORIGIN=https://app.processpilot.com,https://processpilot.com
```

#### Database Security

```bash
# Production database security checklist:
DB_SSL=true                 # ✅ Always enable SSL
DB_PASSWORD=[strong-pass]   # ✅ Use strong passwords
DB_USER=app_user           # ✅ Use dedicated app user (not postgres/root)
```

### Secret Rotation Procedures

#### JWT Secret Rotation
1. **Generate new secrets** using cryptographically secure methods
2. **Update environment** during maintenance window
3. **Restart application** to load new secrets
4. **Invalidate old tokens** (users will need to re-authenticate)

#### Database Password Rotation
1. **Create new database user** with new password
2. **Test connectivity** with new credentials
3. **Update environment** variables
4. **Restart application**
5. **Remove old database user**

#### Session Secret Rotation
1. **Generate new session secret**
2. **Update environment** 
3. **Restart application**
4. **Note**: Users may need to log in again due to CSRF token invalidation

### Environment Variable Encryption

#### For Container Orchestration
```yaml
# Kubernetes Secret example
apiVersion: v1
kind: Secret
metadata:
  name: processpilot-secrets
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
```

#### For CI/CD Systems
- **GitHub Actions**: Use repository secrets
- **GitLab CI**: Use protected variables
- **Azure DevOps**: Use variable groups with encryption
- **AWS**: Use Parameter Store or Secrets Manager

---

## ✅ Validation and Troubleshooting

### Environment Validation

ProcessPilot includes comprehensive environment validation that runs at startup:

```bash
# Backend validation runs automatically
cd backend && npm run dev

# Output examples:
✅ Environment validation passed
🌍 Environment summary: {
  NODE_ENV: 'development',
  PORT: 5000,
  DB_PROVIDER: 'postgresql',
  EMAIL_CONFIGURED: true,
  REDIS_CONFIGURED: false,
  LOG_LEVEL: 'debug'
}
```

### Manual Validation

```bash
# Test environment loading
cd backend
node -e "
require('dotenv').config();
const { validateEnvironment } = require('./src/config/env-validation');
const result = validateEnvironment();
console.log('Validation:', result.isValid ? 'PASSED' : 'FAILED');
if (!result.isValid) {
  console.log('Errors:', result.errors);
}
"
```

### Common Validation Errors

#### Missing Required Variables
```bash
❌ JWT_SECRET is required (JWT signing secret (minimum 32 characters))
💡 Solution: Add JWT_SECRET to your .env file with at least 32 characters
```

#### Invalid Variable Format
```bash
❌ PORT must be a valid number
💡 Solution: Ensure PORT contains only numbers (e.g., PORT=5000)
```

#### Production Security Warnings
```bash
❌ [PRODUCTION] JWT_SECRET must be set to a secure value in production
💡 Solution: Generate a cryptographically secure secret for production
```

#### Database Connection Issues
```bash
❌ DB_HOST is required (Database host address)
💡 Solution: Set DB_HOST when using DB_PROVIDER=postgresql without DATABASE_URL
```

### Environment Setup Verification

```bash
# Use the validation script from setup tools
node scripts/validate-setup.js --verbose

# Check specific configuration
curl http://localhost:5000/health/detailed
```

### Troubleshooting Steps

1. **Check file exists**: Ensure `.env` file exists in `backend/` directory
2. **Verify syntax**: Ensure no spaces around `=` signs: `KEY=value` not `KEY = value`
3. **Check permissions**: Ensure `.env` file is readable
4. **Validate format**: Use validation script to check all variables
5. **Test connection**: Use health endpoints to verify configuration

### Environment Loading Order

ProcessPilot loads environment variables in this order:
1. **System environment variables** (highest priority)
2. **`.env` file** in backend directory
3. **Default values** from validation schema (lowest priority)

```bash
# Check what's actually loaded
cd backend
node -e "
require('dotenv').config();
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_PROVIDER:', process.env.DB_PROVIDER);
"
```

---

## 🌐 Provider-Specific Setup

### PostgreSQL (Local/Hosted)

```bash
# Standard PostgreSQL setup
DB_PROVIDER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=process_pilot
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Setup Steps**:
1. Install PostgreSQL 13+
2. Create database: `createdb process_pilot`
3. Configure credentials in `.env`
4. Run migrations: `npm run db:migrate`

### Supabase (Recommended BaaS)

```bash
# Supabase configuration
DB_PROVIDER=supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DB_SSL=true
DB_POOL_MIN=1
DB_POOL_MAX=10

# Optional: Individual parameters
# SUPABASE_URL=https://[project-ref].supabase.co
# SUPABASE_ANON_KEY=[anon-key]
# SUPABASE_SERVICE_KEY=[service-key]
```

**Setup Steps**:
1. Create Supabase account and project
2. Get database URL from Settings → Database
3. Configure environment variables
4. Run migrations: `npm run db:migrate`

### PlanetScale (MySQL)

```bash
# PlanetScale configuration
DB_PROVIDER=planetscale
DATABASE_URL=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}
DB_POOL_MIN=1
DB_POOL_MAX=10

# Or individual parameters
# PLANETSCALE_DB_HOST=aws.connect.psdb.cloud
# PLANETSCALE_DB_PORT=3306
# PLANETSCALE_DB_NAME=[database-name]
# PLANETSCALE_DB_USER=[username]  
# PLANETSCALE_DB_PASSWORD=[password]
```

**Setup Steps**:
1. Create PlanetScale account and database
2. Create branch for development
3. Install MySQL2: `npm install mysql2`
4. Configure connection string
5. Run migrations: `npm run db:migrate`

### Neon (Serverless PostgreSQL)

```bash
# Neon configuration
DB_PROVIDER=neon
DATABASE_URL=postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require
DB_SSL=true
DB_POOL_MIN=0      # Serverless - can scale to zero
DB_POOL_MAX=5      # Lower max for serverless

# Individual parameters alternative
# NEON_DB_HOST=[endpoint]
# NEON_DB_PORT=5432
# NEON_DB_NAME=[database]
# NEON_DB_USER=[user]
# NEON_DB_PASSWORD=[password]
```

**Setup Steps**:
1. Create Neon account and database
2. Get connection string from dashboard
3. Configure with serverless-optimized pool settings
4. Run migrations: `npm run db:migrate`

### Railway (Managed PostgreSQL)

```bash
# Railway configuration
DB_PROVIDER=railway
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/railway
DB_POOL_MIN=1
DB_POOL_MAX=10

# Individual parameters alternative
# RAILWAY_DB_HOST=[host].railway.app
# RAILWAY_DB_PORT=5432
# RAILWAY_DB_NAME=railway
# RAILWAY_DB_USER=postgres
# RAILWAY_DB_PASSWORD=[password]
```

**Setup Steps**:
1. Create Railway account and PostgreSQL service
2. Get connection details from service dashboard
3. Configure environment variables
4. Run migrations: `npm run db:migrate`

### Generic PostgreSQL

```bash
# Generic PostgreSQL-compatible service
DB_PROVIDER=generic
DATABASE_URL=postgresql://username:password@hostname:port/database
DB_CLIENT=pg
DB_TIMEOUT=30000
DB_IDLE_TIMEOUT=600000
DB_POOL_MIN=1
DB_POOL_MAX=10
```

Use this for any PostgreSQL-compatible service not specifically supported.

---

## 📋 Quick Reference

### Minimal Development Setup
```bash
NODE_ENV=development
PORT=5000
DB_PROVIDER=postgresql
DB_NAME=process_pilot
DB_USER=postgres
JWT_SECRET=dev-jwt-secret-minimum-32-characters-please-change-this
JWT_REFRESH_SECRET=dev-refresh-secret-minimum-32-characters-different
SESSION_SECRET=dev-session-secret-minimum-32-characters-for-csrf
CORS_ORIGIN=http://localhost:3000
```

### Production Security Checklist
- [ ] All secrets are cryptographically secure (32+ characters)
- [ ] No default values in JWT secrets
- [ ] Database SSL enabled (`DB_SSL=true`)
- [ ] CORS origins are specific domains (no wildcards)
- [ ] Rate limiting configured appropriately
- [ ] Sensitive variables not logged or exposed
- [ ] Environment variables encrypted in deployment system

### Validation Commands
```bash
# Validate environment
node scripts/validate-setup.js

# Test database connection
npm run db:migrate

# Check application health
curl http://localhost:5000/health/detailed

# Test CORS configuration
curl -H "Origin: https://example.com" http://localhost:5000/health
```

---

**🎯 Need Help?**

- **Setup Issues**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Development Guide**: See [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)
- **Security Questions**: Review the Security Considerations section above
- **Database Problems**: Check Provider-Specific Setup section

---

*This documentation is automatically synced with the validation schema. Last updated: 2025-09-03*