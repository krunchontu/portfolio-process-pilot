# ProcessPilot Disaster Recovery Runbook

## Overview

This document provides comprehensive disaster recovery procedures for ProcessPilot, including step-by-step instructions for various failure scenarios, role assignments, and recovery time objectives (RTO/RPO).

## 🎯 Recovery Objectives

### Service Level Objectives
| Component | RTO (Recovery Time) | RPO (Data Loss) | Priority |
|-----------|--------------------|--------------------|----------|
| **Database** | 4 hours | 1 hour | Critical |
| **API Backend** | 2 hours | 0 minutes | Critical |
| **Frontend Application** | 1 hour | 0 minutes | High |
| **Email Service** | 4 hours | 30 minutes | Medium |
| **Analytics** | 8 hours | 4 hours | Low |

### Business Impact Classification
- **Critical**: Service unavailable affects core business operations
- **High**: Significant user impact but workarounds exist
- **Medium**: Limited impact, non-critical features affected
- **Low**: Minimal impact, nice-to-have features affected

## 👥 Emergency Response Team

### Role Assignments

#### **Incident Commander** (Primary: CTO, Secondary: Lead Developer)
- Overall incident coordination
- Communication with stakeholders
- Decision making for recovery procedures
- Post-incident review coordination

#### **Database Administrator** (Primary: DevOps Engineer, Secondary: Backend Developer)
- Database backup and recovery operations
- Data integrity verification
- Performance monitoring during recovery

#### **Application Team** (Primary: Full Stack Developer, Secondary: Frontend Developer)
- Application deployment and configuration
- Code rollback procedures
- Feature toggle management

#### **Infrastructure Team** (Primary: DevOps Engineer, Secondary: System Administrator)
- Server provisioning and configuration
- Network and DNS management
- Monitoring system restoration

#### **Communications Lead** (Primary: Product Manager, Secondary: Project Manager)
- Internal stakeholder communication
- Customer communication
- Status page updates

## 🚨 Emergency Escalation Procedures

### Contact Information
```text
Incident Commander:    [PHONE] [EMAIL] [SLACK]
Database Administrator: [PHONE] [EMAIL] [SLACK]
Application Team Lead:  [PHONE] [EMAIL] [SLACK]
Infrastructure Lead:    [PHONE] [EMAIL] [SLACK]
Communications Lead:    [PHONE] [EMAIL] [SLACK]
```

### Escalation Matrix
1. **Level 1** (0-30 min): Primary on-call responds
2. **Level 2** (30-60 min): Secondary on-call and team lead involved
3. **Level 3** (60+ min): Incident commander and senior leadership involved

## 📋 Disaster Scenarios & Recovery Procedures

### Scenario 1: Complete Database Failure

#### **Symptoms**
- Database connection errors across all applications
- Health check endpoints failing
- User authentication failures

#### **Immediate Response (0-15 minutes)**
1. **Verify the incident**
   ```bash
   # Check database connectivity
   cd backend
   npm run db:health-check
   
   # Check health endpoints
   curl http://localhost:5000/health/detailed
   ```

2. **Assess impact**
   - Check all health monitoring dashboards
   - Verify if backup systems are operational
   - Document error messages and timestamps

3. **Initiate incident response**
   - Notify incident commander
   - Create incident tracking ticket
   - Post initial status update

#### **Recovery Steps (15-240 minutes)**

**Step 1: Environment Assessment (15-30 min)**
```bash
# Check backup availability
cd backend/scripts
./backup.sh --list postgresql

# Verify last successful backup
ls -la /var/backups/processpilot/postgresql/daily/ | tail -5
```

**Step 2: Database Recovery (30-120 min)**
```bash
# Restore from latest backup
./restore.sh postgresql /path/to/latest/backup.dump

# Verify data integrity
npm run db:verify-integrity

# Run database migrations if needed
npm run db:migrate
```

**Step 3: Application Restart (120-180 min)**
```bash
# Restart backend services
npm run restart-production

# Verify API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/auth/status
```

**Step 4: Verification & Testing (180-240 min)**
```bash
# Run smoke tests
npm run test:smoke

# Verify core functionality
npm run test:integration:critical
```

### Scenario 2: Application Server Failure

#### **Symptoms**
- HTTP 502/503 errors
- Load balancer health checks failing
- Application not responding

