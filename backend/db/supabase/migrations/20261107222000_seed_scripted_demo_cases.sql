-- =============================================================================
-- DelIQ Control Tower — Repeatable Demo Seed & Reset Script
-- Run or re-run this script in the Supabase SQL Editor between demo retakes to:
--   1. Clear all runtime approvals, actions, audit_log, issue_reports, and events
--   2. Reset all 10 scripted cases (DLQ-0001 .. DLQ-0010) to their initial paths & statuses
--   3. Reset all ranked AI recommendations and fresh timeline events
-- =============================================================================

BEGIN;

-- 1. Wipe runtime workflow history & any stale/duplicate cases so ticket timelines are never scrambled across retakes
DELETE FROM deliq.audit_log;
DELETE FROM deliq.actions;
DELETE FROM deliq.approvals;
DELETE FROM deliq.issue_reports;
DELETE FROM deliq.case_events;
DELETE FROM deliq.recommendations;
DELETE FROM deliq.cases;

-- 2. Upsert & Reset all 10 Scripted Demo Cases (DLQ-0001 .. DLQ-0010)
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
    resolved_at,
    order_value,
    promised_window_start,
    promised_window_end,
    current_eta,
    urgency_score,
    title,
    summary,
    root_cause,
    resolution_summary
)
VALUES
    -- DLQ-0001 (SE-48213): Path B (AMBER) · High B2B Timber Short-pick
    (
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
        NULL,
        18450.00,
        NOW() + INTERVAL '2 hours',
        NOW() + INTERVAL '6 hours',
        NOW() + INTERVAL '6 hours',
        86.00,
        'Short-pick threatens promised site delivery',
        'Two timber packs are unavailable at DC-STO. A replacement from DC-GOT can still meet the site window if approved now.',
        'WMS stockout during pick confirmation',
        NULL
    ),
    -- DLQ-0002 (DQ-2041): Path C (RED) · Critical B2B Vehicle Breakdown
    (
        'DLQ-0002',
        'DQ-2041',
        'DEL-DQ-2041',
        'DC-JON',
        'B2B',
        'STRATEGIC',
        'DELIVERY_FAILURE',
        'CRITICAL',
        'RED',
        'OPEN',
        NULL,
        NOW() - INTERVAL '42 minutes',
        NOW() + INTERVAL '55 minutes',
        NULL,
        48200.00,
        NOW() + INTERVAL '30 minutes',
        NOW() + INTERVAL '95 minutes',
        NOW() + INTERVAL '210 minutes',
        96.00,
        'Plasterboard pallets, Bergström Bygg site',
        'Truck stopped on E4, 62 km from site. Crew of 6 waits on site.',
        'Carrier vehicle breakdown in transit on E4 northbound',
        NULL
    ),
    -- DLQ-0003 (DQ-2038): Path B (AMBER) · High B2B Short-pick / Stockout
    (
        'DLQ-0003',
        'DQ-2038',
        'DEL-DQ-2038',
        'DC-JON',
        'B2B',
        'KEY',
        'SHORT_PICK',
        'HIGH',
        'AMBER',
        'PENDING_APPROVAL',
        'Desmond',
        NOW() - INTERVAL '28 minutes',
        NOW() + INTERVAL '150 minutes',
        NULL,
        12900.00,
        NOW() + INTERVAL '120 minutes',
        NOW() + INTERVAL '210 minutes',
        NOW() + INTERVAL '210 minutes',
        81.00,
        'Insulation rolls, Hallberg Entreprenad',
        'Warehouse picked 38 of 48 rolls. Stock shows 0 until restock tomorrow 06:00.',
        'WMS short-pick confirmation against bay inventory',
        NULL
    ),
    -- DLQ-0004 (DQ-2036): Path B (AMBER) · High B2B Late Dispatch
    (
        'DLQ-0004',
        'DQ-2036',
        'DEL-DQ-2036',
        'DC-GOT',
        'B2B',
        'KEY',
        'LATE_DISPATCH',
        'HIGH',
        'AMBER',
        'PENDING_APPROVAL',
        'Desmond',
        NOW() - INTERVAL '22 minutes',
        NOW() + INTERVAL '110 minutes',
        NULL,
        7800.00,
        NOW() + INTERVAL '90 minutes',
        NOW() + INTERVAL '150 minutes',
        NOW() + INTERVAL '240 minutes',
        74.00,
        'Roof battens, Nyström Tak AB',
        'Loading finished 2h late. Planned slot 10:00 now at risk.',
        'Dock congestion delayed outbound loading by 120 minutes',
        NULL
    ),
    -- DLQ-0005 (DQ-2033): Path A (GREEN) · Low B2C Transit Delay (Auto-resolved)
    (
        'DLQ-0005',
        'DQ-2033',
        'DEL-DQ-2033',
        'DC-STO',
        'B2C',
        'STANDARD',
        'TRANSIT_DELAY',
        'LOW',
        'GREEN',
        'RESOLVED',
        'DELIQ_AI',
        NOW() - INTERVAL '95 minutes',
        NOW() + INTERVAL '360 minutes',
        NOW() - INTERVAL '94 minutes',
        640.00,
        NOW() + INTERVAL '240 minutes',
        NOW() + INTERVAL '400 minutes',
        NOW() + INTERVAL '380 minutes',
        32.00,
        'Paint buckets, private customer Ek',
        'Carrier scan missed at hub. Parcel is still moving.',
        'Missed intermediate hub scan at PostNord terminal',
        'Autonomous ETA notification sent to customer within €0 spending cap.'
    ),
    -- DLQ-0006 (DQ-2031): Path A (GREEN) · Medium B2B Missing Gate Code (Auto-resolved)
    (
        'DLQ-0006',
        'DQ-2031',
        'DEL-DQ-2031',
        'DC-JON',
        'B2B',
        'STANDARD',
        'OTHER',
        'MEDIUM',
        'GREEN',
        'RESOLVED',
        'DELIQ_AI',
        NOW() - INTERVAL '140 minutes',
        NOW() + INTERVAL '260 minutes',
        NOW() - INTERVAL '95 minutes',
        2300.00,
        NOW() + INTERVAL '180 minutes',
        NOW() + INTERVAL '300 minutes',
        NOW() + INTERVAL '240 minutes',
        45.00,
        'Tile adhesive, Svensson Bygg',
        'Site gate code missing on the delivery note.',
        'Mandatory site access field empty on ERP delivery note',
        'AI requested and verified site gate code from customer contact.'
    ),
    -- DLQ-0007 (DQ-2029): Path C (RED) · High B2B Delivery-Day Damage
    (
        'DLQ-0007',
        'DQ-2029',
        'DEL-DQ-2029',
        'DC-JON',
        'B2B',
        'STRATEGIC',
        'DELIVERY_FAILURE',
        'HIGH',
        'RED',
        'OPEN',
        NULL,
        NOW() - INTERVAL '18 minutes',
        NOW() + INTERVAL '45 minutes',
        NULL,
        31500.00,
        NOW() - INTERVAL '30 minutes',
        NOW() + INTERVAL '60 minutes',
        NOW() + INTERVAL '60 minutes',
        90.00,
        'Kitchen cabinets, Lindgren Interiör',
        'Customer refused unloading: two doors damaged on arrival.',
        'In-transit load shift damaged two cabinet doors reported by driver POD scan',
        NULL
    ),
    -- DLQ-0008 (DQ-2027): Path B (AMBER) · Medium B2B Weather Transit Delay
    (
        'DLQ-0008',
        'DQ-2027',
        'DEL-DQ-2027',
        'DC-STO',
        'B2B',
        'STANDARD',
        'TRANSIT_DELAY',
        'MEDIUM',
        'AMBER',
        'PENDING_APPROVAL',
        'Desmond',
        NOW() - INTERVAL '30 minutes',
        NOW() + INTERVAL '200 minutes',
        NULL,
        5400.00,
        NOW() + INTERVAL '160 minutes',
        NOW() + INTERVAL '260 minutes',
        NOW() + INTERVAL '350 minutes',
        58.00,
        'Bathroom fittings, Norrland Rör',
        'Carrier API shows 90 min delay due to weather on E45.',
        'Adverse weather slowdown along E45 corridor',
        NULL
    ),
    -- DLQ-0009 (DQ-2024): Path A (GREEN) · Low B2C Minor Pickup Delay (Auto-resolved)
    (
        'DLQ-0009',
        'DQ-2024',
        'DEL-DQ-2024',
        'DC-GOT',
        'B2C',
        'STANDARD',
        'TRANSIT_DELAY',
        'LOW',
        'GREEN',
        'RESOLVED',
        'DELIQ_AI',
        NOW() - INTERVAL '75 minutes',
        NOW() + INTERVAL '440 minutes',
        NOW() - INTERVAL '74 minutes',
        1150.00,
        NOW() + INTERVAL '360 minutes',
        NOW() + INTERVAL '500 minutes',
        NOW() + INTERVAL '420 minutes',
        25.00,
        'Garden decking, private customer Holm',
        'Pickup scan late by 40 min. No customer impact yet.',
        'Linehaul pickup scan 40 minutes behind schedule with buffer intact',
        'Proactive status acknowledgement sent automatically.'
    ),
    -- DLQ-0010 (DQ-2044): Path B (AMBER) · Critical B2B Crane-Truck Stockout
    (
        'DLQ-0010',
        'DQ-2044',
        'DEL-DQ-2044',
        'DC-JON',
        'B2B',
        'STRATEGIC',
        'STOCKOUT',
        'CRITICAL',
        'AMBER',
        'PENDING_APPROVAL',
        'Desmond',
        NOW() - INTERVAL '14 minutes',
        NOW() + INTERVAL '75 minutes',
        NULL,
        36800.00,
        NOW() + INTERVAL '60 minutes',
        NOW() + INTERVAL '115 minutes',
        NOW() + INTERVAL '180 minutes',
        92.00,
        'Structural steel lintels, Skanska Midt site',
        'Primary bay short 4 steel lintels at Jönköping DC. Crane crew booked at 13:00.',
        'Cycle-count discrepancy on heavy steel lintel rack B-04',
        NULL
    )
