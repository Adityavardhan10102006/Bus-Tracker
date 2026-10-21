-- PostgreSQL Row-Level Security (RLS) Policies
-- Implements Phase P0 Task P0-T8 & Part I.6.3

-- 1. Enable and FORCE RLS on identity and sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE mfa_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_factors FORCE ROW LEVEL SECURITY;

ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes FORCE ROW LEVEL SECURITY;

ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_otps FORCE ROW LEVEL SECURITY;

-- 2. Tenant Context Isolation Policies
-- Current session user ID is injected via set_config('app.current_user_id', ..., true)

DROP POLICY IF EXISTS user_self_access ON users;
CREATE POLICY user_self_access ON users
  FOR ALL
  TO app_runtime
  USING (
    id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.current_user_role', true) IN ('SAD', 'COR')
  );

DROP POLICY IF EXISTS session_owner_access ON sessions;
CREATE POLICY session_owner_access ON sessions
  FOR ALL
  TO app_runtime
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.current_user_role', true) = 'SAD'
  );

DROP POLICY IF EXISTS mfa_owner_access ON mfa_factors;
CREATE POLICY mfa_owner_access ON mfa_factors
  FOR ALL
  TO app_runtime
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    OR current_setting('app.current_user_role', true) = 'SAD'
  );
