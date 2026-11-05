import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PlaceholderAiTriageEngineService } from '../mock-data/placeholder-ai-triage-engine.service';
import { PlaceholderDeliveryDataSourceService } from '../mock-data/placeholder-delivery-data-source.service';
import { AI_TRIAGE_ENGINE } from './ai-triage-engine.contract';
import { DELIVERY_DATA_SOURCE } from './delivery-data-source.contract';

/**
 * Provides the placeholder Data Source and AI Triage Engine implementations.
 * Swap these providers here when connecting the real backend API and real AI Engine.
 */
export function provideControlTowerDependencies(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: DELIVERY_DATA_SOURCE,
      useClass: PlaceholderDeliveryDataSourceService,
    },
    {
      provide: AI_TRIAGE_ENGINE,
      useClass: PlaceholderAiTriageEngineService,
    },
  ]);
}

