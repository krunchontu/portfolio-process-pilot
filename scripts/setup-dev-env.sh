#!/bin/bash

# ProcessPilot Development Environment Setup Script
# Compatible with: macOS, Linux (Ubuntu/Debian/RHEL/CentOS)
# Usage: ./scripts/setup-dev-env.sh [--skip-deps] [--quick]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SKIP_DEPS=false
QUICK_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--skip-deps] [--quick]"
            echo "  --skip-deps  Skip system dependency installation"
            echo "  --quick      Quick setup (minimal checks)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    local errors=0
    
    # Check Node.js version
    if command_exists node; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        
        if [ "$major_version" -ge 18 ]; then
            log_success "Node.js $node_version (✓ >= 18.0.0)"
        else
            log_error "Node.js $node_version is too old. Requires >= 18.0.0"
            errors=$((errors + 1))
        fi
    else
        if [ "$SKIP_DEPS" = false ]; then
            log_warning "Node.js not found. Will install."
        else
            log_error "Node.js not found"
            errors=$((errors + 1))
        fi
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        log_success "npm $npm_version"
    else
        if [ "$SKIP_DEPS" = false ]; then
            log_warning "npm not found. Will install with Node.js."
        else
            log_error "npm not found"
            errors=$((errors + 1))
        fi
    fi
    
    # Check PostgreSQL
    if command_exists psql; then
        local pg_version=$(psql --version | head -n1)
        log_success "$pg_version"
    else
        if [ "$SKIP_DEPS" = false ]; then
            log_warning "PostgreSQL not found. Will install."
        else
            log_error "PostgreSQL not found"
            errors=$((errors + 1))
        fi
    fi
    
    # Check Git
    if command_exists git; then
        local git_version=$(git --version)
        log_success "$git_version"
    else
        log_error "Git not found and is required"
        errors=$((errors + 1))
    fi
    
    if [ $errors -gt 0 ] && [ "$SKIP_DEPS" = true ]; then
        log_error "Missing $errors required dependencies. Install them or remove --skip-deps flag."
        exit 1
    fi
    
    return $errors
}

# Install system dependencies
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log_info "Skipping system dependency installation"
        return
    fi
    
    local os=$(detect_os)
    log_info "Detected OS: $os"
    
    case $os in
        "macos")
            install_macos_deps
            ;;
        "debian")
            install_debian_deps
            ;;
        "redhat")
            install_redhat_deps
            ;;
        *)
            log_warning "Unknown OS. Please install Node.js 18+, PostgreSQL 13+, and Git manually."
            ;;
    esac
}

install_macos_deps() {
    log_info "Installing dependencies for macOS..."
    
    # Check if Homebrew is installed
    if ! command_exists brew; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add to PATH
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
            export PATH="/opt/homebrew/bin:$PATH"
        fi
    fi
    
    # Install Node.js
    if ! command_exists node; then
        log_info "Installing Node.js..."
        brew install node@18
    fi
    
    # Install PostgreSQL
    if ! command_exists psql; then
        log_info "Installing PostgreSQL..."
        brew install postgresql@13
        brew services start postgresql
        
        # Create postgres user if it doesn't exist
        if ! psql -t -c '\du' | cut -d \| -f 1 | grep -qw postgres; then
            createuser -s postgres || true
        fi
    fi
}

install_debian_deps() {
    log_info "Installing dependencies for Debian/Ubuntu..."
    
    sudo apt update
    
    # Install Node.js
    if ! command_exists node; then
        log_info "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PostgreSQL
    if ! command_exists psql; then
        log_info "Installing PostgreSQL..."
        sudo apt install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi
    
    # Install Git (usually pre-installed)
    if ! command_exists git; then
        log_info "Installing Git..."
        sudo apt install -y git
    fi
}

install_redhat_deps() {
    log_info "Installing dependencies for RHEL/CentOS/Fedora..."
    
    # Install Node.js
    if ! command_exists node; then
        log_info "Installing Node.js 18..."
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo dnf install -y nodejs npm
    fi
    
    # Install PostgreSQL
    if ! command_exists psql; then
        log_info "Installing PostgreSQL..."
        sudo dnf install -y postgresql postgresql-server
        sudo postgresql-setup --initdb
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
    fi
    
    # Install Git
    if ! command_exists git; then
        log_info "Installing Git..."
        sudo dnf install -y git
    fi
}

# Setup PostgreSQL databases
setup_database() {
    log_info "Setting up PostgreSQL databases..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        log_error "PostgreSQL is not running. Please start it and try again."
        return 1
    fi
    
    # Try to connect and create databases
    local db_user="postgres"
    local db_exists=false
    local test_db_exists=false
    
    # Check if databases exist
    if psql -U "$db_user" -lqt | cut -d \| -f 1 | grep -qw process_pilot; then
        db_exists=true
        log_success "Database 'process_pilot' already exists"
    fi
    
    if psql -U "$db_user" -lqt | cut -d \| -f 1 | grep -qw process_pilot_test; then
        test_db_exists=true
        log_success "Database 'process_pilot_test' already exists"
    fi
    
    # Create databases if they don't exist
    if [ "$db_exists" = false ]; then
        log_info "Creating development database..."
        if psql -U "$db_user" -c "CREATE DATABASE process_pilot;" >/dev/null 2>&1; then
            log_success "Created database 'process_pilot'"
        else
            log_warning "Could not create database 'process_pilot'. You may need to create it manually."
        fi
    fi
    
    if [ "$test_db_exists" = false ]; then
        log_info "Creating test database..."
        if psql -U "$db_user" -c "CREATE DATABASE process_pilot_test;" >/dev/null 2>&1; then
            log_success "Created database 'process_pilot_test'"
        else
            log_warning "Could not create database 'process_pilot_test'. You may need to create it manually."
        fi
    fi
}

