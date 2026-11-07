import { Injectable } from '@angular/core';
import { DeliveryDataSourceContract } from '../contracts/delivery-data-source.contract';
import { TicketItem } from '../models';
import { MOCK_TICKETS } from './mock-tickets.data';

/**
 * Placeholder implementation of DeliveryDataSourceContract backed by static mock data.
 * Replace this binding in control-tower.providers.ts when connecting to the backend API.
 */
@Injectable()
export class PlaceholderDeliveryDataSourceService implements DeliveryDataSourceContract {
  loadTickets(): Promise<TicketItem[]> {
    return Promise.resolve(structuredClone(MOCK_TICKETS));
  }

  loadKpis(): Promise<Record<string, unknown>> { return Promise.resolve({}); }
  loadSettings(): Promise<{ killSwitch: boolean; autonomousPathA: boolean; llmEnabled: boolean; demoEnabled: boolean; scenarios: string[] }> {
    return Promise.resolve({ killSwitch: false, autonomousPathA: true, llmEnabled: false, demoEnabled: true, scenarios: [] });
  }
  updateSettings(): Promise<void> { return Promise.resolve(); }
  runDetection(): Promise<string> { return Promise.resolve('Detection completed'); }
  injectScenario(scenario: string): Promise<string> { return Promise.resolve(`${scenario} injected`); }
  resetDemo(): Promise<string> { return Promise.resolve('Demo reset'); }

  approve(): Promise<void> {
    return Promise.resolve();
  }

  reject(): Promise<void> {
    return Promise.resolve();
  }

  takeOwnership(): Promise<void> {
    return Promise.resolve();
  }

  resolve(): Promise<void> {
    return Promise.resolve();
  }
}
