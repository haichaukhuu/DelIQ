import { assertQuery, deliqDb } from '../supabase.js';

export async function loadKpis(): Promise<Record<string, unknown>> {
  const detail = assertQuery<Record<string, any>>(await deliqDb.from('v_kpi_detail').select('*').single());
  return { ...detail, estimated_hours_saved: Number(detail.auto_resolved ?? 0) * 0.75, estimated_hours_saved_label: 'Estimate based on 0.75 hours per assisted case' };
}
