import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { assertQuery, deliqDb, platformCommercialDb, platformCoreDb, platformDb, } from './supabase.js';
import { bodyString, bodyUuid, stringQuery } from './validation.js';
const asyncRoute = (handler) => (request, response, next) => handler(request, response).catch(next);
function paramString(request, name) {
    const value = request.params[name];
    if (typeof value !== 'string' || value.trim() === '')
        throw new Error(`${name} is required`);
    return value;
}
const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/api/cases', asyncRoute(async (request, response) => {
    const status = stringQuery(request, 'status');
    const path = stringQuery(request, 'autonomyPath');
    const limit = Math.min(Number(request.query.limit ?? 100), 200);
    if (!Number.isInteger(limit) || limit < 1)
        throw new Error('limit must be a positive integer');
    let query = deliqDb.from('v_case_queue').select('*').limit(limit);
    if (status)
        query = query.eq('status', status);
    if (path)
        query = query.eq('autonomy_path', path);
    response.json(assertQuery(await query));
}));
app.get('/api/cases/:id', asyncRoute(async (request, response) => {
    const id = paramString(request, 'id');
    const caseRow = assertQuery(await deliqDb.from('cases').select('*').eq('id', id).single());
    const [events, recommendations, approvals, actions, audit] = await Promise.all([
        deliqDb.from('case_events').select('*').eq('case_id', id).order('occurred_at', { ascending: false }),
        deliqDb.from('recommendations').select('*').eq('case_id', id).order('rank'),
        deliqDb.from('approvals').select('*').eq('case_id', id).order('decided_at', { ascending: false }),
        deliqDb.from('actions').select('*').eq('case_id', id).order('executed_at', { ascending: false }),
        deliqDb.from('audit_log').select('*').eq('case_id', id).order('created_at', { ascending: false }),
    ]);
    response.json({
        case: caseRow,
        events: assertQuery(events),
        recommendations: assertQuery(recommendations),
        approvals: assertQuery(approvals),
        actions: assertQuery(actions),
        audit: assertQuery(audit),
    });
}));
app.get('/api/source/deliveries', asyncRoute(async (request, response) => {
    const orderNumber = stringQuery(request, 'orderNumber');
    const status = stringQuery(request, 'status');
    const limit = Math.min(Number(request.query.limit ?? 100), 500);
    let query = platformDb.from('v_delivery_overview').select('*').limit(limit);
    if (orderNumber)
        query = query.eq('order_number', orderNumber);
    if (status)
        query = query.eq('delivery_status', status);
    response.json(assertQuery(await query));
}));
app.get('/api/source/orders/:orderNumber', asyncRoute(async (request, response) => {
    const orderNumber = paramString(request, 'orderNumber');
    const order = assertQuery(await platformCommercialDb.from('erp_sales_orders')
        .select('*').eq('order_number', orderNumber).single());
    const [customer, deliverySite, distributionCenter, lines] = await Promise.all([
        platformCoreDb.from('erp_customers').select('*').eq('id', order.customer_id).single(),
        platformCoreDb.from('erp_delivery_sites').select('*').eq('id', order.delivery_site_id).single(),
        platformCoreDb.from('wms_distribution_centers').select('*').eq('id', order.distribution_center_id).single(),
        platformCommercialDb.from('erp_sales_order_lines').select('*').eq('sales_order_id', order.id).order('line_number'),
    ]);
    const fulfillment = assertQuery(await platformDb.from('wms_fulfillments')
        .select('*').eq('sales_order_id', order.id).maybeSingle());
    const fulfillmentLines = fulfillment
        ? assertQuery(await platformDb.from('wms_fulfillment_lines').select('*').eq('fulfillment_id', fulfillment.id))
        : [];
    const delivery = fulfillment
        ? assertQuery(await platformDb.from('tms_deliveries').select('*').eq('fulfillment_id', fulfillment.id).maybeSingle())
        : null;
    response.json({
        order: { ...order, customer: assertQuery(customer), delivery_site: assertQuery(deliverySite), distribution_center: assertQuery(distributionCenter) },
        lines: assertQuery(lines).map((line) => line),
        fulfillment: fulfillment ? { ...fulfillment, lines: fulfillmentLines, delivery } : null,
    });
}));
app.get('/api/kpis', asyncRoute(async (_request, response) => {
    const summary = assertQuery(await deliqDb.from('v_kpi_summary').select('*').single());
    response.json(summary);
}));
app.post('/api/cases/:id/ownership', asyncRoute(async (request, response) => {
    const ownerName = bodyString(request.body, 'ownerName', { required: true, maxLength: 120 });
    const id = paramString(request, 'id');
    const updated = assertQuery(await deliqDb.from('cases').update({ owner_name: ownerName, status: 'IN_PROGRESS' }).eq('id', id).select().single());
    await writeAudit(id, ownerName, 'TAKE_OWNERSHIP', 'CASE', id, { owner_name: ownerName });
    response.json(updated);
}));
app.post('/api/cases/:id/approvals', asyncRoute(async (request, response) => {
    const actor = bodyString(request.body, 'decidedBy', { required: true, maxLength: 120 });
    const reason = bodyString(request.body, 'reason', { maxLength: 1000 });
    const recommendationId = bodyUuid(request.body, 'recommendationId');
    const decision = bodyString(request.body, 'decision', { required: true });
    if (decision !== 'APPROVED' && decision !== 'REJECTED')
        throw new Error('decision must be APPROVED or REJECTED');
    const id = paramString(request, 'id');
    const approval = assertQuery(await deliqDb.from('approvals').insert({
        case_id: id, recommendation_id: recommendationId, decision, decided_by: actor, reason,
    }).select().single());
    const status = decision === 'APPROVED' ? 'RESOLVED' : 'OPEN';
    await assertQuery(await deliqDb.from('recommendations').update({
        status: decision === 'APPROVED' ? 'EXECUTED' : 'REJECTED',
    }).eq('id', recommendationId).eq('case_id', id).select().single());
    if (decision === 'APPROVED') {
        await assertQuery(await deliqDb.from('actions').insert({
            case_id: id,
            recommendation_id: recommendationId,
            action_type: 'APPROVED_RECOMMENDATION',
            execution_status: 'COMPLETED',
            executed_by: actor,
            result_summary: 'Recommendation approved by dispatcher.',
        }).select().single());
    }
    await assertQuery(await deliqDb.from('cases').update({ status, resolved_at: decision === 'APPROVED' ? new Date().toISOString() : null }).eq('id', id).select().single());
    await writeAudit(id, actor, `APPROVAL_${decision}`, 'RECOMMENDATION', recommendationId, { reason });
    response.status(201).json(approval);
}));
app.post('/api/issue-reports', asyncRoute(async (request, response) => {
    const reportedBy = bodyString(request.body, 'reportedBy', { required: true, maxLength: 120 });
    const description = bodyString(request.body, 'description', { required: true, maxLength: 4000 });
    const issueType = bodyString(request.body, 'issueType', { required: true, maxLength: 80 });
    const caseId = bodyString(request.body, 'caseId');
    const report = assertQuery(await deliqDb.from('issue_reports').insert({
        case_id: caseId ?? null, reported_by: reportedBy, issue_type: issueType, description,
        source_system: 'MANUAL',
    }).select().single());
    if (caseId)
        await writeAudit(caseId, reportedBy, 'CREATE_ISSUE_REPORT', 'ISSUE_REPORT', report.id, { issue_type: issueType });
    response.status(201).json(report);
}));
async function writeAudit(caseId, actor, action, entityType, entityId, details) {
    assertQuery(await deliqDb.from('audit_log').insert({
        case_id: caseId, actor, action, entity_type: entityType, entity_id: entityId, details,
    }).select().single());
}
app.use((_request, response) => response.status(404).json({ error: 'Not found' }));
app.use((error, _request, response, _next) => {
    response.status(400).json({ error: error.message });
});
export { app };
