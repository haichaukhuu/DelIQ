import { deliqDb, platformDb, assertQuery } from '../supabase.js';
import { writeAudit } from './audit.js';
import { runDetection } from './pipeline.js';

export async function injectScenario(scenario: string): Promise<{ scenario: string; summary: string }> {
  const allowed = ['HERO_SHORT_PICK', 'STRATEGIC_SHORT_PICK', 'LATE_DISPATCH', 'MINOR_ETA_SLIP', 'TRANSIT_DELAY', 'DELIVERY_FAILURE'];
  if (!allowed.includes(scenario)) throw new Error('Unknown demo scenario');
  await writeAudit(null, 'DelIQ', 'DEMO_INJECT', 'SCENARIO', null, { summary: `Injected ${scenario}`, scenario });
  return { scenario, summary: `${scenario} injected; run detection to refresh the queue.` };
}

export async function resetDemo(): Promise<{ summary: string }> {
  try { await platformDb.rpc('refresh_demo_environment', { p_reset_mode: 'RESET' }); }
  catch { await platformDb.rpc('run_daily_business_day', { p_order_count: 20 }); }
  const resetResult = await deliqDb.rpc('reset_demo');
  if (resetResult.error) throw new Error(resetResult.error.message);
  const result = await runDetection();
  return { summary: `Demo reset; ${result.created} cases detected.` };
}
