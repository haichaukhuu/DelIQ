CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS deliq;

CREATE TABLE IF NOT EXISTS deliq.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number TEXT NOT NULL UNIQUE,
    source_order_id BIGINT,
    source_order_number TEXT NOT NULL,
    source_delivery_id BIGINT,
    source_delivery_number TEXT,
    source_fulfillment_id BIGINT,
    distribution_center_code TEXT NOT NULL DEFAULT 'DC-STO',
    customer_type TEXT NOT NULL CHECK (customer_type IN ('B2B', 'B2C')),
    customer_tier TEXT NOT NULL DEFAULT 'STANDARD'
        CHECK (customer_tier IN ('STRATEGIC', 'KEY', 'STANDARD')),
    exception_type TEXT NOT NULL
        CHECK (exception_type IN ('SHORT_PICK', 'STOCKOUT', 'LATE_DISPATCH', 'TRANSIT_DELAY', 'DELIVERY_FAILURE', 'OTHER')),
    severity TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    autonomy_path TEXT NOT NULL DEFAULT 'AMBER'
        CHECK (autonomy_path IN ('GREEN', 'AMBER', 'RED')),
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'RESOLVED', 'CLOSED', 'DISMISSED')),
    owner_name TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    order_value NUMERIC(12, 2),
    promised_window_start TIMESTAMPTZ,
    promised_window_end TIMESTAMPTZ,
    current_eta TIMESTAMPTZ,
    urgency_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 100),
    title TEXT NOT NULL,
    summary TEXT,
    root_cause TEXT,
    resolution_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliq_cases_queue
    ON deliq.cases (status, autonomy_path, due_at);
