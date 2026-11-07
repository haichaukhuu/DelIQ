import { assessRisk } from '../domain/classification.js';
import { detectExceptions } from '../domain/detection.js';
import { triage } from '../domain/recommendations.js';
import { deliqDb, assertQuery } from '../supabase.js';
import { loadSettings } from './settings.js';
import { loadSnapshots } from './snapshots.js';
import { writeAudit } from './audit.js';
import { perform } from './execution.js';

export async function runDetection(now = new Date()): Promise<{ created: number; skipped: number; autoResolved: number }> {
  const [settings, snapshots] = await Promise.all([loadSettings(), loadSnapshots()]);
  let created = 0; let skipped = 0; let autoResolved = 0;
  for (const snapshot of snapshots) {
    for (const exception of detectExceptions(snapshot, now, settings.policy)) {
      const deliveryNumber = snapshot.delivery?.number ?? null;
      const existing = assertQuery(await deliqDb.from('cases').select('*').eq('source_delivery_number', deliveryNumber).eq('exception_type', exception.type).maybeSingle());
      if (existing) { skipped++; continue; }
      const classification = assessRisk(snapshot, exception, settings.policy, now, settings.killSwitch.enabled);
      const triaged = triage(snapshot, exception, classification, settings.policy);
      const caseRow = assertQuery<Record<string, any>>(await deliqDb.from('cases').insert({
        case_number: assertQuery(await deliqDb.rpc('next_case_number')),
        source_order_id: snapshot.order.id, source_order_number: snapshot.order.number, source_delivery_number: deliveryNumber,
        customer_type: snapshot.order.customerType, customer_tier: snapshot.order.customerTier, exception_type: exception.type,
        severity: classification.severity, autonomy_path: triaged.casePath, status: triaged.casePath === 'AMBER' ? 'PENDING_APPROVAL' : 'OPEN',
        detected_at: exception.occurredAt, due_at: snapshot.promisedWindow.end, order_value: snapshot.order.valueSek,
        promised_window_start: snapshot.promisedWindow.start, promised_window_end: snapshot.promisedWindow.end, current_eta: snapshot.delivery?.currentEta,
        urgency_score: classification.urgency, title: exception.title, summary: exception.summary, root_cause: exception.rootCause,
        classification: { path: classification.path, reasons: classification.reasons }, context: snapshot, data_confidence: exception.dataConfidence,
      }).select().single());
      for (const [index, recommendation] of triaged.recommendations.entries()) {
        assertQuery(await deliqDb.from('recommendations').insert({
          case_id: caseRow.id, rank: index + 1, action_type: recommendation.actionType, title: recommendation.title,
          rationale: recommendation.rationale, proposed_message: recommendation.proposedMessage, estimated_cost: recommendation.estimatedCostEur,
          probability_of_on_time: recommendation.probabilityOfOnTime, meets_promised_window: recommendation.meetsPromisedWindow,
          autonomy_path: recommendation.path, confidence: recommendation.confidence, eta_at: recommendation.etaAt, params: recommendation.params ?? {},
        }).select().single());
      }
      await writeAudit(caseRow.id, 'DelIQ', 'DETECT', 'CASE', caseRow.id, { summary: exception.title });
      await writeAudit(caseRow.id, 'DelIQ', 'CLASSIFY', 'CASE', caseRow.id, { summary: `${triaged.casePath}: ${classification.reasons.join(', ')}` });
      await writeAudit(caseRow.id, 'DelIQ', 'RECOMMEND', 'CASE', caseRow.id, { summary: `${triaged.recommendations.length} rule-generated options` });
      created++;
      const top = triaged.recommendations[0];
      if (triaged.casePath === 'GREEN' && settings.autonomyEnabled.green && !settings.killSwitch.enabled && top) {
        await perform({ caseId: caseRow.id, recommendationId: assertQuery<Record<string, any>>(await deliqDb.from('recommendations').select('id').eq('case_id', caseRow.id).eq('rank', 1).single()).id, actor: 'DelIQ', mode: 'AUTONOMOUS' });
        autoResolved++;
      }
    }
  }
  return { created, skipped, autoResolved };
}
