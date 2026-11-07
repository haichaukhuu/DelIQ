import { customerMessage } from './messages.js';
import { pathForAction, type Classification } from './classification.js';
import type { Policy } from './policy.js';
import type { DeliverySnapshot, DetectedException, Path, RecommendationDraft } from './types.js';

function distance(from: string, to: string, policy: Policy): number | null {
  return policy.dcDistancesKm[`${from}-${to}`] ?? policy.dcDistancesKm[`${to}-${from}`] ?? null;
}

export function buildOptions(snapshot: DeliverySnapshot, exception: DetectedException, policy: Policy): RecommendationDraft[] {
  const options: RecommendationDraft[] = [];
  const eta = snapshot.delivery?.currentEta ?? snapshot.promisedWindow.end;
  if (exception.type === 'SHORT_PICK' || exception.type === 'STOCKOUT') {
    const sources = Object.keys(snapshot.altStock).filter((dc) => exception.shortLines.every((line) => (snapshot.altStock[dc]?.[line.sku] ?? 0) >= line.orderedQuantity - line.pickedQuantity));
    for (const source of sources) {
      const km = distance(source, snapshot.distributionCenterCode, policy);
      if (km === null) continue;
      const cost = policy.costs.transferBaseEur + km * policy.costs.transferPerKmEur;
      options.push({ key: `transfer-${source}`, actionType: 'REROUTE', title: `Transfer missing items from ${source}`, rationale: 'Another distribution centre has stock for every short line.', proposedMessage: customerMessage('transfer', snapshot, eta), estimatedCostEur: cost, probabilityOfOnTime: 92, meetsPromisedWindow: new Date(eta).getTime() <= new Date(snapshot.promisedWindow.end).getTime(), confidence: exception.dataConfidence, etaAt: new Date(eta).toISOString(), params: { sourceDc: source, distanceKm: km } });
    }
    if (exception.shortLines.some((line) => line.pickedQuantity > 0)) options.push({ key: 'split-delivery', actionType: 'RESCHEDULE', title: 'Split delivery', rationale: 'Deliver picked lines now and make a second drop for the balance.', proposedMessage: customerMessage('split', snapshot), estimatedCostEur: policy.costs.secondDropEur, probabilityOfOnTime: 80, meetsPromisedWindow: true, confidence: exception.dataConfidence });
    options.push({ key: 'full-reschedule', actionType: 'RESCHEDULE', title: 'Reschedule complete order', rationale: 'Wait for full availability before dispatch.', proposedMessage: customerMessage('reschedule', snapshot), estimatedCostEur: 0, probabilityOfOnTime: 55, meetsPromisedWindow: false, confidence: exception.dataConfidence });
  } else if (exception.type === 'LATE_DISPATCH') {
    options.push({ key: 'backup-carrier', actionType: 'REROUTE', title: 'Use backup carrier', rationale: 'A backup carrier can reduce the dispatch delay.', proposedMessage: customerMessage('backup', snapshot), estimatedCostEur: policy.costs.backupCarrierEur, probabilityOfOnTime: 78, meetsPromisedWindow: true, confidence: exception.dataConfidence });
    options.push({ key: 'honest-eta', actionType: 'NOTIFY_CUSTOMER', title: 'Notify with revised ETA', rationale: 'Communicate the current honest estimate without changing the route.', proposedMessage: customerMessage('delay', snapshot, eta), estimatedCostEur: 0, probabilityOfOnTime: 40, meetsPromisedWindow: false, confidence: exception.dataConfidence });
  } else if (exception.type === 'TRANSIT_DELAY') {
    options.push({ key: 'notify-delay', actionType: 'NOTIFY_CUSTOMER', title: 'Notify customer of delay', rationale: 'Provide the latest ETA and preserve an audit trail.', proposedMessage: customerMessage('delay', snapshot, eta), estimatedCostEur: 0, probabilityOfOnTime: 70, meetsPromisedWindow: false, confidence: exception.dataConfidence });
    if (new Date(eta).getTime() > new Date(snapshot.promisedWindow.end).getTime()) options.push({ key: 'agree-later-slot', actionType: 'RESCHEDULE', title: 'Agree a later delivery slot', rationale: 'The current ETA cannot meet the promised window.', proposedMessage: customerMessage('reschedule', snapshot), estimatedCostEur: 0, probabilityOfOnTime: 90, meetsPromisedWindow: true, confidence: exception.dataConfidence });
    if (snapshot.customer?.craneRequired || snapshot.delivery?.vehicleType?.toUpperCase().includes('CRANE')) options.push({ key: 'request-site-readiness', actionType: 'REQUEST_INFORMATION', title: 'Request gate and crane readiness', rationale: 'Confirm site access before the delayed truck arrives.', proposedMessage: customerMessage('site', snapshot), estimatedCostEur: 0, probabilityOfOnTime: 85, meetsPromisedWindow: true, confidence: exception.dataConfidence });
  } else if (exception.type === 'DELIVERY_FAILURE') {
    options.push({ key: 'redelivery', actionType: 'RESCHEDULE', title: 'Redeliver next business morning', rationale: 'The failed delivery needs a new booked attempt.', proposedMessage: customerMessage('redelivery', snapshot), estimatedCostEur: policy.costs.redeliveryEur, probabilityOfOnTime: 88, meetsPromisedWindow: false, confidence: exception.dataConfidence });
  }
  return options;
}

export function rankOptions(options: RecommendationDraft[]): RecommendationDraft[] {
  return [...options].sort((a, b) => Number(b.actionType === 'ESCALATE') - Number(a.actionType === 'ESCALATE') ||
    Number(b.meetsPromisedWindow) - Number(a.meetsPromisedWindow) ||
    b.probabilityOfOnTime - a.probabilityOfOnTime || a.estimatedCostEur - b.estimatedCostEur);
}

export function triage(snapshot: DeliverySnapshot, exception: DetectedException, classification: Classification, policy: Policy): { recommendations: RecommendationDraft[]; casePath: Path } {
  let options = buildOptions(snapshot, exception, policy);
  if (classification.path === 'RED' || options.length === 0) options = [{ key: 'escalate', actionType: 'ESCALATE', title: `Escalate to ${snapshot.order.contactName ?? 'dispatcher'} ${snapshot.order.contactPhone ?? ''}`.trim(), rationale: 'A human decision is required for this case.', proposedMessage: customerMessage('escalation', snapshot), estimatedCostEur: 0, probabilityOfOnTime: 0, meetsPromisedWindow: false, confidence: classification.path === 'RED' ? 100 : 0 }, ...options];
  const ranked = rankOptions(options).map((option) => ({ ...option, path: pathForAction(option, classification, policy) }));
  return { recommendations: ranked, casePath: ranked[0]?.path ?? classification.path };
}
