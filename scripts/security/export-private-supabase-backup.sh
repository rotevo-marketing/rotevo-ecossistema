#!/usr/bin/env bash
# Run on a trusted administrator workstation with PostgreSQL client tools installed.
# Requires private libpq PGSERVICEFILE with [rotevo] and SSL (direct/session pooler).
# Never pass a connection URI containing credentials as a CLI argument.
set -Eeuo pipefail
umask 077
for bin in pg_dump pg_restore psql sha256sum; do command -v "$bin" >/dev/null || { echo "Missing tool: $bin" >&2; exit 1; }; done
: "${PGSERVICEFILE:?Set PGSERVICEFILE to your private libpq service file}"
[[ -f "$PGSERVICEFILE" ]] || { echo "Missing private libpq service file" >&2; exit 1; }
[[ "$(stat -c %a "$PGSERVICEFILE")" = "600" ]] || { echo "Restrict libpq file permissions to mode 0600" >&2; exit 1; }
export PGSERVICEFILE PGSERVICE=rotevo PGCONNECT_TIMEOUT=20
OUT_DIR="${BACKUP_DIR:-$HOME/rotevo-private-backups}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
OUT_DIR="$(mkdir -p "$OUT_DIR" && cd "$OUT_DIR" && pwd -P)"
case "$OUT_DIR/" in "$ROOT_DIR/"*) echo "Private backup must be outside repository" >&2; exit 1;; esac
case "$PGSERVICEFILE" in "$ROOT_DIR"/*) echo "Private credentials must be outside repository" >&2; exit 1;; esac
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$OUT_DIR/rotevo-postgres-$TS.dump"
test ! -e "$FILE"
echo "Creating database archive (private, mode 0600)..."
pg_dump --dbname="service=rotevo" --format=custom --no-owner --no-acl --file="$FILE"
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
