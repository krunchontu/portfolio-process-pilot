#!/bin/bash

# ProcessPilot Database Restore Script
# Supports: PostgreSQL, Supabase, PlanetScale, Neon, Railway

set -e  # Exit on any error

# Default configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/processpilot}"
LOG_FILE="${LOG_FILE:-$BACKUP_DIR/restore.log}"

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

# Verify backup file integrity before restore
verify_backup_integrity() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi
    
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [ "$file_size" -lt 1024 ]; then
        error_exit "Backup file is too small (< 1KB): $backup_file"
    fi
    
    # Verify checksum if exists
    local checksum_file="${backup_file}.sha256"
    if [ -f "$checksum_file" ]; then
        log "INFO" "Verifying backup file integrity..."
        if command -v sha256sum >/dev/null 2>&1; then
            sha256sum -c "$checksum_file" || error_exit "Backup file integrity check failed"
        elif command -v shasum >/dev/null 2>&1; then
            shasum -a 256 -c "$checksum_file" || error_exit "Backup file integrity check failed"
        fi
        log "INFO" "Backup file integrity verified"
    else
        log "WARN" "No checksum file found for verification: $checksum_file"
    fi
}

# Confirmation prompt for destructive operations
confirm_restore() {
    local target_db=$1
    local backup_file=$2
    
    echo "WARNING: This will restore data to database and may overwrite existing data."
    echo "Target: $target_db"
    echo "Source: $backup_file"
    echo ""
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "INFO" "Restore operation cancelled by user"
        exit 0
    fi
}

# PostgreSQL restore
restore_postgresql() {
    local backup_file=$1
    local restore_type=${2:-full}
    
    if [ -z "$DATABASE_URL" ]; then
        error_exit "DATABASE_URL not set for PostgreSQL restore"
    fi
    
    verify_backup_integrity "$backup_file"
    confirm_restore "PostgreSQL" "$backup_file"
    
    log "INFO" "Starting PostgreSQL restore from: $backup_file"
    
    case $restore_type in
        "full")
            if [[ "$backup_file" == *.dump ]]; then
                # Custom format restore
                pg_restore --no-password --verbose --clean --if-exists \
                    --dbname="$DATABASE_URL" "$backup_file" || error_exit "PostgreSQL restore failed"
            else
                # SQL format restore
                psql "$DATABASE_URL" --file="$backup_file" || error_exit "PostgreSQL restore failed"
            fi
            ;;
        "schema")
            psql "$DATABASE_URL" --file="$backup_file" || error_exit "PostgreSQL schema restore failed"
            ;;
        "data-only")
            pg_restore --no-password --verbose --data-only \
                --dbname="$DATABASE_URL" "$backup_file" || error_exit "PostgreSQL data restore failed"
            ;;
    esac
    
    log "INFO" "PostgreSQL restore completed successfully"
}

# Supabase restore
restore_supabase() {
    local backup_file=$1
    local restore_type=${2:-full}
    
    if [ -z "$SUPABASE_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "SUPABASE_DATABASE_URL or DATABASE_URL not set for Supabase restore"
    fi
    
    local db_url="${SUPABASE_DATABASE_URL:-$DATABASE_URL}"
    
    verify_backup_integrity "$backup_file"
    confirm_restore "Supabase" "$backup_file"
    
    log "INFO" "Starting Supabase restore from: $backup_file"
    
    case $restore_type in
        "full")
            if [[ "$backup_file" == *.dump ]]; then
                pg_restore --no-password --verbose --clean --if-exists \
                    --dbname="$db_url" "$backup_file" || error_exit "Supabase restore failed"
            else
                psql "$db_url" --file="$backup_file" || error_exit "Supabase restore failed"
            fi
            ;;
        "schema")
            psql "$db_url" --file="$backup_file" || error_exit "Supabase schema restore failed"
            ;;
    esac
    
    log "INFO" "Supabase restore completed successfully"
}

