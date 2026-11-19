#!/usr/bin/env bash
set -euo pipefail

# scripts/backup.sh - Encrypted database backup runner
# Based on LAUNCH_PLAN.md Prompt 8 & DEPLOYMENT.md Prompt D3

if [ -z "${PROD_DB_URL:-}" ]; then
  echo "Error: PROD_DB_URL environment variable is required."
  exit 1
fi

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"

OUTPUT_FILE="$BACKUP_DIR/jamabook_backup_$TIMESTAMP.sql.gz"

echo "Starting database backup at $TIMESTAMP (IST: $(TZ='Asia/Kolkata' date))..."

# Mask connection password in terminal logs
export PGPASSWORD=$(echo "$PROD_DB_URL" | sed -E 's/.*:([^@]+)@.*/\1/')

pg_dump "$PROD_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=public \
  | gzip -9 > "$OUTPUT_FILE"

FILE_SIZE=$(wc -c < "$OUTPUT_FILE")

if [ "$FILE_SIZE" -lt 1024 ]; then
  echo "Error: Backup file is smaller than 1 KB ($FILE_SIZE bytes). Aborting."
  rm -f "$OUTPUT_FILE"
  exit 1
fi

echo "Backup completed successfully: $OUTPUT_FILE ($FILE_SIZE bytes)."

# If age public key is provided, encrypt backup
if [ -n "${BACKUP_AGE_PUBLIC_KEY:-}" ]; then
  echo "Encrypting backup with age public key..."
  age -r "$BACKUP_AGE_PUBLIC_KEY" -o "$OUTPUT_FILE.age" "$OUTPUT_FILE"
  rm -f "$OUTPUT_FILE"
  echo "Encrypted backup saved as $OUTPUT_FILE.age"
fi
