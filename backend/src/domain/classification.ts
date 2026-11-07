import type { DeliverySnapshot, DetectedException, Path, RecommendationDraft } from './types.js';
import type { Policy } from './policy.js';
import { stricterPath } from './policy.js';

export interface Classification {
  path: Path;
  reasons: string[];
  urgency: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function assessRisk(snapshot: DeliverySnapshot, exception: DetectedException, policy: Policy, now = new Date(), killSwitch = false): Classification {
  const end = new Date(snapshot.promisedWindow.end).getTime();
  const sla = Math.round((end - now.getTime()) / 60000);
  const valueEur = snapshot.order.valueSek / policy.sekPerEur;
  const reasons: string[] = [];
  const red = policy.red.strictTiers.includes(snapshot.order.customerTier) || valueEur > policy.red.orderValueEur ||
    Boolean(snapshot.order.safetyFlag || exception.shortLines.some((line) => line.safetyFlag)) ||
    (snapshot.order.customerType === 'B2B' && sla < policy.amber.minSlaMin) || sla < 0 ||
    exception.dataConfidence < policy.amber.minConfidence;
  if (snapshot.order.customerTier === 'STRATEGIC') reasons.push('Strategic account');
  if (valueEur > policy.red.orderValueEur) reasons.push('Order value exceeds €5,000');
  if (snapshot.order.safetyFlag) reasons.push('Safety flag');
  if (sla < policy.amber.minSlaMin) reasons.push(sla < 0 ? 'SLA breached' : 'B2B SLA under 20 minutes');
  if (exception.dataConfidence < policy.amber.minConfidence) reasons.push('Low data confidence');
  if (red) return finish('RED', reasons, snapshot, exception, sla);
  const green = sla >= policy.green.minSlaMin && exception.dataConfidence >= policy.green.minConfidence &&
    exception.type === 'TRANSIT_DELAY' && Math.max(0, -sla) <= policy.green.maxDelayMin && !killSwitch;
  if (!green) {
    if (exception.type === 'SHORT_PICK' || exception.type === 'STOCKOUT') reasons.push('Short-pick or stockout');
    if (exception.type === 'LATE_DISPATCH') reasons.push('Late dispatch');
    if (exception.type === 'DELIVERY_FAILURE') reasons.push('Failed delivery');
    if (exception.type === 'TRANSIT_DELAY' && sla < policy.green.minSlaMin) reasons.push('Delay or limited SLA');
    if (exception.dataConfidence < policy.green.minConfidence) reasons.push('Confidence under 90');
    if (snapshot.order.customerTier === 'KEY' && snapshot.order.customerType === 'B2B' && exception.type !== 'TRANSIT_DELAY') reasons.push('Key B2B account');
    if (killSwitch) reasons.push('Kill switch active');
  }
  return finish(green ? 'GREEN' : 'AMBER', reasons, snapshot, exception, sla);
}

function finish(path: Path, reasons: string[], snapshot: DeliverySnapshot, exception: DetectedException, sla: number): Classification {
  const tierScore = snapshot.order.customerTier === 'STRATEGIC' ? 20 : snapshot.order.customerTier === 'KEY' ? 12 : 5;
  const valueScore = Math.min(15, snapshot.order.valueSek / 11 / 5000 * 15);
  const severityScore = exception.severityHint === 'CRITICAL' ? 20 : exception.severityHint === 'HIGH' ? 15 : exception.severityHint === 'MEDIUM' ? 10 : 5;
  const urgency = Math.max(0, Math.min(100, 45 * Math.max(0, Math.min(1, (60 - sla) / 60)) + tierScore + valueScore + severityScore));
  const severity = urgency >= 80 ? 'CRITICAL' : urgency >= 60 ? 'HIGH' : urgency >= 35 ? 'MEDIUM' : 'LOW';
  return { path, reasons, urgency: Math.round(urgency), severity };
}

export function pathForAction(action: RecommendationDraft, classification: Classification, policy: Policy): Path {
  let actionPath: Path = action.actionType === 'ESCALATE' ? 'RED' : action.estimatedCostEur > policy.amber.maxCostEur ? 'RED' : action.estimatedCostEur === 0 && classification.path === 'GREEN' ? 'GREEN' : 'AMBER';
  return stricterPath(classification.path, actionPath);
}
