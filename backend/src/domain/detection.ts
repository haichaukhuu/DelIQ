import type { DeliverySnapshot, DetectedException } from './types.js';
import type { Policy } from './policy.js';

const date = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export function dataConfidence(snapshot: DeliverySnapshot, policy: Policy, now = new Date()): number {
  const delivery = snapshot.delivery;
  const fulfillment = snapshot.fulfillment;
  let score = 100;
  if (!delivery?.currentEta) score -= 15;
  if (!fulfillment?.dispatchedAt) score -= 10;
  if (!delivery?.trackingReference) score -= 10;
  const eta = date(delivery?.currentEta);
  const dispatched = date(fulfillment?.dispatchedAt);
  if (eta !== null && dispatched !== null && eta < dispatched) score -= 20;
  const updated = date(delivery?.updatedAt ?? fulfillment?.updatedAt);
  const inProgress = !['DELIVERED', 'CANCELLED'].includes(String(delivery?.status ?? '').toUpperCase());
  if (inProgress && updated !== null && now.getTime() - updated > policy.detection.staleDataMin * 60000) score -= 20;
  for (const line of snapshot.fulfillment?.lines ?? []) {
    if (line.pickedQuantity < line.orderedQuantity && !line.shortReason) score -= 10;
  }
  if (snapshot.fulfillment?.lines.some((line) => String(line.shortReason ?? '').toUpperCase() === 'OTHER')) score -= 10;
  return Math.max(0, score);
}

export function detectExceptions(snapshot: DeliverySnapshot, now = new Date(), policy: Policy): DetectedException[] {
  const status = String(snapshot.delivery?.status ?? snapshot.fulfillment?.status ?? '').toUpperCase();
  if (status === 'DELIVERED' || status === 'CANCELLED') return [];
  const windowEnd = date(snapshot.promisedWindow.end);
  if (windowEnd !== null && now.getTime() - windowEnd > policy.detection.lookbackHours * 3600000) return [];
  const fulfillment = snapshot.fulfillment;
  const delivery = snapshot.delivery;
  const confidence = dataConfidence(snapshot, policy, now);
  const occurredAt = new Date(now).toISOString();
  const shortLines = (fulfillment?.lines ?? []).filter((line) =>
    Boolean(line.shortReason) || (['PICKED', 'STAGED'].includes(String(fulfillment?.status).toUpperCase()) && line.pickedQuantity < line.orderedQuantity));
  const result: DetectedException[] = [];
  if (status === 'FAILED' || status === 'FAILURE') {
    return [{ type: 'DELIVERY_FAILURE', title: 'Delivery failed', summary: 'The carrier reported a failed delivery.', rootCause: 'Carrier delivery failure', severityHint: 'HIGH', occurredAt, dataConfidence: confidence, shortLines: [] }];
  }
  if (shortLines.length) {
    const stockout = shortLines.some((line) => String(line.shortReason ?? '').toUpperCase() === 'STOCKOUT');
    result.push({ type: stockout ? 'STOCKOUT' : 'SHORT_PICK', title: stockout ? 'Stockout' : 'Short-pick', summary: 'One or more ordered lines cannot be fulfilled from the planned distribution center.', rootCause: stockout ? 'Stockout during picking' : 'Short quantity confirmed during picking', severityHint: 'HIGH', occurredAt, dataConfidence: confidence, shortLines });
  }
  const plannedDispatch = date(fulfillment?.plannedDispatchAt);
  const dispatched = date(fulfillment?.dispatchedAt);
  const lateDispatch = plannedDispatch !== null && dispatched === null && now.getTime() - plannedDispatch > policy.detection.lateDispatchGraceMin * 60000;
  if (lateDispatch) result.push({ type: 'LATE_DISPATCH', title: 'Late dispatch', summary: 'The planned dispatch time has passed and the delivery has not left.', rootCause: 'Dispatch missed planned time', severityHint: 'HIGH', occurredAt, dataConfidence: confidence, shortLines: [] });
  const eta = date(delivery?.currentEta);
  const plannedEta = date(delivery?.plannedEta);
  const end = windowEnd;
  const breached = (end !== null && now.getTime() > end) || (eta !== null && end !== null && eta > end);
  const slip = eta !== null && plannedEta !== null && eta - plannedEta >= policy.detection.etaSlipMin * 60000;
  if ((breached || (slip && dispatched !== null)) && !(lateDispatch && dispatched === null)) {
    result.push({ type: 'TRANSIT_DELAY', title: 'Transit delay', summary: breached ? 'The current ETA misses the promised delivery window.' : 'The ETA slipped materially against the plan.', rootCause: 'Transit ETA variance', severityHint: breached ? 'HIGH' : 'MEDIUM', occurredAt, dataConfidence: confidence, shortLines: [] });
  }
  return result;
}
