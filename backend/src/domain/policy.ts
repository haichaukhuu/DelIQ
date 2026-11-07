import type { Path } from './types.js';

export interface Policy {
  sekPerEur: number;
  green: { maxDelayMin: number; minSlaMin: number; minConfidence: number };
  amber: { minSlaMin: number; minConfidence: number; maxCostEur: number };
  red: { orderValueEur: number; strictTiers: string[] };
  detection: { lateDispatchGraceMin: number; etaSlipMin: number; staleDataMin: number; lookbackHours: number };
  costs: { redeliveryEur: number; backupCarrierEur: number; secondDropEur: number; transferBaseEur: number; transferPerKmEur: number };
  dailySpendCapEur: number;
  dcDistancesKm: Record<string, number>;
}

export const DEFAULT_POLICY: Policy = {
  sekPerEur: 11,
  green: { maxDelayMin: 30, minSlaMin: 60, minConfidence: 90 },
  amber: { minSlaMin: 20, minConfidence: 75, maxCostEur: 100 },
  red: { orderValueEur: 5000, strictTiers: ['STRATEGIC'] },
  detection: { lateDispatchGraceMin: 30, etaSlipMin: 15, staleDataMin: 180, lookbackHours: 72 },
  costs: { redeliveryEur: 86, backupCarrierEur: 60, secondDropEur: 45, transferBaseEur: 35, transferPerKmEur: 0.1 },
  dailySpendCapEur: 1000,
  dcDistancesKm: { 'GOT-STO': 470, 'MAL-STO': 610, 'GOT-MAL': 270 },
};

function merge<T extends object>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const result = { ...base, ...override } as T;
  for (const key of Object.keys(base) as Array<keyof T>) {
    const baseValue = base[key];
    const overrideValue = override[key];
    if (baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue) && overrideValue && typeof overrideValue === 'object') {
      (result as Record<string, unknown>)[String(key)] = merge(baseValue, overrideValue as Partial<typeof baseValue>);
    }
  }
  return result;
}

export function mergePolicy(override: Partial<Policy> | null | undefined): Policy {
  return merge(DEFAULT_POLICY, override ?? {});
}

export function stricterPath(a: Path, b: Path): Path {
  return [a, b].sort((left, right) => ({ GREEN: 0, AMBER: 1, RED: 2 }[right] - ({ GREEN: 0, AMBER: 1, RED: 2 }[left])))[0] as Path;
}
