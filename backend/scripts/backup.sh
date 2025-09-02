#!/bin/bash

# ProcessPilot Database Backup Script
# Supports: PostgreSQL, Supabase, PlanetScale, Neon, Railway

set -e  # Exit on any error

# Default configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/processpilot}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/backup.log}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Load environment variables from .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
fi

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Create backup directory
create_backup_dir() {
    local provider=$1
    local backup_path="$BACKUP_DIR/$provider"
    mkdir -p "$backup_path/daily" "$backup_path/incremental" "$backup_path/schema"
    echo "$backup_path"
}

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    local provider=$1
    local backup_path="$BACKUP_DIR/$provider"
    
    log "INFO" "Cleaning up backups older than $RETENTION_DAYS days for $provider"
    
    # Remove old daily backups
    if [ -d "$backup_path/daily" ]; then
        find "$backup_path/daily" -name "*.dump" -o -name "*.sql" -type f -mtime +$RETENTION_DAYS -delete
    fi
    
    # Remove old incremental backups (keep for 7 days max)
    if [ -d "$backup_path/incremental" ]; then
        find "$backup_path/incremental" -name "*.dump" -o -name "*.sql" -type f -mtime +7 -delete
    fi
    
    # Remove old schema backups (keep for 90 days)
    if [ -d "$backup_path/schema" ]; then
        find "$backup_path/schema" -name "*.sql" -type f -mtime +90 -delete
    fi
}

# Verify backup file integrity
verify_backup() {
    local backup_file=$1
    local provider=$2
    
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [ "$file_size" -lt 1024 ]; then
        error_exit "Backup file is too small (< 1KB): $backup_file"
    fi
    
    # Generate checksum
    local checksum_file="${backup_file}.sha256"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$backup_file" > "$checksum_file"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$backup_file" > "$checksum_file"
    fi
    
    log "INFO" "Backup verified successfully: $backup_file (${file_size} bytes)"
}

# PostgreSQL backup
backup_postgresql() {
    local backup_type=${1:-full}
    local backup_path=$(create_backup_dir "postgresql")
    
    if [ -z "$DATABASE_URL" ]; then
        error_exit "DATABASE_URL not set for PostgreSQL backup"
    fi
    
    log "INFO" "Starting PostgreSQL $backup_type backup"
    
    case $backup_type in
        "full")
            local backup_file="$backup_path/daily/${TIMESTAMP}.dump"
            pg_dump "$DATABASE_URL" --no-password --verbose --format=custom \
                --compress=9 --file="$backup_file" || error_exit "PostgreSQL backup failed"
            ;;
        "schema")
            local backup_file="$backup_path/schema/${TIMESTAMP}_schema.sql"
            pg_dump "$DATABASE_URL" --no-password --schema-only \
                --file="$backup_file" || error_exit "PostgreSQL schema backup failed"
            ;;
        "incremental")
            local backup_file="$backup_path/incremental/${TIMESTAMP}_incremental.dump"
            # For incremental, use WAL archiving or logical replication in production
            pg_dump "$DATABASE_URL" --no-password --verbose --format=custom \
                --compress=9 --file="$backup_file" || error_exit "PostgreSQL incremental backup failed"
            ;;
    esac
    
    verify_backup "$backup_file" "postgresql"
    log "INFO" "PostgreSQL $backup_type backup completed: $backup_file"
}

# Supabase backup
backup_supabase() {
    local backup_type=${1:-full}
    local backup_path=$(create_backup_dir "supabase")
    
    if [ -z "$SUPABASE_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "SUPABASE_DATABASE_URL or DATABASE_URL not set for Supabase backup"
    fi
    
    local db_url="${SUPABASE_DATABASE_URL:-$DATABASE_URL}"
    log "INFO" "Starting Supabase $backup_type backup"
    
    case $backup_type in
        "full")
            local backup_file="$backup_path/daily/${TIMESTAMP}.dump"
            pg_dump "$db_url" --no-password --verbose --format=custom \
                --compress=9 --file="$backup_file" || error_exit "Supabase backup failed"
            ;;
        "schema")
            local backup_file="$backup_path/schema/${TIMESTAMP}_schema.sql"
            pg_dump "$db_url" --no-password --schema-only \
                --file="$backup_file" || error_exit "Supabase schema backup failed"
            ;;
    esac
    
    verify_backup "$backup_file" "supabase"
    log "INFO" "Supabase $backup_type backup completed: $backup_file"
}

