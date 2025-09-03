#!/usr/bin/env node

/**
 * ProcessPilot Testing Environment Validation Script
 * 
 * This script validates that all testing frameworks and tools are properly
 * configured and working correctly.
 * 
 * Usage: node scripts/test-setup.js [--fix] [--verbose]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const autoFix = args.includes('--fix');
const verbose = args.includes('--verbose');

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

class TestSetupValidator {
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
        logInfo('🧪 Validating ProcessPilot Testing Setup...\n');

        await this.validateBackendTesting();
        await this.validateFrontendTesting();
        await this.validateE2ETesting();
        await this.validateTestDatabases();
        await this.validateCodeQuality();
        await this.runTestSamples();

        this.showResults();
        
        if (autoFix && this.fixes.length > 0) {
            await this.applyFixes();
        }
        
        return this.errors.length === 0;
    }

    async validateBackendTesting() {
        logInfo('Validating backend testing setup...');
        
        try {
            // Check if in backend directory or change to it
            const originalCwd = process.cwd();
            if (!fs.existsSync('src/app.js') && fs.existsSync('backend/src/app.js')) {
                process.chdir('backend');
            }
            
            // Check Jest configuration
            const jestConfigExists = fs.existsSync('jest.config.js') || 
                                   fs.existsSync('jest.config.json') ||
                                   JSON.parse(fs.readFileSync('package.json', 'utf8')).jest;
            
            if (jestConfigExists) {
                logSuccess('Jest configuration found');
                logVerbose('Jest config file or package.json configuration detected');
            } else {
                this.addError('Jest configuration missing');
            }
            
            // Check test files exist
            const testDirs = ['tests', 'test', '__tests__'];
            let testDirFound = false;
            
            for (const dir of testDirs) {
                if (fs.existsSync(dir)) {
                    testDirFound = true;
                    logSuccess(`Test directory found: ${dir}`);
                    
                    // Check for specific test files
                    const testFiles = this.findTestFiles(dir);
                    if (testFiles.length > 0) {
                        logVerbose(`Found ${testFiles.length} test files`);
                        testFiles.slice(0, 3).forEach(file => logVerbose(`  - ${file}`));
                        if (testFiles.length > 3) {
                            logVerbose(`  ... and ${testFiles.length - 3} more`);
                        }
                    }
                    break;
                }
            }
            
            if (!testDirFound) {
                this.addWarning('No test directory found');
            }
            
            // Check test dependencies
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const testDeps = ['jest', 'supertest'];
            
            for (const dep of testDeps) {
                if (packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]) {
                    logSuccess(`Test dependency found: ${dep}`);
                } else {
                    this.addError(`Missing test dependency: ${dep}`);
                }
            }
            
            // Check test scripts
            const testScripts = ['test', 'test:unit', 'test:integration', 'test:coverage'];
            for (const script of testScripts) {
                if (packageJson.scripts?.[script]) {
                    logVerbose(`Test script available: ${script}`);
                } else if (script === 'test') {
                    this.addError('Missing required "test" script in package.json');
                }
            }
            
            process.chdir(originalCwd);
        } catch (error) {
            this.addError(`Backend testing validation failed: ${error.message}`);
        }
        
        console.log();
    }

    async validateFrontendTesting() {
        logInfo('Validating frontend testing setup...');
        
        try {
            const originalCwd = process.cwd();
            if (!fs.existsSync('src/main.jsx') && fs.existsSync('frontend/src/main.jsx')) {
                process.chdir('frontend');
            }
            
            // Check Vitest configuration
            const vitestConfigExists = fs.existsSync('vitest.config.js') ||
                                      fs.existsSync('vitest.config.ts') ||
                                      fs.existsSync('vite.config.js') ||
                                      fs.existsSync('vite.config.ts');
            
            if (vitestConfigExists) {
                logSuccess('Vitest/Vite configuration found');
            } else {
                this.addError('Vitest configuration missing');
            }
            
            // Check test files
            const testPatterns = ['**/*.test.jsx', '**/*.test.js', '**/*.spec.jsx', '**/*.spec.js'];
            let testFilesFound = 0;
            
            for (const pattern of testPatterns) {
                try {
                    const files = execSync(`find . -name "${pattern.replace('**/', '')}" 2>/dev/null || echo ""`, 
                                         { encoding: 'utf8' });
                    const fileList = files.trim().split('\n').filter(f => f);
                    testFilesFound += fileList.length;
                    
                    if (fileList.length > 0 && verbose) {
                        logVerbose(`Found ${fileList.length} ${pattern} files`);
                    }
                } catch (error) {
                    // Ignore find errors
                }
            }
            
            if (testFilesFound > 0) {
                logSuccess(`Found ${testFilesFound} frontend test files`);
            } else {
                this.addWarning('No frontend test files found');
            }
            
            // Check test dependencies
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const testDeps = ['vitest', '@testing-library/react', '@testing-library/jest-dom'];
            
            for (const dep of testDeps) {
                if (packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]) {
                    logSuccess(`Test dependency found: ${dep}`);
                } else {
                    this.addError(`Missing test dependency: ${dep}`);
                }
            }
            
            process.chdir(originalCwd);
        } catch (error) {
            this.addError(`Frontend testing validation failed: ${error.message}`);
        }
        
        console.log();
    }

    async validateE2ETesting() {
        logInfo('Validating E2E testing setup...');
        
        try {
            const originalCwd = process.cwd();
            if (!fs.existsSync('playwright.config.js') && fs.existsSync('frontend/playwright.config.js')) {
                process.chdir('frontend');
            }
            
            // Check Playwright configuration
            if (fs.existsSync('playwright.config.js') || fs.existsSync('playwright.config.ts')) {
                logSuccess('Playwright configuration found');
                
                // Check for test files
                const e2eTestDirs = ['tests', 'e2e', 'test'];
                let e2eTestsFound = false;
                
                for (const dir of e2eTestDirs) {
                    if (fs.existsSync(dir)) {
                        const files = fs.readdirSync(dir).filter(f => 
                            f.endsWith('.spec.js') || f.endsWith('.spec.ts') || 
                            f.endsWith('.test.js') || f.endsWith('.test.ts')
                        );
                        
                        if (files.length > 0) {
                            e2eTestsFound = true;
                            logSuccess(`Found ${files.length} E2E test files in ${dir}/`);
                            logVerbose(`E2E tests: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
                        }
                    }
                }
                
                if (!e2eTestsFound) {
                    this.addWarning('No E2E test files found');
                }
            } else {
                this.addWarning('Playwright configuration not found - E2E testing not set up');
            }
            
            // Check Playwright installation
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (packageJson.devDependencies?.['@playwright/test'] || packageJson.dependencies?.['@playwright/test']) {
                logSuccess('Playwright dependency found');
                
                // Check if browsers are installed
                try {
                    execSync('npx playwright --version', { stdio: 'pipe' });
                    logSuccess('Playwright CLI available');
                } catch (error) {
                    this.addWarning('Playwright CLI not working - may need browser installation');
                }
            } else {
                this.addWarning('Playwright not installed');
            }
            
            process.chdir(originalCwd);
        } catch (error) {
            this.addError(`E2E testing validation failed: ${error.message}`);
        }
        
        console.log();
    }

    async validateTestDatabases() {
        logInfo('Validating test database setup...');
        
        try {
            // Check if test database exists
            const dbCheck = execSync('psql -U postgres -lqt', { encoding: 'utf8', stdio: 'pipe' });
            
            if (dbCheck.includes('process_pilot_test')) {
                logSuccess('Test database "process_pilot_test" exists');
            } else {
                this.addWarning('Test database "process_pilot_test" not found');
                this.fixes.push(() => {
                    logInfo('Creating test database...');
                    execSync('psql -U postgres -c "CREATE DATABASE process_pilot_test;"');
                    logSuccess('Test database created');
                });
            }
            
            // Check test database connection
            if (fs.existsSync('backend/.env')) {
                const originalCwd = process.cwd();
                if (!fs.existsSync('src/app.js')) {
                    process.chdir('backend');
                }
                
                try {
                    // Test connection with test environment
                    process.env.NODE_ENV = 'test';
                    const dbConfig = require(path.resolve('src/config/database.js'));
                    const db = dbConfig();
                    
                    await db.raw('SELECT 1');
                    logSuccess('Test database connection working');
                    
                    await db.destroy();
                } catch (error) {
                    this.addError(`Test database connection failed: ${error.message}`);
                } finally {
                    delete process.env.NODE_ENV;
                    process.chdir(originalCwd);
                }
            }
        } catch (error) {
            this.addWarning(`Could not validate test database: ${error.message}`);
        }
        
        console.log();
    }

    async validateCodeQuality() {
        logInfo('Validating code quality tools...');
        
        // Check ESLint configuration
        const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
        let eslintFound = false;
        
        for (const config of eslintConfigs) {
            if (fs.existsSync(config) || fs.existsSync(`backend/${config}`) || fs.existsSync(`frontend/${config}`)) {
                eslintFound = true;
                logSuccess(`ESLint configuration found: ${config}`);
                break;
            }
        }
        
        if (!eslintFound) {
            // Check package.json for eslint config
            try {
                const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                if (packageJson.eslintConfig) {
                    eslintFound = true;
                    logSuccess('ESLint configuration found in package.json');
                }
            } catch (error) {
                // Ignore
            }
        }
        
        if (!eslintFound) {
            this.addWarning('ESLint configuration not found');
        }
        
        // Check Prettier configuration
        const prettierConfigs = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'];
        let prettierFound = false;
        
        for (const config of prettierConfigs) {
            if (fs.existsSync(config) || fs.existsSync(`frontend/${config}`)) {
                prettierFound = true;
                logSuccess(`Prettier configuration found: ${config}`);
                break;
            }
        }
        
        if (!prettierFound) {
            this.addWarning('Prettier configuration not found (optional)');
        }
        
        console.log();
    }

    async runTestSamples() {
        logInfo('Running sample tests...');
        
        // Test backend linting
        try {
            process.chdir('backend');
            execSync('npm run lint', { stdio: 'pipe' });
            logSuccess('Backend linting passed');
            process.chdir('..');
        } catch (error) {
            this.addWarning('Backend linting issues found');
            process.chdir('..');
        }
        
        // Test frontend linting
        try {
            process.chdir('frontend');
            execSync('npm run lint', { stdio: 'pipe' });
            logSuccess('Frontend linting passed');
            process.chdir('..');
        } catch (error) {
            this.addWarning('Frontend linting issues found');
            process.chdir('..');
        }
        
        // Quick test run (if not too slow)
        if (process.env.QUICK_TEST !== 'false') {
            try {
                process.chdir('backend');
                logVerbose('Running quick backend test sample...');
                execSync('timeout 30s npm test -- --testPathPattern=models --maxWorkers=1 || npm test -- --testNamePattern="should" --maxWorkers=1', 
                        { stdio: 'pipe' });
                logSuccess('Backend tests can run');
                process.chdir('..');
            } catch (error) {
                this.addWarning('Backend test execution may have issues');
                process.chdir('..');
            }
        }
        
        console.log();
    }

    findTestFiles(directory) {
        const testFiles = [];
        
        const scanDirectory = (dir) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    
                    if (stat.isDirectory()) {
                        scanDirectory(fullPath);
                    } else if (file.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
                        testFiles.push(fullPath);
                    }
                }
            } catch (error) {
                // Ignore errors (permission denied, etc.)
            }
        };
        
        scanDirectory(directory);
        return testFiles;
    }

    showResults() {
        console.log(colorize('═'.repeat(60), 'cyan'));
        console.log(colorize('            TESTING SETUP RESULTS', 'bright'));
        console.log(colorize('═'.repeat(60), 'cyan'));
        console.log();
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            logSuccess('🎉 All testing validations passed! Your test environment is ready.');
            console.log();
            this.showTestingGuide();
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
                logSuccess('No critical errors found. Testing setup is functional.');
                this.showTestingGuide();
            } else {
                logError('Please fix the errors above before running tests.');
                
                if (this.fixes.length > 0 && !autoFix) {
                    console.log();
                    logInfo('Some issues can be automatically fixed. Run with --fix to apply fixes.');
                }
            }
        }
    }

    showTestingGuide() {
        console.log(colorize('📋 Testing Commands:', 'blue'));
        console.log();
        console.log(colorize('Backend Tests:', 'cyan'));
        console.log('  cd backend');
        console.log('  npm test                    # Run all tests');
        console.log('  npm run test:unit           # Unit tests only');
        console.log('  npm run test:integration    # Integration tests only');
        console.log('  npm run test:coverage       # With coverage report');
        console.log('  npm run test:watch          # Watch mode');
        console.log();
        console.log(colorize('Frontend Tests:', 'cyan'));
        console.log('  cd frontend');
        console.log('  npm test                    # Run Vitest tests');
        console.log('  npm run test:ui             # Interactive test runner');
        console.log('  npm run test:coverage       # With coverage report');
        console.log();
        console.log(colorize('E2E Tests:', 'cyan'));
        console.log('  cd frontend');
        console.log('  npm run test:e2e            # Run Playwright tests');
        console.log('  npm run test:e2e:ui         # Interactive E2E runner');
        console.log();
        console.log(colorize('Code Quality:', 'cyan'));
        console.log('  cd backend && npm run lint  # Backend linting');
        console.log('  cd frontend && npm run lint # Frontend linting');
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
ProcessPilot Testing Setup Validation Script

Usage: node scripts/test-setup.js [options]

Options:
  --verbose    Show detailed information during validation
  --fix        Automatically fix issues where possible
  --help, -h   Show this help message

Examples:
  node scripts/test-setup.js
  node scripts/test-setup.js --verbose
  node scripts/test-setup.js --fix
        `);
        return;
    }
    
    const validator = new TestSetupValidator();
    const success = await validator.run();
    
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(colorize(`Testing validation failed: ${error.message}`, 'red'));
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}

module.exports = TestSetupValidator;