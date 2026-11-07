import { assertQuery } from '../supabase.js';
import { deliqDb } from '../supabase.js';

export type AuditActor = 'DelIQ' | 'DelIQ AI' | string;

export async function writeAudit(caseId: string | null, actor: AuditActor, action: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}): Promise<void> {
  assertQuery(await deliqDb.from('audit_log').insert({
    case_id: caseId,
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: { ...details, summary: details.summary ?? action },
  }).select().single());
}
