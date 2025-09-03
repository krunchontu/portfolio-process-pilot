# ProcessPilot Troubleshooting Guide

*Solutions for common development environment issues*

---

## 📋 Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Database Problems](#database-problems)
- [Environment Configuration](#environment-configuration)
- [Development Server Issues](#development-server-issues)
- [Build and Test Problems](#build-and-test-problems)
- [Platform-Specific Issues](#platform-specific-issues)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

---

## 🔧 Quick Diagnostics

Before diving into specific issues, run these commands to quickly identify problems:

### Automated Validation

```bash
# Run the setup validation script
node scripts/validate-setup.js --verbose

# This will check:
# - System requirements
# - Project structure
# - Environment configuration
# - Database connection
# - Dependencies
# - Port availability
```

### Manual Quick Checks

```bash
# Check versions
node --version    # Should be >= 18.0.0
npm --version     # Should be >= 8.0.0
psql --version    # Should be >= 13.0
git --version     # Should be >= 2.30

# Check if services are running
# PostgreSQL status (varies by platform)
# Windows: services.msc (look for PostgreSQL)
# macOS: brew services list | grep postgresql
# Linux: sudo systemctl status postgresql

# Check if ports are available
netstat -an | grep :5000  # Backend port
netstat -an | grep :3000  # Frontend port

# Check environment files
ls -la backend/.env       # Should exist
cat backend/.env | grep JWT_SECRET  # Should have secrets
```

---

## 🛠️ Installation Issues

### Node.js Installation Problems

#### Issue: "node: command not found"

**Solution:**
```bash
# Verify installation
which node || where node

# If not found, reinstall Node.js
# Windows: Download from https://nodejs.org
# macOS: brew install node@18
# Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

#### Issue: Node.js version too old

**Check current version:**
```bash
node --version
```

**Solution:**
```bash
# Update Node.js to latest LTS
# Windows: Download latest from nodejs.org
# macOS: brew upgrade node
# Linux: Use NodeSource repository (see above)

# Or use Node Version Manager
# Install nvm first, then:
nvm install --lts
nvm use --lts
```

#### Issue: npm permissions errors (Linux/macOS)

**Solution:**
```bash
# Option 1: Use npm's built-in solution
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Option 2: Fix permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### PostgreSQL Installation Problems

#### Issue: "psql: command not found"

**Windows:**
```powershell
# Check if PostgreSQL is installed
Get-Command psql -ErrorAction SilentlyContinue

# If not found, install via Chocolatey
choco install postgresql

# Or download from https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
# Check if PostgreSQL is installed
which psql

# Install if missing
brew install postgresql@13

# Start service
brew services start postgresql
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# RHEL/CentOS/Fedora
sudo dnf install postgresql postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### Issue: PostgreSQL service not running

**Windows:**
```powershell
# Check service status
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-13  # Adjust version as needed
```

**macOS:**
```bash
# Start with Homebrew
brew services start postgresql

# Or manually
pg_ctl -D /usr/local/var/postgres start
```

**Linux:**
```bash
# Check status
sudo systemctl status postgresql

# Start service
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql
```

---

## 🗄️ Database Problems

### Connection Issues

#### Issue: "Connection refused" or "Could not connect to server"

**Check PostgreSQL is running:**
```bash
# Test connection
pg_isready -h localhost -p 5432

# If not ready, start PostgreSQL (see above)
```

**Check connection parameters:**
```bash
# Verify .env file
cat backend/.env | grep DB_

# Common settings for local development:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=process_pilot
DB_USER=postgres
DB_PASSWORD=  # Often empty for local development
```

#### Issue: "Password authentication failed"

**Solution:**
```bash
# Reset PostgreSQL password
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
\q

# Update .env file with new password
echo "DB_PASSWORD=newpassword" >> backend/.env
```

#### Issue: "Database does not exist"

**Create databases manually:**
```bash
# Connect as superuser
psql -U postgres

# Create databases
CREATE DATABASE process_pilot;
CREATE DATABASE process_pilot_test;

# Exit
\q
```

#### Issue: "Permission denied for database"

**Grant permissions:**
```bash
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE process_pilot TO your_username;
GRANT ALL PRIVILEGES ON DATABASE process_pilot_test TO your_username;
\q
```

### Migration Issues

#### Issue: "Migration failed" or "Table already exists"

**Reset and retry:**
```bash
cd backend

# Check current migration status
npm run knex migrate:status

# Rollback if needed
npm run db:rollback

# Run migrations again
npm run db:migrate

# If still failing, reset completely
npm run db:reset  # This will drop and recreate everything
```

#### Issue: "No such file or directory" during migration

**Check file paths:**
```bash
# Verify migration files exist
ls -la backend/database/migrations/

# Check knexfile.js configuration
cat backend/knexfile.js
```

### Seed Data Issues

#### Issue: "Seed failed" or "Duplicate key error"

**Clear and reseed:**
```bash
cd backend

# Clear existing data (careful - this deletes data!)
psql -U postgres -d process_pilot -c "TRUNCATE users, workflows, requests, request_history RESTART IDENTITY CASCADE;"

# Run seeds again
npm run db:seed
```

---

## ⚙️ Environment Configuration

### Missing Environment Variables

#### Issue: "JWT_SECRET is required" or similar

**Generate secure secrets:**
```bash
# Generate random secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Add to backend/.env file
```

#### Issue: ".env file not found"

**Create from template:**
```bash
cd backend
cp .env.example .env

# Edit with your settings
nano .env  # or your preferred editor
```

#### Issue: "Invalid environment configuration"

**Validate .env file:**
```bash
# Check for common issues
cat backend/.env | grep -E '^[A-Z_]+=.*$'  # Should show valid format

# Check for missing required variables
node scripts/validate-setup.js --verbose
```

### CORS Configuration Issues

#### Issue: "CORS error" in browser

**Update CORS settings:**
```bash
# In backend/.env, ensure:
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# For multiple origins:
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## 🌐 Development Server Issues

### Backend Server Problems

#### Issue: "Port 5000 already in use"

**Find and kill process:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9

# Or change port in .env
echo "PORT=5001" >> backend/.env
```

#### Issue: "Module not found" errors

**Reinstall dependencies:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Issue: Backend server starts but API doesn't respond

**Check server startup:**
```bash
cd backend
npm run dev

# Look for:
# ✓ Server running on port 5000
# ✓ Database connected successfully
# ✓ ProcessPilot API is ready

# Test API endpoint
curl http://localhost:5000/health
```

### Frontend Server Problems

#### Issue: "Port 3000 already in use"

**Change Vite port:**
```bash
# Option 1: Temporary
cd frontend
npm run dev -- --port 3001

# Option 2: Create .env file
echo "VITE_PORT=3001" > frontend/.env.local
```

#### Issue: "Failed to resolve module" errors

**Clear Vite cache:**
```bash
cd frontend
rm -rf node_modules .vite dist
npm install
npm run dev
```

#### Issue: "Network: use --host to expose"

**Expose to network:**
```bash
cd frontend
npm run dev -- --host

# Or permanently in vite.config.js:
# server: { host: true }
```

### API Communication Issues

#### Issue: "API calls failing" or "Network Error"

**Check API URL configuration:**
```bash
# Verify frontend is pointing to correct backend
cat frontend/.env.local 2>/dev/null || echo "No frontend .env found"

# Should have:
VITE_API_URL=http://localhost:5000/api

# Test API directly
curl http://localhost:5000/api/health
```

---

## 🔨 Build and Test Problems

### Backend Tests

#### Issue: "Tests failing" or "Database connection error in tests"

**Check test database:**
```bash
# Ensure test database exists
psql -U postgres -c "CREATE DATABASE process_pilot_test;"

# Check test environment
cd backend
NODE_ENV=test npm test

# Reset test database if needed
NODE_ENV=test npm run db:migrate
```

#### Issue: "Jest configuration problems"

**Verify Jest setup:**
```bash
cd backend
cat jest.config.js

# Should have correct test environment setup
# If missing, check package.json scripts
```

### Frontend Tests

#### Issue: "Vitest not found" or test configuration errors

**Reinstall test dependencies:**
```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm test
```

#### Issue: "Playwright tests failing"

**Install Playwright browsers:**
```bash
cd frontend
npx playwright install

# If still failing, install system dependencies
npx playwright install-deps
```

### Build Issues

#### Issue: "Frontend build failing"

**Check for TypeScript/lint errors:**
```bash
cd frontend

# Check for TypeScript errors
npm run type-check

# Fix linting issues
npm run lint:fix

# Clean build
rm -rf dist
npm run build
```

#### Issue: "Backend linting errors"

**Fix common issues:**
```bash
cd backend

# Auto-fix issues
npm run lint:fix

# Check for unfixable issues
npm run lint
```

---

## 🖥️ Platform-Specific Issues

### Windows Issues

#### Issue: "PowerShell execution policy" errors

**Fix execution policy:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or for current session only
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

#### Issue: "Long path names" causing install failures

**Enable long paths:**
```powershell
# Run as Administrator
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or use shorter project path
```

#### Issue: "Windows Defender" slowing builds

**Add exclusions:**
```powershell
# Add project folder and npm cache to Windows Defender exclusions
# Go to: Settings > Update & Security > Windows Security > Virus & threat protection
# Add exclusions for:
# - Project directory
# - %APPDATA%\npm
# - %APPDATA%\npm-cache
```

#### Issue: "Git line endings" causing issues

**Configure line endings:**
```bash
# Set globally
git config --global core.autocrlf true

# For existing repo
git rm --cached -r .
git reset --hard
```

### macOS Issues

#### Issue: "Permission denied" for global npm packages

**Use Homebrew Node.js:**
```bash
# Uninstall other Node.js installations
# Install via Homebrew
brew install node

# This avoids permission issues
```

#### Issue: "Command Line Tools" missing

**Install Xcode Command Line Tools:**
```bash
xcode-select --install

# Or install full Xcode from App Store
```

#### Issue: "Homebrew path" not found

**Fix Homebrew PATH:**
```bash
# Intel Macs
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc

# Apple Silicon Macs
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc

# Reload shell
source ~/.zshrc
```

### Linux Issues

#### Issue: "ENOSPC: System limit for number of file watchers reached"

**Increase file watcher limit:**
```bash
# Temporary fix
sudo sysctl fs.inotify.max_user_watches=524288

# Permanent fix
echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Issue: "Node.js version from distribution is too old"

**Use NodeSource repository:**
```bash
# Remove old version
sudo apt remove nodejs npm

# Install from NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Issue: "PostgreSQL authentication method" problems

**Fix pg_hba.conf:**
```bash
# Find config file
sudo -u postgres psql -c "SHOW hba_file;"

# Edit file (usually /etc/postgresql/*/main/pg_hba.conf)
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Change 'peer' to 'md5' for local connections
# local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## ⚡ Performance Issues

### Slow npm install

#### Issue: Downloads taking too long

**Solutions:**
```bash
# Use faster registry
npm config set registry https://registry.npmjs.org/

# Clear cache
npm cache clean --force

# Use yarn as alternative
npm install -g yarn
yarn install  # Instead of npm install

# Use npm ci for faster installs (if package-lock.json exists)
npm ci
```

### Slow development servers

#### Issue: High CPU usage or slow hot reload

**Solutions:**
```bash
# Exclude node_modules from file watchers
# Add to .gitignore or IDE settings

# Use fewer Webpack watchers (frontend)
# In vite.config.js:
server: {
  watch: {
    usePolling: false,
    interval: 1000
  }
}

# Disable source maps temporarily
# NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Database performance

#### Issue: Slow database queries

**Solutions:**
```bash
# Check connection pool settings in backend/.env
DB_POOL_MIN=2
DB_POOL_MAX=10

# Monitor database connections
psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Add database indexes (if needed)
# This should be done via migrations
```

---

## 📞 Getting Help

### Before Asking for Help

1. **Run diagnostics:**
   ```bash
   node scripts/validate-setup.js --verbose
   ```

2. **Check logs:**
   ```bash
   # Backend logs
   tail -f backend/logs/combined.log
   
   # Check browser console for frontend errors
   ```

3. **Try minimal reproduction:**
   - Start with fresh database
   - Test with default configuration
   - Isolate the issue

### Information to Provide

When seeking help, include:

- **Operating System:** Windows 10/11, macOS version, Linux distribution
- **Node.js version:** `node --version`
- **npm version:** `npm --version`
- **Error messages:** Full error text and stack traces
- **What you were doing:** Steps that led to the issue
- **Validation output:** `node scripts/validate-setup.js --verbose`

### Where to Get Help

1. **Project Documentation:**
   - [Setup Guide](DEVELOPMENT_SETUP.md)
   - [README](../README.md)
   - [Architecture docs](architecture.md)

2. **Community Resources:**
   - GitHub Issues (for project-specific problems)
   - Stack Overflow (for general development issues)
   - Node.js/React/PostgreSQL official documentation

3. **Debug Commands:**
   ```bash
   # Enable debug mode
   DEBUG=* npm run dev        # Backend
   npm run dev -- --debug     # Frontend
   ```

### Emergency Recovery

If everything is broken and you need to start fresh:

```bash
# Nuclear option - start completely fresh
# ⚠️  This will delete all local data!

# Stop all servers
pkill -f "node.*server"  # or Ctrl+C in terminals

# Clean everything
rm -rf backend/node_modules frontend/node_modules
rm -rf backend/logs frontend/dist
rm backend/.env

# Reset database
psql -U postgres -c "DROP DATABASE IF EXISTS process_pilot;"
psql -U postgres -c "DROP DATABASE IF EXISTS process_pilot_test;"

# Start fresh setup
./scripts/setup-dev-env.sh  # Unix/Linux/macOS
# or
scripts\setup-dev-env.bat   # Windows
```

---

## 🔍 Advanced Debugging

### Environment Variables Debugging

```bash
# Show all environment variables
printenv | grep -E "(NODE|npm|DB_|JWT_|CORS_)"

# Check Node.js configuration
node -p "process.env" | jq  # If jq installed

# Validate .env parsing
cd backend
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET?.length)"
```

### Database Debugging

```bash
# Check database connections
psql -U postgres -c "SELECT datname, numbackends, state FROM pg_stat_database WHERE datname LIKE 'process%';"

# Check table structure
psql -U postgres -d process_pilot -c "\dt"

# Check recent database activity
psql -U postgres -c "SELECT query, state, query_start FROM pg_stat_activity WHERE datname = 'process_pilot';"
```

### Network Debugging

```bash
# Check port bindings
netstat -tlnp | grep -E ":(3000|5000)"

# Test API connectivity
curl -v http://localhost:5000/health
curl -v http://localhost:5000/api/auth/me

# Check DNS resolution
nslookup localhost
ping localhost
```

---

**💡 Remember:** Most issues can be resolved by carefully reading error messages and checking the basic requirements. When in doubt, try the automated validation script first!

---

*This troubleshooting guide is continuously updated. If you encounter an issue not covered here, please consider contributing a solution.*