# PlanetScale backup
backup_planetscale() {
    local backup_type=${1:-full}
    local backup_path=$(create_backup_dir "planetscale")
    
    if [ -z "$PLANETSCALE_HOST" ] || [ -z "$PLANETSCALE_USERNAME" ] || [ -z "$PLANETSCALE_PASSWORD" ]; then
        error_exit "PlanetScale credentials not set (PLANETSCALE_HOST, PLANETSCALE_USERNAME, PLANETSCALE_PASSWORD)"
    fi
    
    log "INFO" "Starting PlanetScale $backup_type backup"
    
    case $backup_type in
        "full")
            local backup_file="$backup_path/daily/${TIMESTAMP}.sql"
            mysqldump -h "$PLANETSCALE_HOST" -u "$PLANETSCALE_USERNAME" \
                -p"$PLANETSCALE_PASSWORD" --single-transaction --routines \
                --triggers --all-databases > "$backup_file" || error_exit "PlanetScale backup failed"
            ;;
        "schema")
            local backup_file="$backup_path/schema/${TIMESTAMP}_schema.sql"
            mysqldump -h "$PLANETSCALE_HOST" -u "$PLANETSCALE_USERNAME" \
                -p"$PLANETSCALE_PASSWORD" --no-data --routines \
                --triggers --all-databases > "$backup_file" || error_exit "PlanetScale schema backup failed"
            ;;
    esac
    
    verify_backup "$backup_file" "planetscale"
    log "INFO" "PlanetScale $backup_type backup completed: $backup_file"
}

# Neon backup
backup_neon() {
    local backup_type=${1:-full}
    local backup_path=$(create_backup_dir "neon")
    
    if [ -z "$NEON_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "NEON_DATABASE_URL or DATABASE_URL not set for Neon backup"
    fi
    
    local db_url="${NEON_DATABASE_URL:-$DATABASE_URL}"
    log "INFO" "Starting Neon $backup_type backup"
    
    case $backup_type in
        "full")
            local backup_file="$backup_path/daily/${TIMESTAMP}.dump"
            pg_dump "$db_url" --no-password --verbose --format=custom \
                --compress=9 --file="$backup_file" || error_exit "Neon backup failed"
            ;;
        "schema")
            local backup_file="$backup_path/schema/${TIMESTAMP}_schema.sql"
            pg_dump "$db_url" --no-password --schema-only \
                --file="$backup_file" || error_exit "Neon schema backup failed"
            ;;
    esac
    
    verify_backup "$backup_file" "neon"
    log "INFO" "Neon $backup_type backup completed: $backup_file"
}

# Railway backup
backup_railway() {
    local backup_type=${1:-full}
    local backup_path=$(create_backup_dir "railway")
    
    if [ -z "$RAILWAY_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "RAILWAY_DATABASE_URL or DATABASE_URL not set for Railway backup"
    fi
    
    local db_url="${RAILWAY_DATABASE_URL:-$DATABASE_URL}"
    log "INFO" "Starting Railway $backup_type backup"
    
    case $backup_type in
        "full")
            local backup_file="$backup_path/daily/${TIMESTAMP}.dump"
            pg_dump "$db_url" --no-password --verbose --format=custom \
                --compress=9 --file="$backup_file" || error_exit "Railway backup failed"
            ;;
        "schema")
            local backup_file="$backup_path/schema/${TIMESTAMP}_schema.sql"
            pg_dump "$db_url" --no-password --schema-only \
                --file="$backup_file" || error_exit "Railway schema backup failed"
            ;;
    esac
    
    verify_backup "$backup_file" "railway"
    log "INFO" "Railway $backup_type backup completed: $backup_file"
}

