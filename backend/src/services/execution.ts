import { assertQuery, deliqDb } from '../supabase.js';
import { loadSettings } from './settings.js';
import { writeAudit } from './audit.js';

type GateInput = { caseId: string; recommendationId: string; actor: string; approved?: boolean };

export async function prepare(input: GateInput): Promise<{ caseRow: any; recommendation: any; settings: Awaited<ReturnType<typeof loadSettings>> }> {
  const [caseResult, recommendationResult, settings] = await Promise.all([
    deliqDb.from('cases').select('*').eq('id', input.caseId).single(),
    deliqDb.from('recommendations').select('*').eq('id', input.recommendationId).eq('case_id', input.caseId).single(),
    loadSettings(),
  ]);
  const caseRow = assertQuery(caseResult);
  const recommendation = assertQuery(recommendationResult);
  if (['RESOLVED', 'CLOSED', 'DISMISSED'].includes(caseRow.status)) throw new Error('Case is not open');
  if (recommendation.status !== 'PROPOSED') throw new Error('Recommendation is no longer proposed');
  if (caseRow.autonomy_path === 'RED' || recommendation.action_type === 'ESCALATE') throw new Error('RED and escalation recommendations require human resolution');
  if (settings.killSwitch.enabled) throw new Error('Kill switch is active');
  if (caseRow.status === 'PENDING_APPROVAL' && !input.approved) throw new Error('Approval is required');
  const allowed = settings.autonomyEnabled[caseRow.autonomy_path.toLowerCase() as 'green' | 'amber' | 'red'];
  if (!allowed) throw new Error(`Autonomy is disabled for ${caseRow.autonomy_path}`);
  if (Number(recommendation.estimated_cost) > settings.policy.amber.maxCostEur) throw new Error('Recommendation exceeds per-action cap');
  return { caseRow, recommendation, settings };
}

export async function perform(input: GateInput & { mode: 'AUTONOMOUS' | 'APPROVED' }): Promise<any> {
  const { caseRow, recommendation } = await prepare(input);
  const action = assertQuery<Record<string, any>>(await deliqDb.from('actions').insert({
    case_id: input.caseId, recommendation_id: input.recommendationId, action_type: recommendation.action_type,
    execution_status: 'COMPLETED', executed_by: input.actor, external_reference: `SIM-${Date.now()}`, result_summary: recommendation.title,
  }).select().single());
  if (recommendation.proposed_message) {
    assertQuery(await deliqDb.from('customer_messages').insert({
      case_id: input.caseId, action_id: action.id, channel: 'SMS', recipient: caseRow.source_order_number,
      language: 'en', body: recommendation.proposed_message, sent_by: input.actor, mode: input.mode, status: 'SENT',
    }).select().single());
  }
  assertQuery(await deliqDb.from('recommendations').update({ status: 'EXECUTED' }).eq('id', input.recommendationId).select().single());
  assertQuery(await deliqDb.from('recommendations').update({ status: 'CANCELLED' }).eq('case_id', input.caseId).neq('id', input.recommendationId).eq('status', 'PROPOSED').select());
  const updated = assertQuery(await deliqDb.from('cases').update({ status: 'RESOLVED', resolved_at: new Date().toISOString(), resolution_summary: recommendation.title }).eq('id', input.caseId).select().single());
  await writeAudit(input.caseId, input.actor, 'EXECUTE_RECOMMENDATION', 'ACTION', action.id, { summary: recommendation.title, mode: input.mode });
  return updated;
}

export async function approveRecommendation(caseId: string, recommendationId: string, actor: string): Promise<any> {
  const prepared = await prepare({ caseId, recommendationId, actor, approved: true });
  assertQuery(await deliqDb.from('approvals').insert({ case_id: caseId, recommendation_id: recommendationId, decision: 'APPROVED', decided_by: actor }).select().single());
  return perform({ caseId, recommendationId, actor, approved: true, mode: 'APPROVED' });
}

export async function rejectRecommendation(caseId: string, recommendationId: string, actor: string, reason: string): Promise<any> {
  if (!reason.trim()) throw new Error('Rejection reason is required');
  const recommendation = assertQuery<Record<string, any>>(await deliqDb.from('recommendations').select('*').eq('id', recommendationId).eq('case_id', caseId).single());
  assertQuery(await deliqDb.from('approvals').insert({ case_id: caseId, recommendation_id: recommendationId, decision: 'REJECTED', decided_by: actor, reason }).select().single());
  assertQuery(await deliqDb.from('recommendations').update({ status: 'REJECTED' }).eq('id', recommendationId).select().single());
  const remaining = assertQuery(await deliqDb.from('recommendations').select('id').eq('case_id', caseId).eq('status', 'PROPOSED'));
  if (remaining.length === 0) {
    assertQuery(await deliqDb.from('cases').update({ autonomy_path: 'RED', status: 'OPEN' }).eq('id', caseId).select().single());
    await writeAudit(caseId, actor, 'ESCALATE_AFTER_REJECTION', 'CASE', caseId, { summary: 'All recommendations rejected' });
  }
  await writeAudit(caseId, actor, 'REJECT_RECOMMENDATION', 'RECOMMENDATION', recommendation.id, { summary: reason });
  return recommendation;
}

export async function resolveCase(caseId: string, actor: string): Promise<any> {
  const row = assertQuery<Record<string, any>>(await deliqDb.from('cases').select('autonomy_path').eq('id', caseId).single());
  if (row.autonomy_path !== 'RED') throw new Error('Only RED cases can be manually resolved');
  const updated = assertQuery(await deliqDb.from('cases').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', caseId).select().single());
  await writeAudit(caseId, actor, 'MANUAL_RESOLUTION', 'CASE', caseId, { summary: 'Human resolved RED case' });
  return updated;
}
