#!/usr/bin/env bash
# Runs migrations + RLS tests against a throwaway local PostgreSQL database.
# Usage: PGHOST=/tmp PGPORT=5544 PGUSER=postgres ./supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${TEST_DB:-ltr_test}
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f tests/local_supabase_stub.sql
for f in migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f seed.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f tests/rls_test.sql