#### **Recovery Steps**

**Step 1: Server Assessment (0-15 min)**
```bash
# Check server status
systemctl status processpilot-backend
systemctl status nginx

# Check logs
tail -100 /var/log/processpilot/error.log
journalctl -u processpilot-backend --since "10 minutes ago"
```

**Step 2: Service Recovery (15-60 min)**
```bash
# Restart services
systemctl restart processpilot-backend
systemctl restart nginx

# Verify process status
ps aux | grep node
netstat -tulpn | grep 5000
```

**Step 3: Application Deployment (if restart fails)**
```bash
# Deploy from backup
cd /opt/processpilot
git checkout HEAD~1  # Rollback to previous version
npm install
npm run build
systemctl restart processpilot-backend
```

### Scenario 3: Data Corruption

#### **Symptoms**
- Database queries returning unexpected results
- Data integrity violations
- Application errors related to data consistency

#### **Recovery Steps**

**Step 1: Damage Assessment (0-30 min)**
```bash
# Run data integrity checks
cd backend
npm run db:integrity-check

# Check for corruption patterns
npm run db:analyze-corruption

# Identify affected time range
npm run db:check-recent-changes
```

**Step 2: Point-in-Time Recovery (30-180 min)**
```bash
# Determine recovery point
./restore.sh postgresql --list

# Restore to point before corruption
./restore.sh postgresql /path/to/clean/backup.dump

# Verify data integrity
npm run db:verify-integrity
```

**Step 3: Data Reconciliation (180-300 min)**
```bash
# Identify lost transactions
npm run db:compare-backups

# Manual data recovery if needed
npm run db:manual-recovery-script

# Verify business-critical data
npm run test:data-integrity
```

### Scenario 4: Security Breach

#### **Symptoms**
- Unauthorized access detected
- Suspicious database queries
- Security monitoring alerts

#### **Immediate Response (0-30 min)**
1. **Isolate affected systems**
   ```bash
   # Block suspicious IPs at firewall level
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP
   
   # Revoke API tokens
   npm run security:revoke-all-tokens
   ```

2. **Preserve evidence**
   ```bash
   # Backup current logs
   cp -r /var/log/processpilot /var/backups/incident-$(date +%Y%m%d)
   
   # Export security events
   npm run security:export-events
   ```

#### **Recovery Steps (30-480 min)**

**Step 1: System Assessment (30-120 min)**
- Analyze attack vectors
- Determine data exposure
- Assess system integrity

**Step 2: System Hardening (120-300 min)**
```bash
# Reset all passwords and tokens
npm run security:reset-credentials

# Update security patches
apt update && apt upgrade

# Restore from clean backup if compromised
./restore.sh postgresql /path/to/pre-incident/backup.dump
```

**Step 3: Verification (300-480 min)**
```bash
# Run security audit
npm run security:full-audit

# Verify no backdoors
npm run security:scan-backdoors
```

## 🔄 Recovery Procedures by Database Provider

### PostgreSQL Recovery

#### **Full Recovery**
```bash
# Stop application
systemctl stop processpilot-backend

# Drop and recreate database (if necessary)
dropdb processpilot_production
createdb processpilot_production

# Restore from backup
./restore.sh postgresql /path/to/backup.dump

# Restart application
systemctl start processpilot-backend
```

#### **Point-in-Time Recovery**
```bash
# Restore base backup
./restore.sh postgresql /path/to/base/backup.dump

# Apply WAL files (if available)
recovery_target_time = '2025-01-15 14:30:00'
```

### Supabase Recovery

#### **Using Supabase Dashboard**
1. Login to Supabase dashboard
2. Navigate to Database → Backups
3. Select backup point for restoration
4. Confirm restoration process

#### **Using CLI**
```bash
# List available backups
supabase db dump --list

# Restore specific backup
supabase db restore --backup-id=BACKUP_ID
```

### PlanetScale Recovery

#### **Branch-based Recovery**
```bash
# Create restore branch
pscale branch create database_name restore-$(date +%Y%m%d-%H%M%S)

# Deploy restore branch
pscale deploy-request create database_name restore-branch main
```

### Neon Recovery

#### **Reset to Timestamp**
```bash
# Using Neon CLI
neon branch reset main --timestamp="2025-01-15T14:30:00Z"

# Verify reset
neon branch list
```

