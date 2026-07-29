-- Template only. An authorized administrator creates login roles separately.
CREATE ROLE dtg_migration NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_readonly NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE dtg_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;

ALTER ROLE dtg_migration SET search_path = public, pg_catalog;
ALTER ROLE dtg_runtime SET search_path = public, pg_catalog;
ALTER ROLE dtg_readonly SET search_path = public, pg_catalog;
ALTER ROLE dtg_backup SET search_path = public, pg_catalog;

GRANT USAGE ON SCHEMA public TO dtg_runtime, dtg_readonly, dtg_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dtg_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO dtg_runtime;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dtg_readonly, dtg_backup;

REVOKE UPDATE, DELETE ON TABLE "AuditLog" FROM dtg_runtime;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, dtg_runtime, dtg_readonly, dtg_backup;