ON CONFLICT (case_number) DO UPDATE SET
    source_order_number = EXCLUDED.source_order_number,
    source_delivery_number = EXCLUDED.source_delivery_number,
    distribution_center_code = EXCLUDED.distribution_center_code,
    customer_type = EXCLUDED.customer_type,
    customer_tier = EXCLUDED.customer_tier,
    exception_type = EXCLUDED.exception_type,
    severity = EXCLUDED.severity,
    autonomy_path = EXCLUDED.autonomy_path,
    status = EXCLUDED.status,
    owner_name = EXCLUDED.owner_name,
    detected_at = EXCLUDED.detected_at,
    due_at = EXCLUDED.due_at,
    resolved_at = EXCLUDED.resolved_at,
    order_value = EXCLUDED.order_value,
    promised_window_start = EXCLUDED.promised_window_start,
    promised_window_end = EXCLUDED.promised_window_end,
    current_eta = EXCLUDED.current_eta,
    urgency_score = EXCLUDED.urgency_score,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    root_cause = EXCLUDED.root_cause,
    resolution_summary = EXCLUDED.resolution_summary;


-- 3. Seed Ranked Recommendations for All 10 Cases (DLQ-0001 .. DLQ-0010)
INSERT INTO deliq.recommendations (
    case_id,
    rank,
    action_type,
    title,
    rationale,
    proposed_message,
    estimated_cost,
    probability_of_on_time,
    meets_promised_window,
    autonomy_path,
    confidence,
    status,
    generated_by
)
SELECT
    c.id,
    r.rank,
    r.action_type,
    r.title,
    r.rationale,
    r.proposed_message,
    r.estimated_cost,
    r.probability_of_on_time,
    r.meets_promised_window,
    r.autonomy_path,
    r.confidence,
    r.status,
    'DELIQ_AI'
