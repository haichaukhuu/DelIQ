import { DeliveryIssueCategory, IssueHandlerMode, NewIssueReportInput } from './delivery-issue.model';
import { DeliveryOrder } from './delivery-order.model';

export interface UrgencyEvaluation {
  totalScoreOutOf100: number;
  customerTierPoints: number;
  orderValuePoints: number;
  deadlineProximityPoints: number;
  reasoningSummary: string;
}

export interface AiRemediationOption {
  optionId: string;
  optionTitle: string;
  actionPlanDescription: string;
  estimatedTimeSavedText: string;
  estimatedExtraCostEuros: number;
  deadlineSuccessProbabilityPercent: number;
  isRecommendedByAi: boolean;
  governanceGateExplanation: string;
}

export interface AiEngineTriageResult {
  urgencyEvaluation: UrgencyEvaluation;
  recommendedHandlerMode: IssueHandlerMode;
  generatedOptions: AiRemediationOption[];
  recommendedOptionId: string;
  draftedCustomerMessage: string;
}

export interface AiEngineAnalysisRequest {
  order: DeliveryOrder;
  reportInput: NewIssueReportInput;
}