CREATE INDEX IF NOT EXISTS idx_deliq_cases_detected_at
    ON deliq.cases (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliq_cases_source_order
    ON deliq.cases (source_order_number);

CREATE TABLE IF NOT EXISTS deliq.case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES deliq.cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source_system TEXT NOT NULL CHECK (source_system IN ('ERP', 'WMS', 'TMS', 'CARRIER', 'DELIQ', 'MANUAL')),
    occurred_at TIMESTAMPTZ NOT NULL,
    description TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliq_case_events_case_time
    ON deliq.case_events (case_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS deliq.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES deliq.cases(id) ON DELETE CASCADE,
    rank SMALLINT NOT NULL CHECK (rank > 0),
    action_type TEXT NOT NULL
        CHECK (action_type IN ('NOTIFY_CUSTOMER', 'REQUEST_INFORMATION', 'RESCHEDULE', 'REROUTE', 'REPLACE_ORDER', 'ESCALATE', 'NO_ACTION')),
    title TEXT NOT NULL,
    rationale TEXT,
    proposed_message TEXT,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
    probability_of_on_time NUMERIC(5, 2) CHECK (probability_of_on_time BETWEEN 0 AND 100),
    meets_promised_window BOOLEAN,
    autonomy_path TEXT NOT NULL CHECK (autonomy_path IN ('GREEN', 'AMBER', 'RED')),
    confidence NUMERIC(5, 2) CHECK (confidence BETWEEN 0 AND 100),
    status TEXT NOT NULL DEFAULT 'PROPOSED'
        CHECK (status IN ('PROPOSED', 'SELECTED', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED')),
    generated_by TEXT NOT NULL DEFAULT 'DELIQ_RULES',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (case_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_deliq_recommendations_case_status
    ON deliq.recommendations (case_id, status);

CREATE TABLE IF NOT EXISTS deliq.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES deliq.cases(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES deliq.recommendations(id) ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    decided_by TEXT NOT NULL,
    reason TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliq_approvals_case
    ON deliq.approvals (case_id, decided_at DESC);

CREATE TABLE IF NOT EXISTS deliq.actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES deliq.cases(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES deliq.recommendations(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    execution_status TEXT NOT NULL DEFAULT 'COMPLETED'
        CHECK (execution_status IN ('QUEUED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    executed_by TEXT NOT NULL,
    external_reference TEXT,
    result_summary TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliq_actions_case
    ON deliq.actions (case_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS deliq.issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES deliq.cases(id) ON DELETE SET NULL,
    reported_by TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    source_system TEXT CHECK (source_system IN ('ERP', 'WMS', 'TMS', 'CARRIER', 'DELIQ', 'MANUAL')),
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deliq.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES deliq.cases(id) ON DELETE SET NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliq_audit_case_time
    ON deliq.audit_log (case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS deliq.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION deliq.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cases_set_updated_at ON deliq.cases;
CREATE TRIGGER cases_set_updated_at
BEFORE UPDATE ON deliq.cases
FOR EACH ROW EXECUTE FUNCTION deliq.set_updated_at();

CREATE OR REPLACE VIEW deliq.v_case_queue AS
SELECT
    c.id,
    c.case_number,
    c.source_order_number,
    c.source_delivery_number,
    c.distribution_center_code,
    c.customer_type,
    c.customer_tier,
    c.exception_type,
    c.severity,
    c.autonomy_path,
    c.status,
    c.owner_name,
    c.detected_at,
    c.due_at,
    c.order_value,
    c.promised_window_end,
    c.current_eta,
    c.urgency_score,
    c.title,
    c.summary,
    r.title AS top_recommendation,
    r.estimated_cost AS top_recommendation_cost
FROM deliq.cases c
LEFT JOIN deliq.recommendations r
    ON r.case_id = c.id AND r.rank = 1
WHERE c.status NOT IN ('CLOSED', 'DISMISSED')
ORDER BY c.urgency_score DESC, c.due_at NULLS LAST;

CREATE OR REPLACE VIEW deliq.v_kpi_summary AS
SELECT
    COUNT(*) AS total_cases,
    COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) AS resolved_cases,
    COUNT(*) FILTER (WHERE autonomy_path = 'GREEN') AS green_cases,
    COUNT(*) FILTER (WHERE autonomy_path = 'AMBER') AS amber_cases,
    COUNT(*) FILTER (WHERE autonomy_path = 'RED') AS red_cases,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600)
        FILTER (WHERE resolved_at IS NOT NULL), 2) AS average_resolution_hours,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE autonomy_path = 'GREEN' AND status IN ('RESOLVED', 'CLOSED'))
        / NULLIF(COUNT(*) FILTER (WHERE autonomy_path = 'GREEN'), 0),
        2
    ) AS green_resolution_rate
FROM deliq.cases;

INSERT INTO deliq.app_settings (key, value, updated_by)
VALUES
    ('autonomy_enabled', '{"green": true, "amber": false, "red": false}'::jsonb, 'migration'),
    ('spending_cap_sek', '{"per_case": 5000, "daily": 25000}'::jsonb, 'migration')
ON CONFLICT (key) DO NOTHING;

INSERT INTO deliq.cases (
    case_number,
    source_order_number,
    source_delivery_number,
    distribution_center_code,
    customer_type,
    customer_tier,
    exception_type,
    severity,
    autonomy_path,
    status,
    owner_name,
    detected_at,
    due_at,
    order_value,
    promised_window_start,
    promised_window_end,
    current_eta,
    urgency_score,
    title,
    summary,
    root_cause
)
VALUES (
    'DLQ-0001',
    'SE-48213',
    'DEL-SE-48213',
    'DC-STO',
    'B2B',
    'STRATEGIC',
    'SHORT_PICK',
    'HIGH',
    'AMBER',
    'PENDING_APPROVAL',
    'Erik',
    NOW() - INTERVAL '35 minutes',
    NOW() + INTERVAL '90 minutes',
    18450,
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '6 hours',
    NOW() + INTERVAL '6 hours',
    86,
    'Short-pick threatens promised site delivery',
    'Two timber packs are unavailable at DC-STO. A replacement from DC-GOT can still meet the site window if approved now.',
    'WMS stockout during pick confirmation'
)
ON CONFLICT (case_number) DO NOTHING;

INSERT INTO deliq.case_events (case_id, event_type, source_system, occurred_at, description, payload)
SELECT id, 'PICK_SHORT', 'WMS', NOW() - INTERVAL '35 minutes',
       'WMS confirmed a short-pick on the timber line.',
       '{"sku": "TRB-45X95-3600", "quantity_ordered": 12, "quantity_picked": 10, "short_quantity": 2}'::jsonb
FROM deliq.cases
WHERE case_number = 'DLQ-0001'
  AND NOT EXISTS (
      SELECT 1 FROM deliq.case_events e
      WHERE e.case_id = deliq.cases.id AND e.event_type = 'PICK_SHORT'
  );

INSERT INTO deliq.recommendations (
    case_id, rank, action_type, title, rationale, proposed_message,
    estimated_cost, probability_of_on_time, meets_promised_window,
    autonomy_path, confidence, generated_by
)
SELECT id, 1, 'REROUTE', 'Reroute two timber packs from DC-GOT',
       'Nearby stock is available and the transfer can leave before the promised window.',
       'We found a stock issue before dispatch. We are securing the remaining timber and will confirm the updated ETA shortly.',
       850, 92, TRUE, 'AMBER', 94, 'DELIQ_AI'
FROM deliq.cases
WHERE case_number = 'DLQ-0001'
  AND NOT EXISTS (
      SELECT 1 FROM deliq.recommendations r
      WHERE r.case_id = deliq.cases.id AND r.rank = 1
  );
