#!/bin/sh
set -eu
: "${BACKUP_DATABASE_URL:?required}"
: "${BACKUP_AGE_RECIPIENT:?required}"
: "${BACKUP_DIRECTORY:?required}"
umask 077
mkdir -p "$BACKUP_DIRECTORY"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
output="$BACKUP_DIRECTORY/dtg-signature-$stamp.dump.age"
pg_dump --format=custom --no-owner --no-privileges "$BACKUP_DATABASE_URL" \
  | age --recipient "$BACKUP_AGE_RECIPIENT" > "$output"
sha256sum "$output" > "$output.sha256"
age --decrypt -i "${BACKUP_AGE_IDENTITY:?required}" "$output" \
  | pg_restore --list >/dev/null
printf '%s\n' "$output"

