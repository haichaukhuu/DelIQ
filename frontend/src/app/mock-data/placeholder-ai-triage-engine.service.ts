import { Injectable } from '@angular/core';
import { AiTriageEngineContract } from '../contracts/ai-triage-engine.contract';
import {
  AiEngineAnalysisRequest,
  AiEngineTriageResult,
  IssueHandlerMode,
} from '../models';

/**
 * Placeholder implementation of the Core AI Triage Engine.
 * Simulates urgency evaluation, handler routing (AI vs Human), remedy ranking, and message drafting.
 * Replace this provider in app.config.ts when the real AI Engine is built.
 */
@Injectable()
export class PlaceholderAiTriageEngineService implements AiTriageEngineContract {
  analyzeDeliveryIssueAndGenerateRemedies(request: AiEngineAnalysisRequest): AiEngineTriageResult {
    // TODO (AI Engine Backend): Replace with real deterministic urgency rules + Bounded LLM Triage Engine call.
    const { order, reportInput } = request;

    const recommendedHandlerMode: IssueHandlerMode =
      reportInput.issueCategory === 'Missing Site Access Information'
        ? 'AI Autonomous (Path A - Green)'
        : reportInput.issueCategory === 'Vehicle Breakdown or Site Failure'
          ? 'Human Employee Led (Path C - Red)'
          : 'AI Assisted + Human Approval (Path B - Amber)';

    const isAutonomous = recommendedHandlerMode === 'AI Autonomous (Path A - Green)';
    const isHumanLed = recommendedHandlerMode === 'Human Employee Led (Path C - Red)';

    const customerTierPoints = order.customerSegment === 'B2B Trade Contractor' ? 40 : 12;
    const orderValuePoints = order.orderValueEuros >= 3000 ? 19 : 6;
    const deadlineProximityPoints = isAutonomous ? 10 : 27;
    const totalScoreOutOf100 = customerTierPoints + orderValuePoints + deadlineProximityPoints;

    const primaryOptionId = `OPT-${Date.now()}-1`;
    const secondaryOptionId = `OPT-${Date.now()}-2`;

    return {
      urgencyEvaluation: {
        totalScoreOutOf100,
        customerTierPoints,
        orderValuePoints,
        deadlineProximityPoints,
        reasoningSummary: `${order.customerSegment} (+${customerTierPoints}), Order €${order.orderValueEuros} (+${orderValuePoints}), SLA Proximity (+${deadlineProximityPoints})`,
      },
      recommendedHandlerMode,
      recommendedOptionId: primaryOptionId,
      generatedOptions: [
        {
          optionId: primaryOptionId,
          optionTitle: isAutonomous
            ? 'AI Auto-Action: Send Automated ETA & Access Prompt to Customer'
            : isHumanLed
              ? 'Human Specialist Action: Dispatch Emergency Recovery Fleet & Call Site Manager'
              : 'AI Recommended Fix: Expedite Replacement / Express Van Supplement + Notify Foreman',
          actionPlanDescription:
            'Placeholder AI Engine remedy: Synthesizes ERP order priority, WMS alternate stock, and TMS route delay to protect the delivery window.',
          estimatedTimeSavedText: isAutonomous ? 'Prevents site access stall' : 'Saves 35 mins crew wait time',
          estimatedExtraCostEuros: isAutonomous ? 0 : isHumanLed ? 240 : 40,
          deadlineSuccessProbabilityPercent: isHumanLed ? 55 : 92,
          isRecommendedByAi: true,
          governanceGateExplanation: `Routed to ${recommendedHandlerMode} by AI Governance Policy placeholder.`,
        },
        {
          optionId: secondaryOptionId,
          optionTitle: 'Alternative: Shift Delivery Window & Send Proactive ETA Notification Only',
          actionPlanDescription:
            'Keep standard transport schedule and immediately notify the customer foreman of the adjusted arrival time.',
          estimatedTimeSavedText: '0 mins saved (transparency only)',
          estimatedExtraCostEuros: 0,
          deadlineSuccessProbabilityPercent: 25,
          isRecommendedByAi: false,
          governanceGateExplanation: 'Requires human dispatcher sign-off before changing B2B SLA window.',
        },
      ],
      draftedCustomerMessage: `Hi (${order.customerName} — ${order.destinationCity}), we detected a fulfillment update on order #${order.orderId} (${reportInput.issueCategory}) and have initiated our recovery plan to keep your delivery on track.`,
    };
  }
}

