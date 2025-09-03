# ProcessPilot Development Environment Setup Script (PowerShell)
# Compatible with: Windows PowerShell 5.0+, PowerShell Core 6.0+
# Usage: .\scripts\setup-dev-env.ps1 [-SkipDeps] [-Quick] [-Help]

param(
    [switch]$SkipDeps = $false,
    [switch]$Quick = $false,
    [switch]$Help = $false
)

# Script configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colors for output
$colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
}

# Utility functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Prefix = ""
    )
    
    if ($Prefix) {
        Write-Host "[$Prefix] " -ForegroundColor $Color -NoNewline
    }
    Write-Host $Message -ForegroundColor $Color
}

function Write-Info { param([string]$Message) Write-ColorOutput $Message $colors.Blue "INFO" }
function Write-Success { param([string]$Message) Write-ColorOutput $Message $colors.Green "SUCCESS" }
function Write-Warning { param([string]$Message) Write-ColorOutput $Message $colors.Yellow "WARNING" }
function Write-Error { param([string]$Message) Write-ColorOutput $Message $colors.Red "ERROR" }

function Test-CommandExists {
    param([string]$Command)
    
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Show-Help {
    Write-Host @"
ProcessPilot Development Environment Setup Script (PowerShell)

USAGE:
    .\scripts\setup-dev-env.ps1 [-SkipDeps] [-Quick] [-Help]

OPTIONS:
    -SkipDeps    Skip system dependency installation
    -Quick       Quick setup (minimal checks)
    -Help        Show this help message

EXAMPLES:
    .\scripts\setup-dev-env.ps1
    .\scripts\setup-dev-env.ps1 -SkipDeps
    .\scripts\setup-dev-env.ps1 -Quick

"@
    exit 0
}

function Test-Requirements {
    Write-Info "Checking system requirements..."
    
    $errors = 0
    
    # Check PowerShell version
    $psVersion = $PSVersionTable.PSVersion
    if ($psVersion.Major -ge 5) {
        Write-Success "PowerShell $psVersion"
    } else {
        Write-Error "PowerShell $psVersion is too old. Requires PowerShell 5.0+"
        $errors++
    }
    
    # Check Node.js version
    if (Test-CommandExists "node") {
        $nodeVersion = node --version
        $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        
        if ($majorVersion -ge 18) {
            Write-Success "Node.js $nodeVersion (✓ >= 18.0.0)"
        } else {
            Write-Error "Node.js $nodeVersion is too old. Requires >= 18.0.0"
            $errors++
        }
    } else {
        if (-not $SkipDeps) {
            Write-Warning "Node.js not found. Will install."
        } else {
            Write-Error "Node.js not found"
            $errors++
        }
    }
    
    # Check npm
    if (Test-CommandExists "npm") {
        $npmVersion = npm --version
        Write-Success "npm $npmVersion"
    } else {
        if (-not $SkipDeps) {
            Write-Warning "npm not found. Will install with Node.js."
        } else {
            Write-Error "npm not found"
            $errors++
        }
    }
    
    # Check PostgreSQL
    if (Test-CommandExists "psql") {
        $pgVersion = psql --version
        Write-Success "$pgVersion"
    } else {
        if (-not $SkipDeps) {
            Write-Warning "PostgreSQL not found. Will provide installation guidance."
        } else {
            Write-Error "PostgreSQL not found"
            $errors++
        }
    }
    
    # Check Git
    if (Test-CommandExists "git") {
        $gitVersion = git --version
        Write-Success "$gitVersion"
    } else {
        Write-Error "Git not found and is required"
        $errors++
    }
    
    if ($errors -gt 0 -and $SkipDeps) {
        Write-Error "Missing $errors required dependencies. Install them or remove -SkipDeps flag."
        exit 1
    }
    
    return $errors
}

function Install-Dependencies {
    if ($SkipDeps) {
        Write-Info "Skipping system dependency installation"
        return
    }
    
    Write-Info "Installing Windows dependencies..."
    Write-Host ""
    
    # Check if running as Administrator
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Warning "Not running as Administrator. Some installations may require elevation."
    }
    
    # Check for package managers
    $hasChocolatey = Test-CommandExists "choco"
    $hasWinget = Test-CommandExists "winget"
    $hasScoop = Test-CommandExists "scoop"
    
    if ($hasChocolatey) {
        Write-Info "Chocolatey detected. Installing dependencies..."
        Install-WithChocolatey
    } elseif ($hasWinget) {
        Write-Info "winget detected. Installing dependencies..."
        Install-WithWinget
    } elseif ($hasScoop) {
        Write-Info "Scoop detected. Installing dependencies..."
        Install-WithScoop
    } else {
        Write-Info "No package manager detected. Providing manual installation guidance..."
        Show-ManualInstallation
    }
}

