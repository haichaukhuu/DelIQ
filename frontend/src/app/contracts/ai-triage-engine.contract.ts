import { InjectionToken } from '@angular/core';
import { AiEngineAnalysisRequest, AiEngineTriageResult } from '../models';

/**
 * Abstraction for the Core AI Triage Engine.
 * Currently bound to PlaceholderAiTriageEngineService; will be swapped for the real AI Engine later.
 */
export interface AiTriageEngineContract {
  analyzeDeliveryIssueAndGenerateRemedies(request: AiEngineAnalysisRequest): AiEngineTriageResult;
}

export const AI_TRIAGE_ENGINE = new InjectionToken<AiTriageEngineContract>('AI_TRIAGE_ENGINE');
