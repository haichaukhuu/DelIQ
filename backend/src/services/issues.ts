import { assertQuery, deliqDb } from '../supabase.js';
import { writeAudit } from './audit.js';

const safetyTypes = new Set(['breakdown', 'safety incident', 'site refusal', 'road closure', 'damaged goods']);

export async function captureIssue(input: { reportedBy: string; description: string; issueType: string; orderNumber?: string }): Promise<any> {
  if (!input.reportedBy || !input.description || !input.issueType) throw new Error('reportedBy, description and issueType are required');
  const report = assertQuery<Record<string, any>>(await deliqDb.from('issue_reports').insert({ reported_by: input.reportedBy, description: input.description, issue_type: input.issueType, source_system: 'MANUAL' }).select().single());
  await writeAudit(null, input.reportedBy, 'CREATE_ISSUE_REPORT', 'ISSUE_REPORT', report.id, { summary: input.description, orderNumber: input.orderNumber });
  if (safetyTypes.has(input.issueType.toLowerCase())) await writeAudit(null, input.reportedBy, 'FORCE_PATH_RED', 'ISSUE_REPORT', report.id, { summary: 'Safety-type issue requires human handling' });
  return report;
}
