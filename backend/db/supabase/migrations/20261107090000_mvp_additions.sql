DELETE FROM deliq.cases WHERE case_number = 'DLQ-0001';

ALTER TABLE deliq.cases ADD COLUMN IF NOT EXISTS classification JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE deliq.cases ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE deliq.cases ADD COLUMN IF NOT EXISTS data_confidence NUMERIC(5,2);
ALTER TABLE deliq.recommendations ADD COLUMN IF NOT EXISTS eta_at TIMESTAMPTZ;
ALTER TABLE deliq.recommendations ADD COLUMN IF NOT EXISTS params JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uq_deliq_delivery_exception
  ON deliq.cases (source_delivery_number, exception_type)
  WHERE source_delivery_number IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS deliq.case_number_seq START 1;
CREATE OR REPLACE FUNCTION deliq.next_case_number()
RETURNS TEXT LANGUAGE sql AS $$
  SELECT 'DLQ-' || LPAD(nextval('deliq.case_number_seq')::TEXT, 4, '0')
$$;

CREATE OR REPLACE FUNCTION deliq.reset_demo()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  TRUNCATE deliq.audit_log, deliq.issue_reports, deliq.customer_messages, deliq.cases RESTART IDENTITY CASCADE;
  ALTER SEQUENCE deliq.case_number_seq RESTART WITH 1;
END;
$$;

CREATE TABLE IF NOT EXISTS deliq.customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES deliq.cases(id) ON DELETE CASCADE,
  action_id UUID REFERENCES deliq.actions(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'SMS' CHECK (channel IN ('SMS', 'EMAIL', 'PHONE')),
  recipient TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('sv', 'en')),
  body TEXT NOT NULL,
  sent_by TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('AUTONOMOUS', 'APPROVED')),
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'FAILED')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO deliq.app_settings (key, value, updated_by) VALUES
  ('kill_switch', '{"enabled": false}'::jsonb, 'migration'),
  ('autonomy_enabled', '{"green": true, "amber": true, "red": false}'::jsonb, 'migration'),
  ('policy', '{}'::jsonb, 'migration')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE VIEW deliq.v_kpi_detail AS
SELECT
  COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED', 'CLOSED', 'DISMISSED')) AS open_cases,
  COUNT(*) FILTER (WHERE autonomy_path = 'GREEN') AS green_cases,
  COUNT(*) FILTER (WHERE autonomy_path = 'AMBER') AS amber_cases,
  COUNT(*) FILTER (WHERE autonomy_path = 'RED') AS red_cases,
  COUNT(*) FILTER (WHERE autonomy_path = 'GREEN' AND status IN ('RESOLVED', 'CLOSED')) AS auto_resolved,
  COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM deliq.approvals a WHERE a.case_id = cases.id AND a.decision = 'APPROVED')) AS one_click_approved,
  COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM deliq.audit_log a WHERE a.case_id = cases.id AND a.action LIKE '%OVERRIDE%')) AS overridden,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL), 2) AS mttr_hours,
  ROUND(100.0 * COUNT(*) FILTER (WHERE autonomy_path = 'GREEN' AND status IN ('RESOLVED', 'CLOSED')) / NULLIF(COUNT(*), 0), 2) AS auto_or_one_click_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM deliq.audit_log a WHERE a.case_id = cases.id AND a.action LIKE '%OVERRIDE%')) / NULLIF(COUNT(*), 0), 2) AS override_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE promised_window_end IS NOT NULL AND detected_at < promised_window_end) / NULLIF(COUNT(*) FILTER (WHERE promised_window_end IS NOT NULL), 0), 2) AS early_detection_pct
FROM deliq.cases;
