import { deliqDb, assertQuery } from '../supabase.js';
import { mergePolicy, type Policy } from '../domain/policy.js';
import { writeAudit } from './audit.js';
import { config } from '../config.js';

export interface Settings {
  killSwitch: { enabled: boolean };
  autonomyEnabled: { green: boolean; amber: boolean; red: boolean };
  policy: Policy;
  llmEnabled: boolean;
  demoEnabled: boolean;
  scenarios: string[];
}

export async function loadSettings(): Promise<Settings> {
  const rows = assertQuery<Array<{ key: string; value: unknown }>>(await deliqDb.from('app_settings').select('key,value'));
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value as Record<string, unknown>]));
  return {
    killSwitch: { enabled: Boolean(values.kill_switch?.enabled) },
    autonomyEnabled: { green: values.autonomy_enabled?.green !== false, amber: values.autonomy_enabled?.amber !== false, red: values.autonomy_enabled?.red === true },
    policy: mergePolicy(values.policy as Partial<Policy> | undefined),
    llmEnabled: Boolean(process.env.ANTHROPIC_API_KEY),
    demoEnabled: process.env.DEMO_MODE !== 'false',
    scenarios: ['HERO_SHORT_PICK', 'STRATEGIC_SHORT_PICK', 'LATE_DISPATCH', 'MINOR_ETA_SLIP', 'TRANSIT_DELAY', 'DELIVERY_FAILURE'],
  };
}

export async function updateSettings(input: Partial<Pick<Settings, 'killSwitch' | 'autonomyEnabled' | 'policy'>>, actor: string): Promise<Settings> {
  for (const [key, value] of Object.entries({ kill_switch: input.killSwitch, autonomy_enabled: input.autonomyEnabled, policy: input.policy })) {
    if (value !== undefined) assertQuery(await deliqDb.from('app_settings').upsert({ key, value, updated_by: actor }).select().single());
  }
  await writeAudit(null, actor, 'UPDATE_SETTINGS', 'APP_SETTINGS', null, { summary: 'Governance settings updated', keys: Object.keys(input) });
  return loadSettings();
}
