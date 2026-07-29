-- Template only. An authorized administrator creates login roles separately.
CREATE ROLE dtg_signature_migrate NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_signature_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_signature_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_signature_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;

ALTER ROLE dtg_signature_migrate SET search_path = public, pg_catalog;
ALTER ROLE dtg_signature_runtime SET search_path = public, pg_catalog;
ALTER ROLE dtg_signature_readonly SET search_path = public, pg_catalog;
ALTER ROLE dtg_signature_backup SET search_path = public, pg_catalog;

GRANT USAGE ON SCHEMA public TO dtg_signature_runtime, dtg_signature_readonly, dtg_signature_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dtg_signature_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dtg_signature_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dtg_signature_readonly, dtg_signature_backup;

REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM dtg_signature_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, dtg_signature_runtime, dtg_signature_readonly, dtg_signature_backup;
