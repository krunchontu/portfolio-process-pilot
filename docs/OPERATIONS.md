# ProcessPilot Database Operations Guide

## Overview

This document provides comprehensive database backup and recovery procedures for ProcessPilot's multi-provider database architecture. ProcessPilot supports PostgreSQL, Supabase, PlanetScale, Neon, and Railway database providers.

## 🎯 Database Backup Procedures

### PostgreSQL Backup Procedures

#### Manual Backup
```bash
# Full database backup with compression
pg_dump -h hostname -U username -d database_name \
  --no-password --verbose --format=custom \
  --compress=9 --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Schema-only backup
pg_dump -h hostname -U username -d database_name \
  --no-password --schema-only \
  --file=schema_$(date +%Y%m%d_%H%M%S).sql

# Data-only backup
pg_dump -h hostname -U username -d database_name \
  --no-password --data-only --format=custom \
  --compress=9 --file=data_$(date +%Y%m%d_%H%M%S).dump
```

#### Automated Backup
Use the provided backup script:
```bash
cd backend/scripts
./backup.sh postgresql
```

### BaaS Provider Backup Procedures

#### Supabase Backup
```bash
# Using Supabase CLI (recommended)
supabase db dump --db-url=$SUPABASE_DATABASE_URL \
  --file=supabase_backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup
./backup.sh supabase
```

#### PlanetScale Backup
```bash
# Create database branch for backup
pscale branch create database_name backup-$(date +%Y%m%d-%H%M%S)

# Export data using mysqldump
mysqldump -h $PLANETSCALE_HOST -u $PLANETSCALE_USERNAME \
  -p$PLANETSCALE_PASSWORD --single-transaction --routines \
  --triggers database_name > planetscale_backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup
./backup.sh planetscale
```

#### Neon Backup
```bash
# Logical backup using pg_dump
pg_dump $NEON_DATABASE_URL --no-password --verbose \
  --format=custom --compress=9 \
  --file=neon_backup_$(date +%Y%m%d_%H%M%S).dump

# Automated backup
./backup.sh neon
```

#### Railway Backup
```bash
# Export using pg_dump
pg_dump $RAILWAY_DATABASE_URL --no-password --verbose \
  --format=custom --compress=9 \
  --file=railway_backup_$(date +%Y%m%d_%H%M%S).dump

# Automated backup
./backup.sh railway
```

## 📅 Backup Scheduling Recommendations

### Production Environment
- **Full Backup**: Daily at 2:00 AM UTC
- **Incremental Backup**: Every 6 hours
- **Schema Backup**: Weekly on Sundays
- **Retention**: 30 days for daily, 12 weeks for weekly

### Staging Environment
- **Full Backup**: Daily at 3:00 AM UTC
- **Retention**: 7 days

### Development Environment
- **Full Backup**: Weekly
- **Retention**: 2 weeks

### Cron Schedule Examples
```bash
# Production daily backup at 2 AM UTC
0 2 * * * /path/to/backend/scripts/backup.sh postgresql

# Production incremental backup every 6 hours
0 */6 * * * /path/to/backend/scripts/backup.sh postgresql --incremental

# Weekly schema backup on Sundays at 1 AM UTC
0 1 * * 0 /path/to/backend/scripts/backup.sh postgresql --schema-only
```

## 💾 Backup Storage Requirements

### Storage Locations
- **Local**: `/var/backups/processpilot/` (temporary storage)
- **Cloud**: AWS S3, Google Cloud Storage, or Azure Blob Storage
- **Network**: NFS mount or network-attached storage

### Storage Structure
```text
backups/
├── postgresql/
│   ├── daily/
│   │   ├── 20250902_020000.dump
│   │   └── 20250901_020000.dump
│   ├── incremental/
│   │   └── 20250902_080000_incremental.dump
│   └── schema/
│       └── 20250901_010000_schema.sql
├── supabase/
├── planetscale/
├── neon/
└── railway/
```

### Storage Requirements
- **Size Estimation**: 2-5x database size for compressed backups
- **Disk Space**: Minimum 100GB for production backups
- **Network**: 10MB/s minimum for cloud upload
- **Redundancy**: Multiple storage locations recommended

## 🔄 Backup Retention Policies

### Retention Schedule
| Backup Type | Production | Staging | Development |
|-------------|------------|---------|-------------|
| Daily Full | 30 days | 7 days | 7 days |
| Weekly Full | 12 weeks | 4 weeks | 2 weeks |
| Monthly Full | 12 months | 6 months | - |
| Incremental | 7 days | 3 days | - |

### Automated Cleanup
The backup script automatically removes old backups based on retention policy:
```bash
# Cleanup old backups
./backup.sh --cleanup postgresql
```

## 🔐 Security Considerations

### Backup Encryption
- All backups should be encrypted at rest
- Use GPG encryption for sensitive data
- Secure key management for encryption keys

### Access Control
- Backup files should have restricted permissions (600)
- Database credentials stored in secure environment variables
- Regular rotation of backup service account credentials

### Compliance
- GDPR compliance for EU data
- SOX compliance for financial data
- Regular audit of backup access logs

## 📊 Backup Monitoring

### Health Checks
The backup system integrates with ProcessPilot's health monitoring:
- Backup success/failure status
- Backup file size validation
- Backup completion time tracking
- Storage space monitoring

### Alerting
- Failed backup notifications
- Storage space warnings
- Backup verification failures
- Retention policy violations

### Metrics
- Backup duration trends
- Backup file size trends
- Storage utilization
- Success/failure rates

## 🌍 Multi-Environment Considerations

### Environment-Specific Configuration
```bash
# Production
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE=s3://prod-backups/processpilot/
BACKUP_ENCRYPTION=true

# Staging
BACKUP_RETENTION_DAYS=7
BACKUP_STORAGE=s3://staging-backups/processpilot/
BACKUP_ENCRYPTION=false

# Development
BACKUP_RETENTION_DAYS=3
BACKUP_STORAGE=/var/backups/processpilot/dev/
BACKUP_ENCRYPTION=false
```

### Provider Selection
The backup system automatically detects the database provider from `DB_PROVIDER` environment variable and applies appropriate backup procedures.

## 📋 Backup Verification

### Integrity Checks
- Checksum verification of backup files
- Test restoration on non-production environment
- Automated backup validation

### Verification Schedule
- **Daily**: Checksum verification
- **Weekly**: Test restore of latest backup
- **Monthly**: Full disaster recovery simulation

---

**Document Status**: Complete database backup procedures ✅  
**Multi-Provider**: All supported providers documented ✅  
**Production Ready**: Scheduling and monitoring integrated ✅  
**Security Compliant**: Encryption and access controls specified ✅