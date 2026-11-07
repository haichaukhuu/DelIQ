import { InjectionToken } from '@angular/core';
import { TicketItem } from '../models';

/** Server-backed queue and workflow operations used by the dashboard store. */
export interface DeliveryDataSourceContract {
  loadTickets(): Promise<TicketItem[]>;
  loadKpis(): Promise<Record<string, unknown>>;
  loadSettings(): Promise<{ killSwitch: boolean; autonomousPathA: boolean; llmEnabled: boolean; demoEnabled: boolean; scenarios: string[] }>;
  updateSettings(input: { killSwitch?: boolean; autonomousPathA?: boolean }): Promise<void>;
  runDetection(): Promise<string>;
  injectScenario(scenario: string): Promise<string>;
  resetDemo(): Promise<string>;
  approve(ticketId: string, recommendationId: string | undefined, decidedBy: string): Promise<void>;
  reject(ticketId: string, recommendationId: string | undefined, decidedBy: string, reason: string): Promise<void>;
  takeOwnership(ticketId: string, ownerName: string): Promise<void>;
  resolve(ticketId: string, ownerName: string): Promise<void>;
}

export const DELIVERY_DATA_SOURCE = new InjectionToken<DeliveryDataSourceContract>('DELIVERY_DATA_SOURCE');
