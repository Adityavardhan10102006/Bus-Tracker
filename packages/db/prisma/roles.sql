-- Database Roles and Grants
-- Implements Phase P0 Task P0-T4 & Part I.6.4

-- 1. Create Application Database Roles (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_migrator') THEN
    CREATE ROLE app_migrator WITH LOGIN;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime WITH LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_worker') THEN
    CREATE ROLE app_worker WITH LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

-- 2. Schema Grants
GRANT USAGE ON SCHEMA public TO app_runtime, app_worker;
GRANT ALL ON SCHEMA public TO app_migrator;

-- 3. Runtime API Role Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- 4. Audit Log Immutability (Rule R-09)
-- Revoke UPDATE, DELETE, and TRUNCATE from all application roles
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM app_runtime, app_worker;
