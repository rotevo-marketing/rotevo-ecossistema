#!/usr/bin/env bash
# Run on a trusted administrator workstation with PostgreSQL client tools installed.
# Requires DATABASE_URL (Supabase session-pooler or direct PostgreSQL connection string).
# Never paste DATABASE_URL into tickets, git, chat, logs or CLI arguments.
set -Eeuo pipefail
umask 077
for bin in pg_dump pg_restore psql sha256sum; do command -v "$bin" >/dev/null || { echo "Missing tool: $bin" >&2; exit 1; }; done
: "${DATABASE_URL:?Set DATABASE_URL privately in your environment}"
OUT_DIR="${BACKUP_DIR:-$HOME/rotevo-private-backups}"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/rotevo-postgres-$TS.dump"
test ! -e "$FILE"
echo "Creating database archive (private, mode 0600)..."
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$FILE"
chmod 600 "$FILE"
echo "Checking archive structure..."
pg_restore --list "$FILE" > "$FILE.list"
chmod 600 "$FILE.list"
test -s "$FILE.list"
sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE.sha256"
echo "Archive generated: $FILE"
echo "IMPORTANT: Archive listing is not a restore test. Restore into a separate disposable database and verify representative records before migrations."
echo "Keep backup encrypted and offline; this archive contains sensitive data. Back up Storage objects separately."