# Generate environment file
generate_env_file() {
    log_info "Setting up environment configuration..."
    
    if [ -f "backend/.env" ]; then
        log_warning "backend/.env already exists. Creating backup..."
        cp backend/.env backend/.env.backup.$(date +%s)
    fi
    
    # Generate secure secrets
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    local refresh_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    local session_secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    
    # Create .env file
    cat > backend/.env << EOF
# ProcessPilot Development Environment
# Generated by setup script on $(date)

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
JWT_SECRET=$jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret for CSRF Protection
SESSION_SECRET=$session_secret

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
EOF
    
    log_success "Created backend/.env with secure secrets"
}

# Install project dependencies
install_project_deps() {
    log_info "Installing project dependencies..."
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    log_success "Backend dependencies installed"
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    log_success "Frontend dependencies installed"
}

# Setup database schema
setup_database_schema() {
    log_info "Setting up database schema..."
    
    cd backend
    
    # Run migrations
    log_info "Running database migrations..."
    if npm run db:migrate; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        return 1
    fi
    
    # Run seeds
    log_info "Running database seeds..."
    if npm run db:seed; then
        log_success "Database seeds completed"
    else
        log_warning "Database seeds failed (this may be normal if data already exists)"
    fi
    
    cd ..
}

# Run validation tests
validate_setup() {
    if [ "$QUICK_MODE" = true ]; then
        log_info "Skipping validation in quick mode"
        return
    fi
    
    log_info "Validating setup..."
    
    # Test backend
    log_info "Testing backend setup..."
    cd backend
    
    # Test linting
    if npm run lint >/dev/null 2>&1; then
        log_success "Backend linting passed"
    else
        log_warning "Backend linting issues found"
    fi
    
    # Test database connection
    if node -e "require('./src/config/database.js')().raw('SELECT 1').then(() => console.log('DB OK')).catch(() => process.exit(1))" 2>/dev/null; then
        log_success "Database connection working"
    else
        log_warning "Database connection test failed"
    fi
    
    cd ..
    
    # Test frontend
    log_info "Testing frontend setup..."
    cd frontend
    
    if npm run lint >/dev/null 2>&1; then
        log_success "Frontend linting passed"
    else
        log_warning "Frontend linting issues found"
    fi
    
    # Test build
    if npm run build >/dev/null 2>&1; then
        log_success "Frontend build successful"
        rm -rf dist  # Clean up build artifacts
    else
        log_warning "Frontend build test failed"
    fi
    
    cd ..
}

# Print setup completion info
print_completion_info() {
    log_success "ProcessPilot development environment setup completed! 🎉"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "  1. Start the backend server:    ${GREEN}cd backend && npm run dev${NC}"
    echo -e "  2. Start the frontend server:   ${GREEN}cd frontend && npm run dev${NC}"
    echo -e "  3. Access the application:       ${GREEN}http://localhost:3000${NC}"
    echo -e "  4. View API documentation:       ${GREEN}http://localhost:5000/docs${NC}"
    echo ""
    echo -e "${BLUE}🔐 Default Login Credentials:${NC}"
    echo -e "  Admin:    ${GREEN}admin@processpilot.com / Admin123!${NC}"
    echo -e "  Manager:  ${GREEN}manager@processpilot.com / Manager123!${NC}"
    echo -e "  Employee: ${GREEN}employee@processpilot.com / Employee123!${NC}"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo -e "  Setup Guide: ${GREEN}docs/DEVELOPMENT_SETUP.md${NC}"
    echo -e "  Project README: ${GREEN}README.md${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Run tests with '${GREEN}cd backend && npm test${NC}${YELLOW}' and '${GREEN}cd frontend && npm test${NC}${YELLOW}'${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║        ProcessPilot Dev Setup            ║"
    echo "║     Automated Environment Setup          ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Check if we're in the project root
    if [ ! -f "package.json" ] && [ ! -f "README.md" ]; then
        log_error "Please run this script from the project root directory"
        exit 1
    fi
    
    # Check system requirements
    check_requirements
    local req_errors=$?
    
    # Install system dependencies if needed
    if [ $req_errors -gt 0 ] || [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi
    
    # Setup database
    setup_database
    
    # Generate environment file
    generate_env_file
    
    # Install project dependencies
    install_project_deps
    
    # Setup database schema
    setup_database_schema
    
    # Validate setup
    validate_setup
    
    # Print completion information
    print_completion_info
}

# Run main function
main "$@"