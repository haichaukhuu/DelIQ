import { assertQuery, deliqDb } from '../supabase.js';
import { stockholmTime } from '../domain/messages.js';

export async function toTicketView(row: any, details: { recommendations: any[]; events: any[]; audit: any[] }): Promise<any> {
  const path = row.autonomy_path;
  const recommendations = details.recommendations.map((recommendation) => ({
    id: recommendation.id, title: recommendation.title, etaText: recommendation.eta_at ? stockholmTime(recommendation.eta_at) : 'Re-plan required',
    cost: Number(recommendation.estimated_cost), probability: Number(recommendation.probability_of_on_time ?? 0),
    message: recommendation.proposed_message ?? '', rationale: recommendation.rationale ?? '', path: recommendation.autonomy_path, status: recommendation.status,
  }));
  return {
    id: row.case_number, caseId: row.id, orderNumber: row.source_order_number, name: row.title, customerType: row.customer_type,
    customerTier: row.customer_tier, exceptionType: row.exception_type, severity: row.severity, path, status: row.status,
    displayStatus: row.status === 'PENDING_APPROVAL' ? 'Awaiting approval' : path === 'RED' && row.status === 'OPEN' ? 'Human-led' : path === 'GREEN' && row.status === 'RESOLVED' ? 'Auto-resolved' : row.status,
    orderValueSek: Number(row.order_value ?? 0), currentEta: row.current_eta, dueAt: row.due_at, urgency: Number(row.urgency_score),
    classification: row.classification ?? {}, recommendations, timeline: [...details.events, ...details.audit].sort((a, b) => Date.parse(b.occurred_at ?? b.created_at) - Date.parse(a.occurred_at ?? a.created_at)).map((item) => ({ time: stockholmTime(item.occurred_at ?? item.created_at), actor: item.actor ?? item.source_system, text: item.description ?? item.action })),
  };
}

export async function loadTickets(): Promise<any[]> {
  const cases = assertQuery(await deliqDb.from('cases').select('*').not('status', 'in', '("CLOSED","DISMISSED")').order('urgency_score', { ascending: false }));
  return Promise.all(cases.map(async (row: any) => {
    const [recommendations, events, audit] = await Promise.all([
      deliqDb.from('recommendations').select('*').eq('case_id', row.id).order('rank'),
      deliqDb.from('case_events').select('*').eq('case_id', row.id),
      deliqDb.from('audit_log').select('*').eq('case_id', row.id),
    ]);
    return toTicketView(row, { recommendations: assertQuery(recommendations), events: assertQuery(events), audit: assertQuery(audit) });
  }));
}
