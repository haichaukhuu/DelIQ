import { InjectionToken } from '@angular/core';
import { DeliveryIssue, DeliveryOrder, ResolutionActivityLog } from '../models';

/**
 * Abstraction for the Delivery Data Source (Orders, Issues, and Resolution Activity Logs).
 * Currently bound to PlaceholderDeliveryDataSourceService in /mock-data; will be swapped for real HTTP backend later.
 */
export interface DeliveryDataSourceContract {
  getInitialOrders(): DeliveryOrder[];
  getInitialIssues(): DeliveryIssue[];
  getInitialResolutionLogs(): ResolutionActivityLog[];
}

export const DELIVERY_DATA_SOURCE = new InjectionToken<DeliveryDataSourceContract>('DELIVERY_DATA_SOURCE');

