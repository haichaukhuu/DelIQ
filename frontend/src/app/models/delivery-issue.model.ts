import { AiRemediationOption, UrgencyEvaluation } from './ai-engine.model';
import { CustomerSegment, SystemTelemetrySnapshot } from './delivery-order.model';

export type IssueHandlerMode =
  | 'AI Autonomous (Path A - Green)'
  | 'AI Assisted + Human Approval (Path B - Amber)'
  | 'Human Employee Led (Path C - Red)';

export type IssueResolutionState =
  | 'AI Resolving Automatically'
  | 'Waiting for Human Approval'
  | 'Human Employee Resolving'
  | 'Resolved by AI'
  | 'Resolved by Human Employee';

export type DeliveryIssueCategory =
  | 'Warehouse Short-Pick / Stockout'
  | 'Late Dispatch / Transit Delay'
  | 'Vehicle Breakdown or Site Failure'
  | 'Missing Site Access Information';

export type ResolutionProgressStep =
  | 'Order Tracked'
  | 'Issue Detected'
  | 'Urgency Classified'
  | 'AI Remedy Generated'
  | 'Governance Gate'
  | 'Executing Fix'
  | 'Resolved & Logged';

export interface DeliveryIssue {
  issueId: string;
  orderId: string;
  distributionCenterName: string;
  customerName: string;
  customerSegment: CustomerSegment;
  siteLocationCity: string;
  orderValueEuros: number;
  siteCrewImpactNote: string;
  issueCategory: DeliveryIssueCategory;
  issueTitle: string;
  issueDescription: string;
  handlerMode: IssueHandlerMode;
  resolutionState: IssueResolutionState;
  currentProgressStep: ResolutionProgressStep;
  assignedEmployeeOrAgentName: string;
  remainingSlaCountdownText: string;
  isSlaBreachImminent: boolean;
  urgencyEvaluation: UrgencyEvaluation;
  systemTelemetrySnapshots: SystemTelemetrySnapshot[];
  aiRemediationOptions: AiRemediationOption[];
  selectedRemediationOptionId: string;
  draftedCustomerMessage: string;
  customerContactInfo: string;
}

export interface NewIssueReportInput {
  orderId: string;
  reportedByRole: string;
  issueCategory: DeliveryIssueCategory;
  issueDescription: string;
}