# PlanetScale restore
restore_planetscale() {
    local backup_file=$1
    local restore_type=${2:-full}
    
    if [ -z "$PLANETSCALE_HOST" ] || [ -z "$PLANETSCALE_USERNAME" ] || [ -z "$PLANETSCALE_PASSWORD" ]; then
        error_exit "PlanetScale credentials not set (PLANETSCALE_HOST, PLANETSCALE_USERNAME, PLANETSCALE_PASSWORD)"
    fi
    
    verify_backup_integrity "$backup_file"
    confirm_restore "PlanetScale" "$backup_file"
    
    log "INFO" "Starting PlanetScale restore from: $backup_file"
    
    case $restore_type in
        "full")
            mysql -h "$PLANETSCALE_HOST" -u "$PLANETSCALE_USERNAME" \
                -p"$PLANETSCALE_PASSWORD" < "$backup_file" || error_exit "PlanetScale restore failed"
            ;;
        "schema")
            mysql -h "$PLANETSCALE_HOST" -u "$PLANETSCALE_USERNAME" \
                -p"$PLANETSCALE_PASSWORD" < "$backup_file" || error_exit "PlanetScale schema restore failed"
            ;;
    esac
    
    log "INFO" "PlanetScale restore completed successfully"
}

# Neon restore
restore_neon() {
    local backup_file=$1
    local restore_type=${2:-full}
    
    if [ -z "$NEON_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "NEON_DATABASE_URL or DATABASE_URL not set for Neon restore"
    fi
    
    local db_url="${NEON_DATABASE_URL:-$DATABASE_URL}"
    
    verify_backup_integrity "$backup_file"
    confirm_restore "Neon" "$backup_file"
    
    log "INFO" "Starting Neon restore from: $backup_file"
    
    case $restore_type in
        "full")
            if [[ "$backup_file" == *.dump ]]; then
                pg_restore --no-password --verbose --clean --if-exists \
                    --dbname="$db_url" "$backup_file" || error_exit "Neon restore failed"
            else
                psql "$db_url" --file="$backup_file" || error_exit "Neon restore failed"
            fi
            ;;
        "schema")
            psql "$db_url" --file="$backup_file" || error_exit "Neon schema restore failed"
            ;;
    esac
    
    log "INFO" "Neon restore completed successfully"
}

# Railway restore
restore_railway() {
    local backup_file=$1
    local restore_type=${2:-full}
    
    if [ -z "$RAILWAY_DATABASE_URL" ] && [ -z "$DATABASE_URL" ]; then
        error_exit "RAILWAY_DATABASE_URL or DATABASE_URL not set for Railway restore"
    fi
    
    local db_url="${RAILWAY_DATABASE_URL:-$DATABASE_URL}"
    
    verify_backup_integrity "$backup_file"
    confirm_restore "Railway" "$backup_file"
    
    log "INFO" "Starting Railway restore from: $backup_file"
    
    case $restore_type in
        "full")
            if [[ "$backup_file" == *.dump ]]; then
                pg_restore --no-password --verbose --clean --if-exists \
                    --dbname="$db_url" "$backup_file" || error_exit "Railway restore failed"
            else
                psql "$db_url" --file="$backup_file" || error_exit "Railway restore failed"
            fi
            ;;
        "schema")
            psql "$db_url" --file="$backup_file" || error_exit "Railway schema restore failed"
            ;;
    esac
    
    log "INFO" "Railway restore completed successfully"
}

# List available backups
list_backups() {
    local provider=$1
    local backup_type=${2:-daily}
    local backup_path="$BACKUP_DIR/$provider/$backup_type"
    
    if [ ! -d "$backup_path" ]; then
        echo "No backups found for $provider ($backup_type)"
        return 1
    fi
    
    echo "Available $backup_type backups for $provider:"
    ls -la "$backup_path"/ | grep -E '\.(dump|sql)$' | awk '{print $9, $5, $6, $7, $8}' | sort -r
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

# Point-in-time recovery (for providers that support it)
point_in_time_recovery() {
    local provider=$1
    local target_time=$2
    
    log "INFO" "Attempting point-in-time recovery for $provider to $target_time"
    
    case $provider in
        "postgresql")
            error_exit "Point-in-time recovery requires PostgreSQL WAL archiving setup"
            ;;
        "supabase")
            log "INFO" "Supabase supports point-in-time recovery through the dashboard"
            log "INFO" "Please use the Supabase dashboard to perform PITR to: $target_time"
            ;;
        "planetscale")
            log "INFO" "PlanetScale supports rewind to specific timestamps"
            log "INFO" "Use: pscale branch restore <database> <branch> --restore-id <id>"
            ;;
        "neon")
            log "INFO" "Neon supports branch reset to specific timestamp"
            log "INFO" "Use Neon console or CLI to reset branch to: $target_time"
            ;;
        "railway")
            log "INFO" "Railway supports database snapshots"
            log "INFO" "Use Railway dashboard to restore from snapshot at: $target_time"
            ;;
        *)
            error_exit "Point-in-time recovery not supported for provider: $provider"
            ;;
    esac
}

