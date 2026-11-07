import { InjectionToken } from '@angular/core';
import { TicketItem, TimelineEntry } from '../models';

/** Legacy presentation contract retained for non-workflow AI integrations. */
export interface AiTriageEngineContract {
  buildApprovalTimelineEntries(
    ticket: TicketItem,
    selectedRecommendationIndex: number,
    timestampText: string,
  ): TimelineEntry[];

  buildRejectionTimelineEntries(
    ticket: TicketItem,
    rejectionReason: string,
    timestampText: string,
  ): TimelineEntry[];
}

export const AI_TRIAGE_ENGINE = new InjectionToken<AiTriageEngineContract>('AI_TRIAGE_ENGINE');
