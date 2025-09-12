# ProcessPilot Development Setup Guide

*Comprehensive development environment setup for all platforms*

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Platform-Specific Setup](#platform-specific-setup)
- [Development Dependencies](#development-dependencies)
- [Project Setup](#project-setup)
- [Database Configuration](#database-configuration)
- [IDE & Editor Setup](#ide--editor-setup)
- [Testing Setup](#testing-setup)
- [Validation & Verification](#validation--verification)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

**For experienced developers who want to get up and running quickly:**

```bash
# Prerequisites: Node.js 18+, PostgreSQL 13+, Git
git clone <your-repo-url> && cd portfolio-process-pilot

# Backend setup
cd backend && npm install && cp .env.example .env
# Edit .env with your database credentials
npm run db:migrate && npm run db:seed && npm run dev &

# Frontend setup (new terminal)
cd frontend && npm install && npm run dev

# Access: http://localhost:3000 (frontend), http://localhost:5000/api (backend)
```

**Default credentials after seeding:**
- Admin: `admin@processpilot.com / Admin123!`
- Manager: `manager@processpilot.com / Manager123!`
- Employee: `employee@processpilot.com / Employee123!`

---

## 📋 Prerequisites

### Required Software

| Tool | Minimum Version | Recommended | Purpose |
|------|-----------------|-------------|---------|
| **Node.js** | 18.0.0+ | 18.18.0+ LTS | Backend runtime & build tools |
| **npm** | 8.0.0+ | 9.0.0+ | Package management |
| **Git** | 2.30+ | Latest | Version control |
| **Database** | See options below | PostgreSQL 13+ | Data persistence |

### Database Options (Choose One)

1. **PostgreSQL (Recommended for local development)**
   - PostgreSQL 13+ installed locally
   - Basic PostgreSQL knowledge

2. **BaaS Providers (Cloud-hosted)**
   - Supabase account (easiest setup)
   - PlanetScale account (MySQL-based)
   - Neon account (serverless)
   - Railway account (managed hosting)

---

## 🖥️ Platform-Specific Setup

### Windows 10/11

#### Option 1: Native Windows (Recommended)

```powershell
# Install Node.js
# Download from https://nodejs.org (LTS version)
# Or use Chocolatey:
choco install nodejs

# Install PostgreSQL
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql

# Install Git
# Download from https://git-scm.com/download/win
# Or use Chocolatey:
choco install git

# Verify installations
node --version    # Should show v18.x.x or higher
npm --version     # Should show v8.x.x or higher
psql --version    # Should show PostgreSQL 13.x or higher
git --version     # Should show git version 2.30+
```

#### Option 2: WSL2 (Windows Subsystem for Linux)

```bash
# Enable WSL2 and install Ubuntu
wsl --install

# Inside WSL2, follow Linux setup instructions below
```

**Windows-Specific Notes:**
- Use PowerShell or Command Prompt as Administrator
- Set execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned`
- Consider using Windows Terminal for better experience
- Git Bash provides Unix-like commands on Windows

### macOS

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node@18        # Node.js LTS
brew install postgresql@13  # PostgreSQL
brew install git           # Git (usually pre-installed)

# Start PostgreSQL service
brew services start postgresql

# Create database user (optional)
createuser -s postgres

# Verify installations
node --version    # Should show v18.x.x or higher
npm --version     # Should show v8.x.x or higher
psql --version    # Should show PostgreSQL 13.x or higher
git --version     # Should show git version 2.30+
```

### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Git (usually pre-installed)
sudo apt install git

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set up PostgreSQL user
sudo -u postgres createuser --interactive --pwprompt
# Create a user with your username and superuser privileges

# Verify installations
node --version    # Should show v18.x.x or higher
npm --version     # Should show v8.x.x or higher
psql --version    # Should show PostgreSQL 13.x or higher
git --version     # Should show git version 2.30+
```

### Linux (RHEL/CentOS/Fedora)

```bash
# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install nodejs npm

# Install PostgreSQL
sudo dnf install postgresql postgresql-server

# Initialize database
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Verify installations
node --version
npm --version
psql --version
git --version
```

---

## 📦 Development Dependencies

### Backend Dependencies Overview

**Core Framework:**
```json
{
  "express": "^4.18.2",           // Web framework
  "knex": "^3.1.0",               // Query builder & migrations
  "pg": "^8.11.3",                // PostgreSQL driver
  "jsonwebtoken": "^9.0.2",       // JWT authentication
  "bcryptjs": "^2.4.3",           // Password hashing
  "joi": "^17.11.0"               // Schema validation
}
```

**Security & Middleware:**
```json
{
  "helmet": "^7.1.0",             // Security headers
  "cors": "^2.8.5",               // Cross-origin requests
  "express-rate-limit": "^7.1.5", // Rate limiting
  "sanitize-html": "^2.17.0",     // XSS protection
  "cookie-parser": "^1.4.7"       // Cookie parsing
}
```

**Development Tools:**
```json
{
  "nodemon": "^3.0.2",            // Development server
  "jest": "^29.7.0",              // Testing framework
  "supertest": "^6.3.3",          // API testing
  "eslint": "^8.54.0",            // Linting
  "cross-env": "^10.0.0"          // Environment variables
}
```

### Frontend Dependencies Overview

**Core Framework:**
```json
{
  "react": "^18.2.0",             // UI framework
  "react-dom": "^18.2.0",         // React DOM
  "vite": "^5.0.0",               // Build tool
  "react-router-dom": "^6.20.1"   // Routing
}
```

**State Management & API:**
```json
{
  "react-query": "^3.39.3",       // Server state management
  "axios": "^1.6.2",              // HTTP client
  "react-hook-form": "^7.48.2",   // Form management
  "zustand": "^4.4.7"             // Client state management
}
```

**UI & Styling:**
```json
{
  "tailwindcss": "^3.3.6",        // Utility-first CSS
  "@headlessui/react": "^1.7.17", // Unstyled components
  "lucide-react": "^0.294.0",     // Icons
  "framer-motion": "^10.16.16"    // Animations
}
```

**Testing & Development:**
```json
{
  "vitest": "^1.0.0",             // Testing framework
  "@testing-library/react": "^14.1.2", // Component testing
  "@playwright/test": "^1.40.0",  // E2E testing
  "eslint": "^8.54.0",            // Linting
  "prettier": "^3.1.0"            // Code formatting
}
```

---

## 🏗️ Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/<your-username>/portfolio-process-pilot.git
cd portfolio-process-pilot

# Verify project structure
ls -la
# Should show: backend/, frontend/, docs/, README.md, etc.
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# This installs all dependencies from package.json including:
# - Express framework and middleware
# - Database drivers (PostgreSQL, MySQL for multi-provider support)
# - Authentication and security packages
# - Testing frameworks (Jest, Supertest)
# - Development tools (nodemon, ESLint)
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# This installs all dependencies including:
# - React 18 and related packages
# - Vite build system
# - Tailwind CSS and UI components
# - Testing frameworks (Vitest, Playwright, React Testing Library)
# - Development tools (TypeScript, ESLint, Prettier)
```

### 4. Verify Installation

```bash
# Check backend dependencies
cd backend && npm list --depth=0

# Check frontend dependencies
cd ../frontend && npm list --depth=0

# Verify no audit issues
cd backend && npm audit
cd ../frontend && npm audit
```

---

## 🗄️ Database Configuration

### PostgreSQL Local Setup

#### 1. Create Development Database

```bash
# Connect to PostgreSQL (may need to specify user)
psql -U postgres

# Create databases
CREATE DATABASE process_pilot;
CREATE DATABASE process_pilot_test;

# Create user (optional, for non-superuser setup)
CREATE USER processpilot WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE process_pilot TO processpilot;
GRANT ALL PRIVILEGES ON DATABASE process_pilot_test TO processpilot;

# Exit PostgreSQL
\q
```

#### 2. Configure Environment

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your database credentials
# Key settings for PostgreSQL:
DB_PROVIDER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=process_pilot
DB_USER=postgres  # or processpilot
DB_PASSWORD=your_password
DB_SSL=false
```

**Complete .env Configuration:**

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
HOST=localhost

# Database Configuration
DB_PROVIDER=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=process_pilot
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT Configuration (CHANGE IN PRODUCTION)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-for-development
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-token-secret-key-minimum-32-characters-long-for-development
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret for CSRF Protection
SESSION_SECRET=your-session-secret-key-minimum-32-characters-long-for-development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Email Configuration (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@processpilot.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
```

#### 3. Run Database Migrations

```bash
cd backend

# Run migrations to create tables
npm run db:migrate

# Should output:
# Batch 1 run: 4 migrations
# /path/to/migrations/001_create_users.js
# /path/to/migrations/002_create_workflows.js
# /path/to/migrations/003_create_requests.js
# /path/to/migrations/004_create_request_history.js
```

#### 4. Seed Sample Data

```bash
# Run seeds to populate with sample data
npm run db:seed

# Should output:
# Ran 3 seed files
# Sample users, workflows, and requests created
```

### BaaS Provider Setup (Alternative)

#### Supabase Setup

```bash
# 1. Create Supabase account at https://supabase.com
# 2. Create new project
# 3. Get database URL from Settings > Database

# Configure .env for Supabase
DB_PROVIDER=supabase
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
DB_POOL_MIN=1
DB_POOL_MAX=10

# Run migrations
npm run db:migrate
npm run db:seed
```

#### PlanetScale Setup

```bash
# 1. Create PlanetScale account at https://planetscale.com
# 2. Create database and branch
# 3. Install MySQL driver
npm install mysql2

# Configure .env for PlanetScale
DB_PROVIDER=planetscale
DATABASE_URL=mysql://[username]:[password]@[host]/[database]?ssl={"rejectUnauthorized":true}

# Run migrations
npm run db:migrate
npm run db:seed
```

---

## 💻 IDE & Editor Setup

### VS Code (Recommended)

#### Required Extensions

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-json
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-nodejs-extension-pack
```

#### Workspace Configuration

Create `.vscode/settings.json` in project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "eslint.workingDirectories": ["backend", "frontend"],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "tailwindCSS.includeLanguages": {
    "javascript": "javascript",
    "html": "html"
  },
  "files.associations": {
    "*.jsx": "javascriptreact",
    "*.tsx": "typescriptreact"
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact"
  }
}
```

#### Debugging Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### Recommended Additional Extensions

- **Thunder Client** - API testing within VS Code
- **GitLens** - Enhanced Git capabilities
- **Auto Rename Tag** - Automatic HTML/JSX tag renaming
- **Bracket Pair Colorizer** - Better bracket visualization
- **PostgreSQL** - Database management

### Other IDEs

#### WebStorm/IntelliJ IDEA

- Enable Node.js support
- Configure ESLint and Prettier
- Set up database connections
- Configure Jest test runner

#### Vim/Neovim

- Install LSP support for JavaScript/TypeScript
- Configure CoC or similar completion engine
- Set up ESLint and Prettier integration

---

## 🧪 Testing Setup

### Backend Testing (Jest)

#### Test Database Setup

```bash
cd backend

# Ensure test database exists
psql -U postgres -c "CREATE DATABASE process_pilot_test;"

# Environment for testing is handled by cross-env in package.json
# No additional setup needed
```

#### Run Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit        # Models and middleware only
npm run test:integration # API routes only

# Run tests in watch mode (for development)
npm run test:watch
```

### Frontend Testing (Vitest + Playwright)

#### Component Testing Setup

```bash
cd frontend

# Vitest is already configured in package.json
# No additional setup needed

# Run component tests
npm test

# Run with UI (interactive)
npm run test:ui

# Generate coverage
npm run test:coverage
```

#### E2E Testing Setup (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# This downloads Chrome, Firefox, and Safari browsers
# Required for cross-browser testing
```

#### Run E2E Tests

```bash
cd frontend

# Run E2E tests
npm run test:e2e

# Run with UI (visual test runner)
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium
```

### Code Quality Tools

#### ESLint Setup

```bash
# Backend linting
cd backend && npm run lint
cd backend && npm run lint:fix  # Auto-fix issues

# Frontend linting
cd frontend && npm run lint
cd frontend && npm run lint:fix  # Auto-fix issues
```

#### Prettier Setup (Frontend)

```bash
cd frontend

# Check formatting
npm run format:check

# Apply formatting
npm run format
```

---

## ✅ Validation & Verification

### 1. Environment Validation Script

Create and run validation script:

```bash
cd backend

# Create validation script
cat > validate-setup.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating ProcessPilot Development Setup...\n');

// Check Node.js version
const nodeVersion = process.version;
console.log(`✓ Node.js version: ${nodeVersion}`);

// Check npm version
const { execSync } = require('child_process');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✓ npm version: v${npmVersion}`);
} catch (error) {
  console.log('✗ npm not found');
}

// Check .env file
if (fs.existsSync('.env')) {
  console.log('✓ .env file exists');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = ['DB_PROVIDER', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET'];
  
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`)) {
      console.log(`  ✓ ${varName} configured`);
    } else {
      console.log(`  ✗ ${varName} missing`);
    }
  });
} else {
  console.log('✗ .env file not found');
}

// Check dependencies
if (fs.existsSync('node_modules')) {
  console.log('✓ Backend dependencies installed');
} else {
  console.log('✗ Backend dependencies not installed');
}

console.log('\n🚀 Setup validation complete!');
EOF

# Run validation
node validate-setup.js
```

### 2. Database Connection Test

```bash
cd backend

# Test database connection
npm run db:migrate

# Should output successful migration information
# If errors occur, check database configuration
```

### 3. Server Startup Test

```bash
cd backend

# Start backend server
npm run dev

# Should see output similar to:
# Server running on port 5000
# Database connected successfully
# ProcessPilot API is ready
```

### 4. Frontend Build Test

```bash
cd frontend

# Test frontend development server
npm run dev

# Should see output similar to:
# Local:   http://localhost:3000/
# Network: http://192.168.x.x:3000/
```

### 5. Integration Test

```bash
# With backend running on port 5000 and frontend on port 3000:

# Test API health endpoint
curl http://localhost:5000/health

# Should return:
# {"status":"healthy","timestamp":"...","database":"connected"}

# Test API documentation
curl http://localhost:5000/docs

# Should return HTML page or redirect to Swagger UI
```

### 6. Full Test Suite

```bash
# Run complete test suite
cd backend && npm test
cd ../frontend && npm test

# Both should pass without errors
# If tests fail, check troubleshooting section
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Backend Issues

**Issue: "Cannot connect to database"**

```bash
# Check PostgreSQL is running
# Windows:
services.msc  # Look for PostgreSQL service

# macOS:
brew services list | grep postgresql

# Linux:
sudo systemctl status postgresql

# Verify database exists
psql -U postgres -l | grep process_pilot

# Check .env configuration
cat backend/.env | grep DB_
```

**Issue: "JWT_SECRET too short"**

```bash
# Generate secure secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file
```

**Issue: "Port 5000 already in use"**

```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000

# macOS/Linux:
lsof -i :5000

# Kill process or change PORT in .env
echo "PORT=5001" >> backend/.env
```

**Issue: "Migration failed"**

```bash
# Reset database
cd backend
npm run db:rollback
npm run db:migrate

# If still failing, check database permissions:
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE process_pilot TO $USER;"
```

#### Frontend Issues

**Issue: "Module not found"**

```bash
# Clear npm cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Issue: "Vite build errors"**

```bash
# Check Node.js version (must be 18+)
node --version

# Update to compatible version if needed
# Clear Vite cache
rm -rf frontend/.vite
npm run dev
```

**Issue: "ESLint errors"**

```bash
# Auto-fix ESLint issues
cd frontend
npm run lint:fix

# If issues persist, check .eslintrc configuration
```

#### Cross-Platform Issues

**Issue: Windows path separator problems**

```bash
# Use cross-env for environment variables (already included)
# Ensure scripts use forward slashes or cross-platform tools
```

**Issue: Permission denied (Unix/Linux)**

```bash
# Fix file permissions
chmod +x scripts/*.sh
sudo chown -R $USER:$USER node_modules
```

**Issue: Different line endings**

```bash
# Configure Git to handle line endings
git config --global core.autocrlf true  # Windows
git config --global core.autocrlf input # macOS/Linux
```

### Environment-Specific Troubleshooting

#### Windows Specific

```powershell
# PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Windows Defender exclusions (for better performance)
# Add project folder to Windows Defender exclusions

# WSL2 database connection
# Use Windows IP address: host.docker.internal or 172.x.x.x
```

#### macOS Specific

```bash
# Xcode Command Line Tools (if missing)
xcode-select --install

# Homebrew PATH issues
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# PostgreSQL connection issues
brew services restart postgresql
```

#### Linux Specific

```bash
# PostgreSQL authentication issues
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"

# Port binding issues
sudo ufw allow 5000/tcp  # If firewall is enabled

# Node.js version issues (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Performance Issues

**Issue: Slow npm install**

```bash
# Use faster registry
npm config set registry https://registry.npmjs.org/
# Or use yarn as alternative
npm install -g yarn
```

**Issue: High CPU usage during development**

```bash
# Exclude node_modules from file watchers
# Add to .gitignore or IDE settings
# Consider using Docker for consistent environments
```

### Getting Help

1. **Check logs:**
   ```bash
   # Backend logs
   tail -f backend/logs/combined.log
   
   # Frontend console
   # Open browser developer tools
   ```

2. **Enable debug mode:**
   ```bash
   # Backend
   DEBUG=* npm run dev
   
   # Frontend
   # Check browser console for errors
   ```

3. **Community Support:**
   - GitHub Issues
   - Stack Overflow
   - Discord/Slack channels

---

## 📚 Additional Resources

### Documentation Links

- **[Project README](../README.md)** - Project overview and quick start
- **[Architecture Documentation](architecture.md)** - System architecture details
- **[API Documentation](http://localhost:5000/docs)** - Interactive API docs (when running)
- **[Testing Guide](../backend/TESTING.md)** - Comprehensive testing strategies

### External Resources

- **[Node.js Documentation](https://nodejs.org/docs/)**
- **[React Documentation](https://react.dev/)**
- **[PostgreSQL Documentation](https://www.postgresql.org/docs/)**
- **[Express.js Guide](https://expressjs.com/)**
- **[Vite Guide](https://vitejs.dev/guide/)**

### Development Best Practices

- Use consistent code formatting (Prettier)
- Write tests for new features
- Follow Git commit message conventions
- Keep dependencies up to date
- Monitor security vulnerabilities
- Use environment variables for configuration
- Follow the project's coding standards

---

**🎉 Congratulations! Your ProcessPilot development environment is ready.**

**Next Steps:**
1. Explore the application at `http://localhost:3000`
2. Review the API documentation at `http://localhost:5000/docs`
3. Check out the test suites to understand the codebase
4. Read the architecture documentation for deeper understanding
5. Start contributing to the project!

---

*For additional help or questions, please refer to the project's GitHub issues or contact the development team.*