FROM (
    VALUES
        -- DLQ-0001 (SE-48213 · Path B)
        (
            'DLQ-0001', 1::smallint, 'REROUTE',
            'Reroute two timber packs from DC-GOT',
            'Nearby stock is available and the transfer can leave before the promised window.',
            'We found a stock issue before dispatch. We are securing the remaining timber and will confirm the updated ETA shortly.',
            850.00::numeric(12,2), 92.00::numeric(5,2), TRUE, 'AMBER', 94.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0001', 2::smallint, 'RESCHEDULE',
            'Split shipment: deliver 10 packs now, 2 packs tomorrow 07:30',
            'Avoids inter-depot express freight while delivering 83% of site framing timber on time.',
            'Hej, 10 of 12 timber packs are on the truck for your window today. The remaining 2 packs will arrive tomorrow at 07:30.',
            190.00::numeric(12,2), 85.00::numeric(5,2), TRUE, 'AMBER', 89.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0001', 3::smallint, 'RESCHEDULE',
            'Move full delivery to tomorrow 07:00 first-drop slot',
            'Zero extra freight cost after overnight replenishment at DC-STO, but misses today''s window.',
            'Hej, due to a stock shortfall at our Stockholm depot, we propose moving your complete timber delivery to tomorrow at 07:00.',
            0.00::numeric(12,2), 96.00::numeric(5,2), FALSE, 'AMBER', 91.00::numeric(5,2), 'PROPOSED'
        ),

        -- DLQ-0003 (DQ-2038 · Path B)
        (
            'DLQ-0003', 1::smallint, 'RESCHEDULE',
            'Split delivery: ship 38 today, 10 tomorrow 08:00',
            'Keeps insulation crew working today (Today 14:00) with minimal extra freight.',
            'Hej, 10 of 48 rolls are out of stock. We can deliver 38 today at 14:00 and the rest tomorrow at 08:00. Please confirm.',
            120.00::numeric(12,2), 84.00::numeric(5,2), TRUE, 'AMBER', 90.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0003', 2::smallint, 'REPLACE_ORDER',
            'Send replacement order from Örebro DC',
            'Delivers all 48 rolls today (Today 17:30) via inter-depot courier.',
            'Hej, we are transferring 10 insulation rolls from our Örebro depot so your full 48-roll order arrives today by 17:30.',
            290.00::numeric(12,2), 72.00::numeric(5,2), FALSE, 'AMBER', 82.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0003', 3::smallint, 'RESCHEDULE',
            'Reschedule full delivery to tomorrow',
            'Zero extra transport cost (Tomorrow 08:00) after 06:00 restock.',
            'Hej, due to a stock shortfall of 10 rolls, we propose delivering your complete 48-roll order tomorrow at 08:00.',
            0.00::numeric(12,2), 93.00::numeric(5,2), FALSE, 'AMBER', 95.00::numeric(5,2), 'PROPOSED'
        ),

        -- DLQ-0004 (DQ-2036 · Path B)
        (
            'DLQ-0004', 1::smallint, 'REROUTE',
            'Book express carrier for same-day slot',
            'Recovers loading delay with dedicated express vehicle (Today 13:30).',
            'Hej, your delivery will arrive at 13:30 today via express carrier. We have notified your site manager.',
            180.00::numeric(12,2), 79.00::numeric(5,2), TRUE, 'AMBER', 86.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0004', 2::smallint, 'RESCHEDULE',
            'Move site slot to 15:00 and notify customer',
            'No additional carrier cost (Today 15:00) using scheduled DB Schenker route.',
            'Hej, your delivery will arrive at 15:00 instead of 10:00. We are sorry for the delay and have notified your site manager.',
            0.00::numeric(12,2), 90.00::numeric(5,2), FALSE, 'AMBER', 92.00::numeric(5,2), 'PROPOSED'
        ),

        -- DLQ-0005 (DQ-2033 · Path A Auto-resolved)
        (
            'DLQ-0005', 1::smallint, 'NOTIFY_CUSTOMER',
            'Send updated ETA notification',
            'Low-risk B2C parcel delay with €0 cost; proactive SMS prevents WISMO call.',
            'Hi Ek, your order is running about 3 hours late. New ETA: today 17:00–19:00.',
            0.00::numeric(12,2), 97.00::numeric(5,2), TRUE, 'GREEN', 98.00::numeric(5,2), 'EXECUTED'
        ),

        -- DLQ-0006 (DQ-2031 · Path A Auto-resolved)
        (
            'DLQ-0006', 1::smallint, 'REQUEST_INFORMATION',
            'Ask customer for gate code and unloading contact',
            'Zero-cost automated outreach resolves missing ERP site access field before dispatch.',
            'Hej, we need the gate code for tomorrow’s delivery. Please reply to this message.',
            0.00::numeric(12,2), 92.00::numeric(5,2), TRUE, 'GREEN', 95.00::numeric(5,2), 'EXECUTED'
        ),

        -- DLQ-0008 (DQ-2027 · Path B)
        (
            'DLQ-0008', 1::smallint, 'RESCHEDULE',
            'Reschedule site slot to tomorrow 07:00',
            'Avoids evening overtime unloading in bad weather (Tomorrow 07:00).',
            'Hej, due to weather your delivery is moved to tomorrow at 07:00. Reply “change” if you need another time.',
            0.00::numeric(12,2), 95.00::numeric(5,2), FALSE, 'AMBER', 94.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0008', 2::smallint, 'REROUTE',
            'Keep slot, add driver overtime',
            'Delivers today at 19:00 despite E45 weather slowdown.',
            'Hej, due to weather on E45 your delivery will arrive today at 19:00. Our driver will call 30 minutes before arrival.',
            220.00::numeric(12,2), 66.00::numeric(5,2), TRUE, 'AMBER', 76.00::numeric(5,2), 'PROPOSED'
        ),

        -- DLQ-0009 (DQ-2024 · Path A Auto-resolved)
        (
            'DLQ-0009', 1::smallint, 'NOTIFY_CUSTOMER',
            'Send status acknowledgement',
            'Minor 40-min pickup delay absorbed by buffer; €0 proactive acknowledgement.',
            'Hi Holm, your decking is on its way. We will update you if the time changes.',
            0.00::numeric(12,2), 99.00::numeric(5,2), TRUE, 'GREEN', 99.00::numeric(5,2), 'EXECUTED'
        ),

        -- DLQ-0010 (DQ-2044 · Path B)
        (
            'DLQ-0010', 1::smallint, 'REROUTE',
            'Express hot-shot transfer of 4 lintels from Linköping DC',
            'Meets 13:00 site crane booking (ETA 12:25) via dedicated flatbed.',
            'Hej, 4 steel lintels are being dispatched by express flatbed from Linköping DC and will arrive before your 13:00 crane slot.',
            340.00::numeric(12,2), 91.00::numeric(5,2), TRUE, 'AMBER', 93.00::numeric(5,2), 'PROPOSED'
        ),
        (
            'DLQ-0010', 2::smallint, 'RESCHEDULE',
            'Deliver available 16 lintels now, remaining 4 at 16:00',
            'Uses scheduled afternoon shuttle at lower cost (Today 16:00).',
            'Hej, 16 steel lintels are arriving for your 13:00 slot and the remaining 4 will arrive at 16:00 today.',
            140.00::numeric(12,2), 83.00::numeric(5,2), FALSE, 'AMBER', 87.00::numeric(5,2), 'PROPOSED'
        )
) AS r(
    case_number, rank, action_type, title, rationale, proposed_message,
    estimated_cost, probability_of_on_time, meets_promised_window,
    autonomy_path, confidence, status
)
JOIN deliq.cases c ON c.case_number = r.case_number;


