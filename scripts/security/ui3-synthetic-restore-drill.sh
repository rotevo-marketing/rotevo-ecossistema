#!/usr/bin/env bash
# Synthetic-only disaster recovery drill. This is NOT a restore of the private hosted backup.
set -euo pipefail
test "${PGHOST:-}" = "127.0.0.1"
test "${PGPORT:-}" = "55432"
test "${PGUSER:-}" = "postgres"
test "${PGDATABASE:-}" = "rotevo_security_test"
test -n "${RUNNER_TEMP:-}"
source_db="rotevo_action_submission_isolated"
restore_db="rotevo_restore_drill_isolated"
backup="$RUNNER_TEMP/ui3-synthetic-restore.dump"
expected_assignments="$(psql -X -At -d "$source_db" -c 'select count(*) from rotevo_workflow.client_action_assignments')"
expected_submissions="$(psql -X -At -d "$source_db" -c 'select count(*) from rotevo_workflow.client_action_submissions')"
test "$expected_assignments" -ge 1
test "$expected_submissions" -ge 1
trap 'rm -f "$backup"' EXIT

# Use PostgreSQL 17 from the same server family, not an older runner pg_dump.
docker run --rm --network host -e PGPASSWORD="$PGPASSWORD" postgres:17 \
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$source_db" -Fc > "$backup"
test -s "$backup"
sha256sum "$backup" >/dev/null
docker run --rm --network host -v "$RUNNER_TEMP:/safe:ro" -e PGPASSWORD="$PGPASSWORD" postgres:17 \
  pg_restore --list /safe/ui3-synthetic-restore.dump >/dev/null
psql -X -v ON_ERROR_STOP=1 -c "CREATE DATABASE $restore_db"
docker run --rm --network host -v "$RUNNER_TEMP:/safe:ro" -e PGPASSWORD="$PGPASSWORD" postgres:17 \
  pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$restore_db" \
  --no-owner --no-acl --exit-on-error /safe/ui3-synthetic-restore.dump
restored_assignments="$(psql -X -At -d "$restore_db" -c 'select count(*) from rotevo_workflow.client_action_assignments')"
restored_submissions="$(psql -X -At -d "$restore_db" -c 'select count(*) from rotevo_workflow.client_action_submissions')"
test "$restored_assignments" = "$expected_assignments"
test "$restored_submissions" = "$expected_submissions"
psql -X -v ON_ERROR_STOP=1 -d "$restore_db" <<'SQL'
do $drill$
begin
 if not (select relrowsecurity from pg_class
 where oid='rotevo_workflow.client_action_submissions'::regclass)
 then raise exception 'RLS state not preserved in restore';end if;
 if not exists(select 1 from pg_proc where proname='rotevo_client_action_submit')
 then raise exception 'Submission RPC missing from restored database';end if;
 if has_table_privilege('authenticated','rotevo_workflow.client_action_submissions','SELECT')
 then raise exception 'Private submission table exposed after restore';end if;
 raise notice 'SYNTHETIC_RESTORE_PASS: schema, RPC, RLS, private grants and source/restored counts match';
end $drill$;
SQL
echo "PASS: disposable PostgreSQL 17 backup/list/restore/synthetic integrity drill"
echo "NOTE: does NOT validate real hosted backup, auth identities, or external Google Drive objects"
