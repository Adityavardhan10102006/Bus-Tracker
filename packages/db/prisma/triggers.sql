-- Audit Log Immutability Trigger
-- Implements Rule R-09 & Specification Section 10

CREATE OR REPLACE FUNCTION reject_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Immutability Violation (Rule R-09): UPDATE and DELETE operations are strictly prohibited on audit_logs table.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION reject_audit_log_modification();