function Install-WithChocolatey {
    try {
        # Install Node.js
        if (-not (Test-CommandExists "node")) {
            Write-Info "Installing Node.js via Chocolatey..."
            choco install nodejs -y
        }
        
        # Install PostgreSQL
        if (-not (Test-CommandExists "psql")) {
            Write-Info "Installing PostgreSQL via Chocolatey..."
            choco install postgresql -y
        }
        
        # Refresh environment
        Write-Info "Refreshing environment variables..."
        refreshenv
        
        Write-Success "Dependencies installed via Chocolatey"
    } catch {
        Write-Error "Failed to install dependencies via Chocolatey: $($_.Exception.Message)"
    }
}

function Install-WithWinget {
    try {
        # Install Node.js
        if (-not (Test-CommandExists "node")) {
            Write-Info "Installing Node.js via winget..."
            winget install OpenJS.NodeJS
        }
        
        # Install PostgreSQL
        if (-not (Test-CommandExists "psql")) {
            Write-Info "Installing PostgreSQL via winget..."
            winget install PostgreSQL.PostgreSQL
        }
        
        Write-Success "Dependencies installed via winget"
        Write-Info "You may need to restart your terminal or add to PATH manually"
    } catch {
        Write-Error "Failed to install dependencies via winget: $($_.Exception.Message)"
    }
}

function Install-WithScoop {
    try {
        # Install Node.js
        if (-not (Test-CommandExists "node")) {
            Write-Info "Installing Node.js via Scoop..."
            scoop install nodejs
        }
        
        # Install PostgreSQL
        if (-not (Test-CommandExists "psql")) {
            Write-Info "Installing PostgreSQL via Scoop..."
            scoop install postgresql
        }
        
        Write-Success "Dependencies installed via Scoop"
    } catch {
        Write-Error "Failed to install dependencies via Scoop: $($_.Exception.Message)"
    }
}

function Show-ManualInstallation {
    Write-Host @"
For manual installation, download and install:

1. Node.js 18+ LTS: https://nodejs.org/
2. PostgreSQL 13+: https://www.postgresql.org/download/windows/
3. Git for Windows: https://git-scm.com/download/win

Alternative - Install a package manager first:
- Chocolatey: https://chocolatey.org/install
- winget: Comes with Windows 10 1809+/Windows 11
- Scoop: https://scoop.sh/

"@
    
    Read-Host "Press Enter after installing required dependencies"
    
    # Re-check requirements
    Test-Requirements
}

function Setup-Database {
    Write-Info "Setting up PostgreSQL databases..."
    
    # Check if PostgreSQL service is running
    $pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
    if (-not $pgService -or $pgService.Status -ne "Running") {
        Write-Warning "PostgreSQL service not running. Attempting to start..."
        
        try {
            # Try common service names
            $serviceNames = @("postgresql", "postgresql-x64-13", "postgresql-x64-14", "postgresql-x64-15")
            foreach ($serviceName in $serviceNames) {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    Start-Service -Name $serviceName
                    Write-Success "Started PostgreSQL service: $serviceName"
                    break
                }
            }
        } catch {
            Write-Warning "Could not start PostgreSQL service automatically. Please start it manually."
        }
    }
    
    try {
        # Create development database
        Write-Info "Creating development database..."
        $result = psql -U postgres -c "CREATE DATABASE process_pilot;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Created database 'process_pilot'"
        } else {
            Write-Info "Database 'process_pilot' may already exist"
        }
        
        # Create test database
        Write-Info "Creating test database..."
        $result = psql -U postgres -c "CREATE DATABASE process_pilot_test;" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Created database 'process_pilot_test'"
        } else {
            Write-Info "Database 'process_pilot_test' may already exist"
        }
    } catch {
        Write-Warning "Database creation failed. You may need to configure manually."
        Write-Info "Run these commands manually:"
        Write-Info "  psql -U postgres -c `"CREATE DATABASE process_pilot;`""
        Write-Info "  psql -U postgres -c `"CREATE DATABASE process_pilot_test;`""
    }
}

function New-EnvironmentFile {
    Write-Info "Setting up environment configuration..."
    
    $envPath = "backend\.env"
    
    if (Test-Path $envPath) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        Write-Warning "backend\.env already exists. Creating backup..."
        Copy-Item $envPath "backend\.env.backup.$timestamp"
    }
    
    # Generate secure secrets
    $jwtSecret = [System.Web.Security.Membership]::GeneratePassword(64, 16)
    $refreshSecret = [System.Web.Security.Membership]::GeneratePassword(64, 16)
    $sessionSecret = [System.Web.Security.Membership]::GeneratePassword(64, 16)
    
    # Create .env content
    $envContent = @"
# ProcessPilot Development Environment
# Generated by PowerShell setup script on $(Get-Date)

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
DB_PASSWORD=
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$refreshSecret
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret for CSRF Protection
SESSION_SECRET=$sessionSecret

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Email Configuration (Optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# FROM_EMAIL=noreply@processpilot.com

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@
    
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Success "Created backend\.env with secure secrets"
}

function Install-ProjectDependencies {
    Write-Info "Installing project dependencies..."
    
    try {
        # Backend dependencies
        Write-Info "Installing backend dependencies..."
        Set-Location "backend"
        npm install
        Set-Location ".."
        Write-Success "Backend dependencies installed"
        
        # Frontend dependencies
        Write-Info "Installing frontend dependencies..."
        Set-Location "frontend"
        npm install
        Set-Location ".."
        Write-Success "Frontend dependencies installed"
    } catch {
        Write-Error "Failed to install project dependencies: $($_.Exception.Message)"
        exit 1
    }
}

