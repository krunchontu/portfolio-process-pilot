#!/usr/bin/env node

/**
 * ProcessPilot Development Setup Validation Script
 * 
 * This script validates that the development environment is properly configured
 * and all components are working correctly.
 * 
 * Usage: node scripts/validate-setup.js [--verbose] [--fix]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const autoFix = args.includes('--fix');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// Utility functions
function colorize(text, color = 'reset') {
    return `${colors[color]}${text}${colors.reset}`;
}

function logInfo(message) {
    console.log(colorize(`[INFO] ${message}`, 'blue'));
}

function logSuccess(message) {
    console.log(colorize(`[SUCCESS] ${message}`, 'green'));
}

function logWarning(message) {
    console.log(colorize(`[WARNING] ${message}`, 'yellow'));
}

function logError(message) {
    console.log(colorize(`[ERROR] ${message}`, 'red'));
}

function logVerbose(message) {
    if (verbose) {
        console.log(colorize(`[DEBUG] ${message}`, 'cyan'));
    }
}

// Validation functions
class SetupValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.fixes = [];
    }

    addError(message, fix = null) {
        this.errors.push(message);
        if (fix) {
            this.fixes.push(fix);
        }
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    async run() {
        logInfo('🔍 Validating ProcessPilot Development Setup...\n');

        // Run all validation checks
        await this.validateEnvironment();
        await this.validateDependencies();
        await this.validateFileStructure();
        await this.validateEnvironmentFiles();
        await this.validateDatabaseConnection();
        await this.validateProjectDependencies();
        await this.validateScripts();
        await this.validatePorts();
        
        // Show results
        this.showResults();
        
        // Apply fixes if requested
        if (autoFix && this.fixes.length > 0) {
            await this.applyFixes();
        }
        
        return this.errors.length === 0;
    }

    async validateEnvironment() {
        logInfo('Checking system environment...');
        
        // Check Node.js version
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
            
            if (majorVersion >= 18) {
                logSuccess(`Node.js ${nodeVersion} (✓ >= 18.0.0)`);
                logVerbose(`Node.js path: ${process.execPath}`);
            } else {
                this.addError(`Node.js ${nodeVersion} is too old. Requires >= 18.0.0`);
            }
        } catch (error) {
            this.addError('Could not determine Node.js version');
        }
        
        // Check npm version
        try {
            const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
            logSuccess(`npm v${npmVersion}`);
            logVerbose(`npm path: ${execSync('which npm || where npm', { encoding: 'utf8' }).trim()}`);
        } catch (error) {
            this.addError('npm not found or not working');
        }
        
        // Check Git
        try {
            const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
            logSuccess(gitVersion);
        } catch (error) {
            this.addError('Git not found or not working');
        }
        
        // Check PostgreSQL
        try {
            const pgVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
            logSuccess(pgVersion);
        } catch (error) {
            this.addWarning('PostgreSQL client (psql) not found in PATH');
        }
        
        console.log();
    }

    async validateFileStructure() {
        logInfo('Checking project file structure...');
        
        const requiredFiles = [
            'package.json',
            'README.md',
            'backend/package.json',
            'frontend/package.json',
            'backend/src/app.js',
            'frontend/src/main.jsx',
            'docs/DEVELOPMENT_SETUP.md'
        ];
        
        const requiredDirs = [
            'backend',
            'frontend', 
            'backend/src',
            'frontend/src',
            'docs',
            'scripts'
        ];
        
        for (const file of requiredFiles) {
            if (fs.existsSync(file)) {
                logVerbose(`✓ ${file}`);
            } else {
                this.addError(`Required file missing: ${file}`);
            }
        }
        
        for (const dir of requiredDirs) {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                logVerbose(`✓ ${dir}/`);
            } else {
                this.addError(`Required directory missing: ${dir}/`);
            }
        }
        
        logSuccess('Project structure validation complete');
        console.log();
    }

    async validateEnvironmentFiles() {
        logInfo('Checking environment configuration...');
        
        // Check backend .env file
        const envPath = 'backend/.env';
        if (fs.existsSync(envPath)) {
            logSuccess('backend/.env file exists');
            
            const envContent = fs.readFileSync(envPath, 'utf8');
            const requiredVars = [
                'NODE_ENV',
                'PORT',
                'DB_PROVIDER',
                'JWT_SECRET',
                'JWT_REFRESH_SECRET',
                'SESSION_SECRET'
            ];
            
            for (const varName of requiredVars) {
                const regex = new RegExp(`^${varName}=(.+)$`, 'm');
                const match = envContent.match(regex);
                
                if (match && match[1].trim()) {
                    logVerbose(`✓ ${varName} configured`);
                    
                    // Validate secret lengths
                    if (varName.includes('SECRET') && match[1].length < 32) {
                        this.addWarning(`${varName} is less than 32 characters (current: ${match[1].length})`);
                    }
                } else {
                    this.addError(`${varName} missing or empty in .env file`);
                }
            }
        } else {
            this.addError('backend/.env file not found', () => {
                logInfo('Creating backend/.env from example...');
                if (fs.existsSync('backend/.env.example')) {
                    fs.copyFileSync('backend/.env.example', envPath);
                    logSuccess('Created backend/.env from template');
                }
            });
        }
        
        // Check frontend environment (if applicable)
        const frontendEnvPath = 'frontend/.env';
        if (fs.existsSync(frontendEnvPath)) {
            logSuccess('frontend/.env file exists');
        } else {
            logVerbose('frontend/.env not found (optional for development)');
        }
        
        console.log();
    }

    async validateDatabaseConnection() {
        logInfo('Testing database connection...');
        
        try {
            // Try to require database config
            const dbConfigPath = path.resolve('backend/src/config/database.js');
            if (fs.existsSync(dbConfigPath)) {
                logVerbose(`Loading database config from ${dbConfigPath}`);
                
                // Change to backend directory for proper relative imports
                const originalCwd = process.cwd();
                process.chdir('backend');
                
                try {
                    // Test database connection
                    const dbConfig = require(path.resolve('src/config/database.js'));
                    const db = dbConfig();
                    
                    // Simple connection test
                    await db.raw('SELECT 1 as test');
                    logSuccess('Database connection successful');
                    
                    // Check if tables exist
                    const tables = await db('information_schema.tables')
                        .where('table_schema', 'public')
                        .select('table_name');
                    
                    const requiredTables = ['users', 'workflows', 'requests', 'request_history'];
                    const existingTables = tables.map(t => t.table_name);
                    
                    for (const table of requiredTables) {
                        if (existingTables.includes(table)) {
                            logVerbose(`✓ Table '${table}' exists`);
                        } else {
                            this.addWarning(`Table '${table}' not found. Run 'npm run db:migrate' in backend/`);
                        }
                    }
                    
                    await db.destroy();
                } finally {
                    process.chdir(originalCwd);
                }
            } else {
                this.addError('Database configuration file not found');
            }
        } catch (error) {
            this.addError(`Database connection failed: ${error.message}`);
            logVerbose(`Full error: ${error.stack}`);
        }
        
        console.log();
    }

    async validateProjectDependencies() {
        logInfo('Checking project dependencies...');
        
        // Check backend dependencies
        const backendNodeModules = 'backend/node_modules';
        if (fs.existsSync(backendNodeModules)) {
            logSuccess('Backend dependencies installed');
            
            // Check for key packages
            const keyPackages = ['express', 'knex', 'pg', 'jsonwebtoken'];
            for (const pkg of keyPackages) {
                const pkgPath = path.join(backendNodeModules, pkg);
                if (fs.existsSync(pkgPath)) {
                    logVerbose(`✓ ${pkg}`);
                } else {
                    this.addWarning(`Key backend package missing: ${pkg}`);
                }
            }
        } else {
            this.addError('Backend dependencies not installed. Run "npm install" in backend/');
        }
        
        // Check frontend dependencies
        const frontendNodeModules = 'frontend/node_modules';
        if (fs.existsSync(frontendNodeModules)) {
            logSuccess('Frontend dependencies installed');
            
            // Check for key packages
            const keyPackages = ['react', 'react-dom', 'vite', 'tailwindcss'];
            for (const pkg of keyPackages) {
                const pkgPath = path.join(frontendNodeModules, pkg);
                if (fs.existsSync(pkgPath)) {
                    logVerbose(`✓ ${pkg}`);
                } else {
                    this.addWarning(`Key frontend package missing: ${pkg}`);
                }
            }
        } else {
            this.addError('Frontend dependencies not installed. Run "npm install" in frontend/');
        }
        
        console.log();
    }

    async validateScripts() {
        logInfo('Testing npm scripts...');
        
        // Test backend scripts
        try {
            process.chdir('backend');
            
            // Test linting
            try {
                execSync('npm run lint', { stdio: 'pipe' });
                logSuccess('Backend linting passed');
            } catch (error) {
                this.addWarning('Backend linting issues found');
                logVerbose(`Lint error: ${error.message}`);
            }
            
            // Test if migration command works (without actually running)
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (packageJson.scripts && packageJson.scripts['db:migrate']) {
                logVerbose('✓ db:migrate script available');
            } else {
                this.addError('db:migrate script missing from backend package.json');
            }
            
            process.chdir('..');
        } catch (error) {
            this.addError(`Error testing backend scripts: ${error.message}`);
            if (process.cwd().endsWith('backend')) {
                process.chdir('..');
            }
        }
        
        // Test frontend scripts
        try {
            process.chdir('frontend');
            
            // Test linting
            try {
                execSync('npm run lint', { stdio: 'pipe' });
                logSuccess('Frontend linting passed');
            } catch (error) {
                this.addWarning('Frontend linting issues found');
                logVerbose(`Lint error: ${error.message}`);
            }
            
            process.chdir('..');
        } catch (error) {
            this.addError(`Error testing frontend scripts: ${error.message}`);
            if (process.cwd().endsWith('frontend')) {
                process.chdir('..');
            }
        }
        
        console.log();
    }

    async validatePorts() {
        logInfo('Checking port availability...');
        
        const net = require('net');
        
        // Check if ports are available
        const checkPort = (port) => {
            return new Promise((resolve) => {
                const server = net.createServer();
                server.listen(port, () => {
                    server.close();
                    resolve(true);  // Port is available
                });
                server.on('error', () => {
                    resolve(false); // Port is in use
                });
            });
        };
        
        const backendPort = 5000;
        const frontendPort = 3000;
        
        const backendAvailable = await checkPort(backendPort);
        const frontendAvailable = await checkPort(frontendPort);
        
        if (backendAvailable) {
            logSuccess(`Backend port ${backendPort} is available`);
        } else {
            this.addWarning(`Backend port ${backendPort} is in use`);
        }
        
        if (frontendAvailable) {
            logSuccess(`Frontend port ${frontendPort} is available`);
        } else {
            this.addWarning(`Frontend port ${frontendPort} is in use`);
        }
        
        console.log();
    }

    showResults() {
        console.log(colorize('═'.repeat(60), 'cyan'));
        console.log(colorize('                VALIDATION RESULTS', 'bright'));
        console.log(colorize('═'.repeat(60), 'cyan'));
        console.log();
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            logSuccess('🎉 All validations passed! Your development environment is ready.');
            console.log();
            this.showNextSteps();
        } else {
            if (this.errors.length > 0) {
                logError(`Found ${this.errors.length} error(s):`);
                this.errors.forEach((error, index) => {
                    console.log(colorize(`  ${index + 1}. ${error}`, 'red'));
                });
                console.log();
            }
            
            if (this.warnings.length > 0) {
                logWarning(`Found ${this.warnings.length} warning(s):`);
                this.warnings.forEach((warning, index) => {
                    console.log(colorize(`  ${index + 1}. ${warning}`, 'yellow'));
                });
                console.log();
            }
            
            if (this.errors.length === 0) {
                logSuccess('No critical errors found. You can proceed with development.');
                this.showNextSteps();
            } else {
                logError('Please fix the errors above before proceeding.');
                
                if (this.fixes.length > 0 && !autoFix) {
                    console.log();
                    logInfo('Some issues can be automatically fixed. Run with --fix to apply fixes.');
                }
            }
        }
    }

    showNextSteps() {
        console.log(colorize('📋 Next Steps:', 'blue'));
        console.log('  1. Start backend:     cd backend && npm run dev');
        console.log('  2. Start frontend:    cd frontend && npm run dev');
        console.log('  3. Open application:  http://localhost:3000');
        console.log('  4. API docs:          http://localhost:5000/docs');
        console.log();
        console.log(colorize('🔐 Default credentials:', 'blue'));
        console.log('  Admin:    admin@processpilot.com / Admin123!');
        console.log('  Manager:  manager@processpilot.com / Manager123!');
        console.log('  Employee: employee@processpilot.com / Employee123!');
        console.log();
    }

    async applyFixes() {
        if (this.fixes.length === 0) {
            return;
        }
        
        logInfo(`Applying ${this.fixes.length} automated fix(es)...`);
        
        for (const fix of this.fixes) {
            try {
                await fix();
            } catch (error) {
                logError(`Fix failed: ${error.message}`);
            }
        }
        
        logSuccess('Automated fixes applied');
    }
}

// Main execution
async function main() {
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
ProcessPilot Development Setup Validation Script

Usage: node scripts/validate-setup.js [options]

Options:
  --verbose    Show detailed information during validation
  --fix        Automatically fix issues where possible
  --help, -h   Show this help message

Examples:
  node scripts/validate-setup.js
  node scripts/validate-setup.js --verbose
  node scripts/validate-setup.js --fix
        `);
        return;
    }
    
    const validator = new SetupValidator();
    const success = await validator.run();
    
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        logError(`Validation failed: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}

module.exports = SetupValidator;