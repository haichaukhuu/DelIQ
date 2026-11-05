import { InjectionToken } from '@angular/core';
import { TicketItem, TimelineEntry } from '../models';

/**
 * Abstraction for the Core AI Triage & Resolution Engine.
 * Currently bound to PlaceholderAiTriageEngineService; will be swapped for the real AI Engine later.
 */
export interface AiTriageEngineContract {
  buildApprovalTimelineEntries(
    ticket: TicketItem,
    selectedRecommendationIndex: number,
    timestampText: string
  ): TimelineEntry[];

  buildRejectionTimelineEntries(
    ticket: TicketItem,
    rejectionReason: string,
    timestampText: string
  ): TimelineEntry[];
}

export const AI_TRIAGE_ENGINE = new InjectionToken<AiTriageEngineContract>('AI_TRIAGE_ENGINE');