# Main restore function
perform_restore() {
    local provider=$1
    local backup_file=$2
    local restore_type=${3:-full}
    
    log "INFO" "Starting restore for provider: $provider (type: $restore_type)"
    log "INFO" "Backup file: $backup_file"
    
    case $provider in
        "postgresql")
            restore_postgresql "$backup_file" "$restore_type"
            ;;
        "supabase")
            restore_supabase "$backup_file" "$restore_type"
            ;;
        "planetscale")
            restore_planetscale "$backup_file" "$restore_type"
            ;;
        "neon")
            restore_neon "$backup_file" "$restore_type"
            ;;
        "railway")
            restore_railway "$backup_file" "$restore_type"
            ;;
        *)
            error_exit "Unsupported provider: $provider"
            ;;
    esac
    
    log "INFO" "Restore process completed for $provider"
}

# Help function
show_help() {
    cat << EOF
ProcessPilot Database Restore Script

Usage: $0 [PROVIDER] [BACKUP_FILE] [OPTIONS]

PROVIDERS:
    postgresql      Restore PostgreSQL database
    supabase        Restore Supabase database
    planetscale     Restore PlanetScale database
    neon            Restore Neon database
    railway         Restore Railway database
    auto            Auto-detect provider from environment

OPTIONS:
    --type TYPE     Restore type: full (default), schema, data-only
    --list          List available backups for provider
    --pitr TIME     Point-in-time recovery to specific timestamp
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

EXAMPLES:
    $0 postgresql /path/to/backup.dump                    # Full PostgreSQL restore
    $0 postgresql /path/to/backup.dump --type schema      # Schema-only restore
    $0 supabase --list                                    # List available Supabase backups
    $0 auto /path/to/backup.dump                          # Auto-detect provider and restore
    $0 neon --pitr "2025-01-15 14:30:00"                 # Point-in-time recovery

SAFETY FEATURES:
    - Backup file integrity verification
    - Confirmation prompt before destructive operations
    - Comprehensive logging
    - Automatic provider detection

EOF
}

# Main script execution
main() {
    # Parse command line arguments
    PROVIDER=""
    BACKUP_FILE=""
    RESTORE_TYPE="full"
    LIST_BACKUPS=false
    PITR_TIME=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                RESTORE_TYPE="$2"
                shift 2
                ;;
            --list)
                LIST_BACKUPS=true
                shift
                ;;
            --pitr)
                PITR_TIME="$2"
                shift 2
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
                elif [ -z "$BACKUP_FILE" ]; then
                    BACKUP_FILE="$1"
                else
                    error_exit "Too many arguments"
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
    
    # Validate restore type
    case $RESTORE_TYPE in
        "full"|"schema"|"data-only")
            ;;
        *)
            error_exit "Invalid restore type: $RESTORE_TYPE. Use: full, schema, or data-only"
            ;;
    esac
    
    # Create backup directory for logs
    mkdir -p "$BACKUP_DIR"
    
    # Initialize log file
    log "INFO" "ProcessPilot restore script started (Provider: $PROVIDER)"
    
    if [ "$LIST_BACKUPS" = true ]; then
        list_backups "$PROVIDER" "daily"
        echo ""
        list_backups "$PROVIDER" "schema"
        exit 0
    fi
    
    if [ -n "$PITR_TIME" ]; then
        point_in_time_recovery "$PROVIDER" "$PITR_TIME"
        exit 0
    fi
    
    if [ -z "$BACKUP_FILE" ]; then
        error_exit "Backup file not specified. Use --list to see available backups."
    fi
    
    perform_restore "$PROVIDER" "$BACKUP_FILE" "$RESTORE_TYPE"
    
    log "INFO" "Restore script execution completed"
}

# Execute main function with all arguments
main "$@"