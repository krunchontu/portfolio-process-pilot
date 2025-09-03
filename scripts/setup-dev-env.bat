@echo off
setlocal enabledelayedexpansion

REM ProcessPilot Development Environment Setup Script (Windows)
REM Usage: scripts\setup-dev-env.bat [--skip-deps] [--quick]

REM Default options
set SKIP_DEPS=false
set QUICK_MODE=false

REM Parse command line arguments
:parse_args
if "%1"=="--skip-deps" (
    set SKIP_DEPS=true
    shift
    goto parse_args
)
if "%1"=="--quick" (
    set QUICK_MODE=true
    shift
    goto parse_args
)
if "%1"=="/h" goto show_help
if "%1"=="--help" goto show_help
if "%1"=="/?" goto show_help
if not "%1"=="" (
    echo Unknown option: %1
    exit /b 1
)
goto start_setup

:show_help
echo Usage: %0 [--skip-deps] [--quick]
echo   --skip-deps  Skip system dependency installation
echo   --quick      Quick setup [minimal checks]
exit /b 0

:start_setup
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║        ProcessPilot Dev Setup            ║
echo  ║     Windows Environment Setup            ║
echo  ╚══════════════════════════════════════════╝
echo.

REM Check if we're in the project root
if not exist "package.json" (
    if not exist "README.md" (
        echo [ERROR] Please run this script from the project root directory
        exit /b 1
    )
)

echo [INFO] Starting ProcessPilot development environment setup...
echo.

REM Check system requirements
call :check_requirements
if errorlevel 1 exit /b 1

REM Install dependencies if needed
if "%SKIP_DEPS%"=="false" call :install_dependencies

REM Setup database
call :setup_database
if errorlevel 1 (
    echo [WARNING] Database setup had issues. You may need to configure manually.
)

REM Generate environment file
call :generate_env_file

REM Install project dependencies
call :install_project_deps
if errorlevel 1 exit /b 1

REM Setup database schema
call :setup_database_schema
if errorlevel 1 exit /b 1

REM Validate setup
if "%QUICK_MODE%"=="false" call :validate_setup

REM Print completion info
call :print_completion_info

echo.
echo [SUCCESS] ProcessPilot development environment setup completed! 🎉
echo.
pause
exit /b 0

:check_requirements
echo [INFO] Checking system requirements...

set errors=0

REM Check Node.js version
node --version >nul 2>&1
if errorlevel 1 (
    if "%SKIP_DEPS%"=="false" (
        echo [WARNING] Node.js not found. Will attempt to install.
    ) else (
        echo [ERROR] Node.js not found
        set /a errors+=1
    )
) else (
    for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
    echo [SUCCESS] Node.js !node_version! found
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    if "%SKIP_DEPS%"=="false" (
        echo [WARNING] npm not found. Will install with Node.js.
    ) else (
        echo [ERROR] npm not found
        set /a errors+=1
    )
) else (
    for /f "tokens=*" %%i in ('npm --version') do set npm_version=%%i
    echo [SUCCESS] npm !npm_version! found
)

REM Check PostgreSQL
psql --version >nul 2>&1
if errorlevel 1 (
    if "%SKIP_DEPS%"=="false" (
        echo [WARNING] PostgreSQL not found. Will provide installation guidance.
    ) else (
        echo [ERROR] PostgreSQL not found
        set /a errors+=1
    )
) else (
    for /f "tokens=*" %%i in ('psql --version') do set pg_version=%%i
    echo [SUCCESS] !pg_version! found
)

REM Check Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git not found and is required
    set /a errors+=1
) else (
    for /f "tokens=*" %%i in ('git --version') do set git_version=%%i
    echo [SUCCESS] !git_version! found
)

if %errors% gtr 0 (
    if "%SKIP_DEPS%"=="true" (
        echo [ERROR] Missing %errors% required dependencies. Install them or remove --skip-deps flag.
        exit /b 1
    )
)

exit /b 0

:install_dependencies
echo [INFO] Installing Windows dependencies...
echo.
echo [INFO] For Windows, please install the following manually:
echo.
echo   1. Node.js 18+ LTS: https://nodejs.org/
echo   2. PostgreSQL 13+:  https://www.postgresql.org/download/windows/
echo   3. Git for Windows: https://git-scm.com/download/win
echo.
echo   Alternative using Chocolatey:
echo     choco install nodejs postgresql git
echo.

REM Check if Chocolatey is available
where choco >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Chocolatey detected. You can install dependencies with:
    echo   choco install nodejs postgresql git
    echo.
    set /p install_choco="Install dependencies using Chocolatey? (y/N): "
    if /i "!install_choco!"=="y" (
        echo [INFO] Installing Node.js...
        choco install nodejs -y
        echo [INFO] Installing PostgreSQL...
        choco install postgresql -y
        echo [INFO] Refreshing environment...
        refreshenv
    )
) else (
    echo [INFO] Consider installing Chocolatey for easier package management:
    echo   https://chocolatey.org/install
)

echo.
echo [INFO] Press any key after installing required dependencies...
pause >nul

REM Re-check requirements
call :check_requirements
if errorlevel 1 exit /b 1

exit /b 0

:setup_database
echo [INFO] Setting up PostgreSQL databases...

