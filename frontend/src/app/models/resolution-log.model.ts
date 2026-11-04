import { IssueHandlerMode } from './delivery-issue.model';

export type ActorType = 'AI Engine (Autonomous)' | 'Human Dispatcher' | 'Human Fleet Specialist';

export interface ResolutionActivityLog {
  logId: string;
  timestampText: string;
  issueId: string;
  orderId: string;
  handlerMode: IssueHandlerMode;
  actorType: ActorType;
  actorName: string;
  actionSummary: string;
  wasAiRecommendationOverridden: boolean;
  overrideReasonText: string | null;
  rootCauseCategory: 'SKU Stockout' | 'Warehouse Picking Delay' | 'Carrier Transit Delay' | 'Site Access Info';
  depotOrStoreName: string;
  carrierName: string;
  affectedSkuName: string;
}

