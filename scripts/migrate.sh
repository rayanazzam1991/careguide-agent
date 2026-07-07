#!/bin/sh
set -eu
set +x

: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is required}"
: "${SUPABASE_BACKUP_CONFIRMED:?Set SUPABASE_BACKUP_CONFIRMED=true after checking managed backups}"
[ "$SUPABASE_BACKUP_CONFIRMED" = "true" ] || { echo "Managed backup confirmation is required" >&2; exit 1; }

pnpm exec supabase db push --db-url "$SUPABASE_DATABASE_URL" --include-all --dry-run
[ "${MIGRATION_DRY_RUN_ONLY:-false}" = "true" ] && exit 0
pnpm exec supabase db push --db-url "$SUPABASE_DATABASE_URL" --include-all
