export type CustomerSegment = 'B2B Trade Contractor' | 'B2C Individual Consumer';

export type DataFreshnessLevel = 'Live Sync' | 'Delayed Feed' | 'Status Unknown';

export type OrderHealthStatus =
  | 'On Schedule'
  | 'Issue Detected - AI Resolving'
  | 'Issue Detected - Awaiting Human Approval'
  | 'Issue Detected - Human Specialist Resolving'
  | 'Issue Resolved';

export interface SystemTelemetrySnapshot {
  systemName: 'ERP (Order & Billing)' | 'WMS (Warehouse Stock)' | 'TMS (Transport Route)' | 'Carrier GPS Feed';
  statusText: string;
  lastUpdatedText: string;
  freshnessLevel: DataFreshnessLevel;
  hasAnomalyWarning: boolean;
}

export interface DeliveryOrder {
  orderId: string;
  distributionCenterName: string;
  customerName: string;
  customerSegment: CustomerSegment;
  destinationCity: string;
  itemsSummary: string;
  orderValueEuros: number;
  promisedDeliveryWindow: string;
  orderHealthStatus: OrderHealthStatus;
  erpStatusSummary: string;
  wmsStatusSummary: string;
  tmsStatusSummary: string;
  carrierName: string;
  carrierStatusSummary: string;
  dataFreshness: DataFreshnessLevel;
  linkedIssueId: string | null;
}

