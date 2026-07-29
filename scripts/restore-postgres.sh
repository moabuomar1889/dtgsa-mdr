#!/bin/sh
set -eu
: "${RESTORE_DATABASE_URL:?required}"
: "${BACKUP_AGE_IDENTITY:?required}"
: "${1:?encrypted backup path required}"
case "$RESTORE_DATABASE_URL" in
  *prod*|*production*) [ "${ALLOW_PRODUCTION_RESTORE:-false}" = "true" ] || { echo "production restore denied" >&2; exit 2; } ;;
esac
sha256sum -c "$1.sha256"
age --decrypt -i "$BACKUP_AGE_IDENTITY" "$1" \
  | pg_restore --exit-on-error --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT COUNT(*) AS manifests FROM \"PackageManifest\";"