REM Check if PostgreSQL is running (Windows service)
sc query postgresql >nul 2>&1
if errorlevel 1 (
    sc query postgresql-x64-13 >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] PostgreSQL service not found. Please ensure PostgreSQL is installed and running.
        echo   You can start it from Services or using:
        echo   net start postgresql
        exit /b 1
    )
)

REM Try to create databases
echo [INFO] Creating development database...
psql -U postgres -c "CREATE DATABASE process_pilot;" 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Created database 'process_pilot'
) else (
    echo [INFO] Database 'process_pilot' may already exist
)

echo [INFO] Creating test database...
psql -U postgres -c "CREATE DATABASE process_pilot_test;" 2>nul
if not errorlevel 1 (
    echo [SUCCESS] Created database 'process_pilot_test'
) else (
    echo [INFO] Database 'process_pilot_test' may already exist
)

exit /b 0

:generate_env_file
echo [INFO] Setting up environment configuration...

if exist "backend\.env" (
    echo [WARNING] backend\.env already exists. Creating backup...
    copy "backend\.env" "backend\.env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%" >nul
)

REM Generate random secrets using PowerShell
for /f "delims=" %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 4)"') do set jwt_secret=%%i
for /f "delims=" %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 4)"') do set refresh_secret=%%i
for /f "delims=" %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(32, 4)"') do set session_secret=%%i

REM Create .env file
(
echo # ProcessPilot Development Environment
echo # Generated by Windows setup script on %date% %time%
echo.
echo # Server Configuration
echo NODE_ENV=development
echo PORT=5000
echo HOST=localhost
echo.
echo # Database Configuration
echo DB_PROVIDER=postgresql
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=process_pilot
echo DB_USER=postgres
echo DB_PASSWORD=
echo DB_SSL=false
echo DB_POOL_MIN=2
echo DB_POOL_MAX=10
echo.
echo # JWT Configuration
echo JWT_SECRET=!jwt_secret!
echo JWT_EXPIRES_IN=15m
echo JWT_REFRESH_SECRET=!refresh_secret!
echo JWT_REFRESH_EXPIRES_IN=7d
echo.
echo # Session Secret for CSRF Protection
echo SESSION_SECRET=!session_secret!
echo.
echo # CORS Configuration
echo CORS_ORIGIN=http://localhost:3000
echo CORS_CREDENTIALS=true
echo.
echo # Email Configuration [Optional]
echo # SMTP_HOST=smtp.gmail.com
echo # SMTP_PORT=587
echo # SMTP_USER=your-email@gmail.com
echo # SMTP_PASS=your-app-password
echo # FROM_EMAIL=noreply@processpilot.com
echo.
echo # Logging
echo LOG_LEVEL=info
echo LOG_FORMAT=combined
echo.
echo # Rate Limiting
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
) > backend\.env

echo [SUCCESS] Created backend\.env with secure secrets
exit /b 0

:install_project_deps
echo [INFO] Installing project dependencies...

REM Backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] Backend dependency installation failed
    cd ..
    exit /b 1
)
cd ..
echo [SUCCESS] Backend dependencies installed

REM Frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend dependency installation failed
    cd ..
    exit /b 1
)
cd ..
echo [SUCCESS] Frontend dependencies installed

exit /b 0

:setup_database_schema
echo [INFO] Setting up database schema...

cd backend

REM Run migrations
echo [INFO] Running database migrations...
call npm run db:migrate
if errorlevel 1 (
    echo [ERROR] Database migrations failed
    cd ..
    exit /b 1
)
echo [SUCCESS] Database migrations completed

REM Run seeds
echo [INFO] Running database seeds...
call npm run db:seed
if errorlevel 1 (
    echo [WARNING] Database seeds failed [may be normal if data exists]
) else (
    echo [SUCCESS] Database seeds completed
)

cd ..
exit /b 0

:validate_setup
echo [INFO] Validating setup...

REM Test backend
echo [INFO] Testing backend setup...
cd backend

REM Test linting
call npm run lint >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Backend linting passed
) else (
    echo [WARNING] Backend linting issues found
)

cd ..

REM Test frontend
echo [INFO] Testing frontend setup...
cd frontend

call npm run lint >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Frontend linting passed
) else (
    echo [WARNING] Frontend linting issues found
)

REM Test build
call npm run build >nul 2>&1
if not errorlevel 1 (
    echo [SUCCESS] Frontend build successful
    if exist dist rmdir /s /q dist
) else (
    echo [WARNING] Frontend build test failed
)

cd ..
exit /b 0

:print_completion_info
echo.
echo ═══════════════════════════════════════════
echo   ProcessPilot Setup Complete! 🎉
echo ═══════════════════════════════════════════
echo.
echo 📋 Next Steps:
echo   1. Start backend:     cd backend ^&^& npm run dev
echo   2. Start frontend:    cd frontend ^&^& npm run dev
echo   3. Open application:  http://localhost:3000
echo   4. API documentation: http://localhost:5000/docs
echo.
echo 🔐 Default Login Credentials:
echo   Admin:    admin@processpilot.com / Admin123!
echo   Manager:  manager@processpilot.com / Manager123!
echo   Employee: employee@processpilot.com / Employee123!
echo.
echo 📚 Documentation:
echo   Setup Guide: docs\DEVELOPMENT_SETUP.md
echo   Project README: README.md
echo.
echo 💡 Tip: Run tests with 'npm test' in backend and frontend directories
echo.
exit /b 0