# Auto-detect provider from environment
auto_detect_provider() {
    if [ -n "$DB_PROVIDER" ]; then
        echo "$DB_PROVIDER"
    elif [ -n "$SUPABASE_DATABASE_URL" ]; then
        echo "supabase"
    elif [ -n "$PLANETSCALE_HOST" ]; then
        echo "planetscale"
    elif [ -n "$NEON_DATABASE_URL" ]; then
        echo "neon"
    elif [ -n "$RAILWAY_DATABASE_URL" ]; then
        echo "railway"
    elif [ -n "$DATABASE_URL" ]; then
        echo "postgresql"
    else
        error_exit "Cannot detect database provider. Set DB_PROVIDER environment variable."
    fi
}

# Main backup function
perform_backup() {
    local provider=$1
    local backup_type=${2:-full}
    
    log "INFO" "Starting backup for provider: $provider (type: $backup_type)"
    
    case $provider in
        "postgresql")
            backup_postgresql "$backup_type"
            ;;
        "supabase")
            backup_supabase "$backup_type"
            ;;
        "planetscale")
            backup_planetscale "$backup_type"
            ;;
        "neon")
            backup_neon "$backup_type"
            ;;
        "railway")
            backup_railway "$backup_type"
            ;;
        *)
            error_exit "Unsupported provider: $provider"
            ;;
    esac
    
    cleanup_old_backups "$provider"
    log "INFO" "Backup process completed for $provider"
}

# Help function
show_help() {
    cat << EOF
ProcessPilot Database Backup Script

Usage: $0 [PROVIDER] [OPTIONS]

PROVIDERS:
    postgresql      Backup PostgreSQL database
    supabase        Backup Supabase database  
    planetscale     Backup PlanetScale database
    neon            Backup Neon database
    railway         Backup Railway database
    auto            Auto-detect provider from environment

OPTIONS:
    --type TYPE     Backup type: full (default), schema, incremental
    --cleanup       Only perform cleanup of old backups
    --help          Show this help message

ENVIRONMENT VARIABLES:
    DB_PROVIDER              Database provider (auto-detection)
    DATABASE_URL             Primary database connection string
    SUPABASE_DATABASE_URL    Supabase specific connection string
    PLANETSCALE_HOST         PlanetScale hostname
    PLANETSCALE_USERNAME     PlanetScale username  
    PLANETSCALE_PASSWORD     PlanetScale password
    NEON_DATABASE_URL        Neon specific connection string
    RAILWAY_DATABASE_URL     Railway specific connection string
    BACKUP_DIR               Backup storage directory (default: /var/backups/processpilot)
    BACKUP_RETENTION_DAYS    Retention period in days (default: 30)

EXAMPLES:
    $0 postgresql                    # Full PostgreSQL backup
    $0 postgresql --type schema      # Schema-only backup
    $0 supabase --type full          # Full Supabase backup
    $0 auto                          # Auto-detect provider and backup
    $0 postgresql --cleanup          # Cleanup old PostgreSQL backups

EOF
}

# Main script execution
main() {
    # Parse command line arguments
    PROVIDER=""
    BACKUP_TYPE="full"
    CLEANUP_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            --cleanup)
                CLEANUP_ONLY=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            --*)
                error_exit "Unknown option: $1"
                ;;
            *)
                if [ -z "$PROVIDER" ]; then
                    PROVIDER="$1"
                else
                    error_exit "Multiple providers specified"
                fi
                shift
                ;;
        esac
    done
    
    # Auto-detect provider if not specified
    if [ -z "$PROVIDER" ] || [ "$PROVIDER" = "auto" ]; then
        PROVIDER=$(auto_detect_provider)
        log "INFO" "Auto-detected provider: $PROVIDER"
    fi
    
    # Validate backup type
    case $BACKUP_TYPE in
        "full"|"schema"|"incremental")
            ;;
        *)
            error_exit "Invalid backup type: $BACKUP_TYPE. Use: full, schema, or incremental"
            ;;
    esac
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Initialize log file
    log "INFO" "ProcessPilot backup script started (Provider: $PROVIDER, Type: $BACKUP_TYPE)"
    
    if [ "$CLEANUP_ONLY" = true ]; then
        log "INFO" "Performing cleanup only"
        cleanup_old_backups "$PROVIDER"
    else
        perform_backup "$PROVIDER" "$BACKUP_TYPE"
    fi
    
    log "INFO" "Backup script execution completed"
}

# Execute main function with all arguments
main "$@"