function Setup-DatabaseSchema {
    Write-Info "Setting up database schema..."
    
    try {
        Set-Location "backend"
        
        # Run migrations
        Write-Info "Running database migrations..."
        npm run db:migrate
        Write-Success "Database migrations completed"
        
        # Run seeds
        Write-Info "Running database seeds..."
        npm run db:seed
        Write-Success "Database seeds completed"
        
        Set-Location ".."
    } catch {
        Write-Warning "Database schema setup had issues. You may need to run migrations manually."
        Set-Location ".."
    }
}

function Test-Setup {
    if ($Quick) {
        Write-Info "Skipping validation in quick mode"
        return
    }
    
    Write-Info "Validating setup..."
    
    try {
        # Test backend
        Write-Info "Testing backend setup..."
        Set-Location "backend"
        
        # Test linting
        $null = npm run lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend linting passed"
        } else {
            Write-Warning "Backend linting issues found"
        }
        
        Set-Location ".."
        
        # Test frontend
        Write-Info "Testing frontend setup..."
        Set-Location "frontend"
        
        $null = npm run lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend linting passed"
        } else {
            Write-Warning "Frontend linting issues found"
        }
        
        # Test build
        $null = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend build successful"
            if (Test-Path "dist") {
                Remove-Item "dist" -Recurse -Force
            }
        } else {
            Write-Warning "Frontend build test failed"
        }
        
        Set-Location ".."
    } catch {
        Write-Warning "Some validation tests failed, but setup should still work"
        Set-Location ".."
    }
}

function Show-CompletionInfo {
    Write-Host ""
    Write-ColorOutput "═══════════════════════════════════════════" $colors.Green
    Write-ColorOutput "  ProcessPilot Setup Complete! 🎉" $colors.Green
    Write-ColorOutput "═══════════════════════════════════════════" $colors.Green
    Write-Host ""
    
    Write-ColorOutput "📋 Next Steps:" $colors.Blue
    Write-Host "  1. Start backend:     " -NoNewline
    Write-ColorOutput "cd backend && npm run dev" $colors.Green
    Write-Host "  2. Start frontend:    " -NoNewline
    Write-ColorOutput "cd frontend && npm run dev" $colors.Green
    Write-Host "  3. Open application:  " -NoNewline
    Write-ColorOutput "http://localhost:3000" $colors.Green
    Write-Host "  4. API documentation: " -NoNewline
    Write-ColorOutput "http://localhost:5000/docs" $colors.Green
    Write-Host ""
    
    Write-ColorOutput "🔐 Default Login Credentials:" $colors.Blue
    Write-Host "  Admin:    " -NoNewline
    Write-ColorOutput "admin@processpilot.com / Admin123!" $colors.Green
    Write-Host "  Manager:  " -NoNewline
    Write-ColorOutput "manager@processpilot.com / Manager123!" $colors.Green
    Write-Host "  Employee: " -NoNewline
    Write-ColorOutput "employee@processpilot.com / Employee123!" $colors.Green
    Write-Host ""
    
    Write-ColorOutput "📚 Documentation:" $colors.Blue
    Write-Host "  Setup Guide: " -NoNewline
    Write-ColorOutput "docs\DEVELOPMENT_SETUP.md" $colors.Green
    Write-Host "  Project README: " -NoNewline
    Write-ColorOutput "README.md" $colors.Green
    Write-Host ""
    
    Write-ColorOutput "💡 Tip: Run tests with 'npm test' in backend and frontend directories" $colors.Yellow
    Write-Host ""
}

function Main {
    # Show help if requested
    if ($Help) {
        Show-Help
    }
    
    # Display header
    Write-Host ""
    Write-ColorOutput "╔══════════════════════════════════════════╗" $colors.Cyan
    Write-ColorOutput "║        ProcessPilot Dev Setup            ║" $colors.Cyan  
    Write-ColorOutput "║     PowerShell Environment Setup        ║" $colors.Cyan
    Write-ColorOutput "╚══════════════════════════════════════════╝" $colors.Cyan
    Write-Host ""
    
    # Check if we're in the project root
    if (-not (Test-Path "package.json") -and -not (Test-Path "README.md")) {
        Write-Error "Please run this script from the project root directory"
        exit 1
    }
    
    try {
        # Check system requirements
        $reqErrors = Test-Requirements
        
        # Install system dependencies if needed
        if ($reqErrors -gt 0 -or -not $SkipDeps) {
            Install-Dependencies
        }
        
        # Setup database
        Setup-Database
        
        # Generate environment file
        New-EnvironmentFile
        
        # Install project dependencies
        Install-ProjectDependencies
        
        # Setup database schema
        Setup-DatabaseSchema
        
        # Validate setup
        Test-Setup
        
        # Show completion info
        Show-CompletionInfo
        
    } catch {
        Write-Error "Setup failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run main function
Main