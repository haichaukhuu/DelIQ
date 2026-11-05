import { Injectable } from '@angular/core';
import { AiTriageEngineContract } from '../contracts/ai-triage-engine.contract';
import { TicketItem, TimelineEntry } from '../models';

/**
 * Placeholder implementation of AiTriageEngineContract.
 * Simulates AI Engine execution write-back and rejection re-planning until the backend AI Engine is integrated.
 */
@Injectable()
export class PlaceholderAiTriageEngineService implements AiTriageEngineContract {
  buildApprovalTimelineEntries(
    ticket: TicketItem,
    selectedRecommendationIndex: number,
    timestampText: string
  ): TimelineEntry[] {
    // TODO (Backend AI Engine): POST /api/ai-engine/tickets/{id}/approve to trigger ERP/WMS/TMS write-back & customer dispatch.
    const selectedRecommendation =
      ticket.recs[selectedRecommendationIndex] ?? ticket.recs[0];
    const approvedTitle = selectedRecommendation
      ? selectedRecommendation.title
      : 'Selected recommendation';

    return [
      {
        time: timestampText,
        actor: 'Dispatcher',
        text: `Approved: ${approvedTitle}`,
        cls: 'hu',
      },
      {
        time: timestampText,
        actor: 'System',
        text: 'Action executed, customer message sent, write-back logged',
        cls: 'ai',
      },
    ];
  }

  buildRejectionTimelineEntries(
    _ticket: TicketItem,
    rejectionReason: string,
    timestampText: string
  ): TimelineEntry[] {
    // TODO (Backend AI Engine): POST /api/ai-engine/tickets/{id}/reject to log override reason and trigger AI re-ranking.
    return [
      {
        time: timestampText,
        actor: 'Dispatcher',
        text: `Rejected recommendation. Reason: ${rejectionReason}`,
        cls: 'no',
      },
      {
        time: timestampText,
        actor: 'AI',
        text: 'Generating a new ranked plan from the reason given',
        cls: 'ai',
      },
    ];
  }
}