-- 4. Seed Clean Case Events (Timeline History) for All 10 Cases (DLQ-0001 .. DLQ-0010)
INSERT INTO deliq.case_events (case_id, event_type, source_system, occurred_at, description, payload)
SELECT
    c.id,
    e.event_type,
    e.source_system,
    NOW() - (e.minutes_ago * INTERVAL '1 minute'),
    e.description,
    e.payload::jsonb
FROM (
    VALUES
        -- DLQ-0001 (SE-48213)
        ('DLQ-0001', 'PICK_SHORT', 'WMS', 35, 'WMS confirmed a short-pick on the timber line (10 of 12 packs picked)', '{"carrier": "DB Schenker", "sku": "TRB-45X95-3600", "quantity_ordered": 12, "quantity_picked": 10, "short_quantity": 2}'),
        ('DLQ-0001', 'AI_TRIAGE_CLASSIFIED', 'DELIQ', 34, 'Classified: B2B strategic account, SLA 90 min, urgency 86', '{"carrier": "DB Schenker", "urgency": 86}'),
        ('DLQ-0001', 'PATH_B_ROUTED', 'DELIQ', 33, 'Generated 3 ranked recovery options. Inter-depot reroute is cost-bearing, routed to Path B', '{"carrier": "DB Schenker", "path": "AMBER"}'),

        -- DLQ-0002 (DQ-2041)
        ('DLQ-0002', 'GPS_STALL_DETECTED', 'CARRIER', 42, 'Detection: GPS stalled 38 min, milestone “In transit” overdue', '{"carrier": "NordFrakt", "highway": "E4", "distance_km": 62}'),
        ('DLQ-0002', 'AI_TRIAGE_CLASSIFIED', 'DELIQ', 41, 'Classified: B2B strategic account, SLA 95 min, urgency 96', '{"carrier": "NordFrakt", "urgency": 96}'),
        ('DLQ-0002', 'PATH_C_ROUTED', 'DELIQ', 40, 'Routed to Path C (vehicle breakdown). No autonomous action allowed', '{"carrier": "NordFrakt", "path": "RED"}'),

        -- DLQ-0003 (DQ-2038)
        ('DLQ-0003', 'PICK_SHORT', 'WMS', 28, 'Detection: pick confirmed 38/48 against order 48', '{"carrier": "Schenker", "ordered": 48, "picked": 38}'),
        ('DLQ-0003', 'AI_TRIAGE_CLASSIFIED', 'DELIQ', 27, 'Classified: B2B tier 2, SLA 3h 30m, urgency 81', '{"carrier": "Schenker", "urgency": 81}'),
        ('DLQ-0003', 'PATH_B_ROUTED', 'DELIQ', 26, 'Generated 3 fixes, ranked by speed, cost and chance of meeting deadline. Cost-bearing, so Path B', '{"carrier": "Schenker", "path": "AMBER"}'),

        -- DLQ-0004 (DQ-2036)
        ('DLQ-0004', 'DISPATCH_OVERDUE', 'TMS', 22, 'Detection: dispatch milestone 2h overdue', '{"carrier": "DB Schenker", "delay_minutes": 120}'),
        ('DLQ-0004', 'PATH_B_ROUTED', 'DELIQ', 21, 'Cost-bearing option found, sent for approval (Path B)', '{"carrier": "DB Schenker", "path": "AMBER"}'),

        -- DLQ-0005 (DQ-2033)
        ('DLQ-0005', 'HUB_SCAN_MISSED', 'CARRIER', 96, 'Detection: no hub scan for 6h', '{"carrier": "PostNord"}'),
        ('DLQ-0005', 'PATH_A_EXECUTED', 'DELIQ', 95, 'Path A: low-risk communication, sent ETA notification autonomously', '{"carrier": "PostNord", "cost": 0}'),
        ('DLQ-0005', 'AUDIT_LOGGED', 'DELIQ', 94, 'Within spending cap (€0). Logged in audit trail', '{"carrier": "PostNord"}'),

        -- DLQ-0006 (DQ-2031)
        ('DLQ-0006', 'MISSING_SITE_ACCESS', 'ERP', 140, 'Detection: required field “site access” empty', '{"carrier": "Bring", "missing_field": "gate_code"}'),
        ('DLQ-0006', 'PATH_A_OUTREACH', 'DELIQ', 139, 'Path A: sent request for missing information', '{"carrier": "Bring"}'),
        ('DLQ-0006', 'CUSTOMER_REPLY', 'MANUAL', 95, 'Customer replied with gate code (masked)', '{"carrier": "Bring", "verified": true}'),

        -- DLQ-0007 (DQ-2029)
        ('DLQ-0007', 'POD_DAMAGE_REPORTED', 'CARRIER', 18, 'Driver reported damage on site (photo attached)', '{"carrier": "NordFrakt", "damaged_units": 2}'),
        ('DLQ-0007', 'PATH_C_ROUTED', 'DELIQ', 17, 'High-value order, so Path C. Case brief prepared for account manager', '{"carrier": "NordFrakt", "path": "RED"}'),

        -- DLQ-0008 (DQ-2027)
        ('DLQ-0008', 'WEATHER_DELAY_ALERT', 'CARRIER', 30, 'Detection: ETA past slot by 90 min due to weather on E45', '{"carrier": "Schenker", "delay_minutes": 90}'),
        ('DLQ-0008', 'PATH_B_ROUTED', 'DELIQ', 29, 'B2B rescheduling needs dispatcher approval (Path B)', '{"carrier": "Schenker", "path": "AMBER"}'),

        -- DLQ-0009 (DQ-2024)
        ('DLQ-0009', 'PICKUP_SCAN_LATE', 'CARRIER', 75, 'Detection: minor delay before customer impact', '{"carrier": "PostNord", "delay_minutes": 40}'),
        ('DLQ-0009', 'PATH_A_EXECUTED', 'DELIQ', 74, 'Path A: status acknowledgement sent', '{"carrier": "PostNord", "cost": 0}'),

        -- DLQ-0010 (DQ-2044)
        ('DLQ-0010', 'BAY_STOCKOUT', 'WMS', 14, 'Detection: 4 of 20 structural steel lintels missing in bay B-04', '{"carrier": "NordFrakt", "short_qty": 4}'),
        ('DLQ-0010', 'PATH_B_ROUTED', 'DELIQ', 13, 'Strategic B2B site with crane slot at 13:00; ranked express recovery options for approval', '{"carrier": "NordFrakt", "path": "AMBER"}')
) AS e(case_number, event_type, source_system, minutes_ago, description, payload)
JOIN deliq.cases c ON c.case_number = e.case_number;

-- 5. Grant PostgREST Role Permissions & Reload Supabase Schema Cache
GRANT USAGE ON SCHEMA deliq TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA deliq TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA deliq TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA deliq TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