### Railway Recovery

#### **Snapshot Restoration**
1. Access Railway dashboard
2. Navigate to Database → Snapshots
3. Select restoration point
4. Confirm snapshot restoration

## 📊 Data Migration Between Providers

### PostgreSQL to Supabase
```bash
# Export from PostgreSQL
./backup.sh postgresql --type full

# Import to Supabase
./restore.sh supabase /path/to/postgresql/backup.dump
```

### Emergency Provider Switch
```bash
# Update environment variables
export DB_PROVIDER=supabase
export SUPABASE_DATABASE_URL="postgresql://..."

# Run migrations
npm run db:migrate

# Restart application
systemctl restart processpilot-backend
```

## ⚡ Quick Recovery Commands

### Database Quick Restore
```bash
# Latest backup restore (any provider)
cd backend/scripts
./restore.sh auto $(ls -t /var/backups/processpilot/*/daily/*.dump | head -1)
```

### Application Quick Restart
```bash
# Restart all services
systemctl restart processpilot-backend nginx
pm2 restart all
```

### Health Check Verification
```bash
# Complete health verification
curl http://localhost:5000/health/detailed
npm run test:smoke
```

## 🧪 Recovery Testing & Validation

### Monthly Recovery Drills

#### **Drill 1: Database Backup Restoration**
```bash
# Test backup restoration to staging
./restore.sh postgresql /path/to/production/backup.dump --target=staging

# Verify data integrity
npm run test:data-integrity --env=staging
```

#### **Drill 2: Complete System Recovery**
```bash
# Simulate complete failure
systemctl stop processpilot-backend

# Perform full recovery
./disaster-recovery.sh --scenario=complete-failure --dry-run
```

### Recovery Validation Checklist
- [ ] Database connectivity restored
- [ ] All API endpoints responding
- [ ] User authentication working
- [ ] Core business functions operational
- [ ] Data integrity verified
- [ ] Performance within acceptable limits
- [ ] Monitoring systems operational
- [ ] Backup processes resumed

## 📈 Post-Incident Procedures

### Immediate Post-Recovery (0-2 hours)
1. **System Monitoring**
   - Monitor performance metrics
   - Check error rates
   - Verify backup resumption

2. **Stakeholder Communication**
   - Send recovery confirmation
   - Update status pages
   - Schedule post-incident review

### Post-Incident Review (24-48 hours)
1. **Incident Analysis**
   - Timeline reconstruction
   - Root cause analysis
   - Impact assessment

2. **Process Improvement**
   - Update recovery procedures
   - Implement preventive measures
   - Update monitoring alerts

### Documentation Updates
1. Update recovery time estimates
2. Refine role assignments
3. Improve automation scripts
4. Update contact information

## 🔧 Automation Scripts

### Emergency Recovery Script
```bash
#!/bin/bash
# emergency-recovery.sh
# Quick recovery for common scenarios

case $1 in
    "database")
        ./restore.sh auto latest
        ;;
    "application")
        systemctl restart processpilot-backend nginx
        ;;
    "complete")
        ./restore.sh auto latest
        systemctl restart processpilot-backend nginx
        ./verify-recovery.sh
        ;;
esac
```

### Recovery Verification Script
```bash
#!/bin/bash
# verify-recovery.sh
# Automated recovery verification

echo "Verifying database connectivity..."
curl -f http://localhost:5000/health/detailed

echo "Running smoke tests..."
npm run test:smoke

echo "Verifying user authentication..."
npm run test:auth

echo "Recovery verification complete"
```

## 📞 External Dependencies & Contacts

### Service Providers
- **Database Hosting**: [Provider Support Contact]
- **Cloud Infrastructure**: [Provider Support Contact]
- **DNS Provider**: [Provider Support Contact]
- **Email Service**: [Provider Support Contact]

### Vendor Support Escalation
- **Critical**: Immediate phone support
- **High**: 4-hour response SLA
- **Medium**: 8-hour response SLA
- **Low**: 24-hour response SLA

---

**Document Status**: Complete disaster recovery runbook ✅  
**Role Assignments**: Emergency response team defined ✅  
**Recovery Procedures**: Step-by-step instructions provided ✅  
**Multi-Provider**: All supported database providers covered ✅