#!/usr/bin/env bash
# Strictly local! Runs only against detached Supabase CLI instance on 127.0.0.1:54322.
set -euo pipefail
test "${ROTEVO_LOCAL_API_TESTS:-}" = "YES_LOCAL_ONLY"
test "${API_URL:-}" = "http://127.0.0.1:54321"
test "${PGHOST:-127.0.0.1}" = "127.0.0.1"
test "${PGPORT:-54322}" = "54322"
test -z "${SUPABASE_PROJECT_REF:-}"
export PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
for f in \
 docs/security/sql/ui3-gate-b-workflow-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-actions-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-designated-editorial-approvers-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-action-rpc-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-action-submit-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-action-review-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-action-review-queue-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-client-action-notifications-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-editorial-designate-approver-rpc-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-editorial-workflow-request-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-editorial-workflow-rpc-PROPOSAL-ONLY.sql \
 docs/security/sql/ui3-account-appearance-PROPOSAL-ONLY.sql
do
  psql -X -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done
# PGHOST/PGPORT are pinned to loopback above; container-side inet_server_addr()
# may be a Docker bridge IP, so it is NOT used to identify the local target.
test "$(psql -X -Atc 'select current_database()')" = "postgres"
echo "PASS: proposal RPCs installed in disposable local Supabase CLI only"
