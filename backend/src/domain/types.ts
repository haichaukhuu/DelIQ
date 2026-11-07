export type Path = 'GREEN' | 'AMBER' | 'RED';
export type ExceptionType =
  | 'SHORT_PICK'
  | 'STOCKOUT'
  | 'LATE_DISPATCH'
  | 'TRANSIT_DELAY'
  | 'DELIVERY_FAILURE'
  | 'OTHER';
export type ActionType =
  | 'NOTIFY_CUSTOMER'
  | 'REQUEST_INFORMATION'
  | 'RESCHEDULE'
  | 'REROUTE'
  | 'REPLACE_ORDER'
  | 'ESCALATE'
  | 'NO_ACTION';

export interface DeliveryLine {
  sku: string;
  description?: string;
  orderedQuantity: number;
  pickedQuantity: number;
  shortReason?: string | null;
  safetyFlag?: boolean;
}

export interface DeliverySnapshot {
  order: {
    id?: string | number;
    number: string;
    valueSek: number;
    customerType: 'B2B' | 'B2C';
    customerTier: 'STRATEGIC' | 'KEY' | 'STANDARD';
    preferredLanguage?: 'sv' | 'en';
    contactName?: string;
    contactPhone?: string;
    safetyFlag?: boolean;
  };
  fulfillment?: {
    status?: string;
    plannedDispatchAt?: string | Date | null;
    dispatchedAt?: string | Date | null;
    updatedAt?: string | Date | null;
    lines: DeliveryLine[];
  } | null;
  delivery?: {
    number?: string;
    status?: string;
    plannedEta?: string | Date | null;
    currentEta?: string | Date | null;
    trackingReference?: string | null;
    updatedAt?: string | Date | null;
    vehicleType?: string;
    distanceKm?: number;
  } | null;
  promisedWindow: { start: string | Date; end: string | Date };
  altStock: Record<string, Record<string, number>>;
  distributionCenterCode: string;
  customer?: { siteName?: string; accessNotes?: string; craneRequired?: boolean };
}

export interface DetectedException {
  type: ExceptionType;
  title: string;
  summary: string;
  rootCause: string;
  severityHint: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  occurredAt: string;
  dataConfidence: number;
  shortLines: DeliveryLine[];
}

export interface RecommendationDraft {
  key: string;
  actionType: ActionType;
  title: string;
  rationale: string;
  proposedMessage: string;
  estimatedCostEur: number;
  probabilityOfOnTime: number;
  meetsPromisedWindow: boolean;
  confidence: number;
  path?: Path;
  etaAt?: string;
  params?: Record<string, unknown>;
}
