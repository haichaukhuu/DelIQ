import { InjectionToken } from '@angular/core';
import { TicketItem } from '../models';

/**
 * Abstraction for the Delivery Ticket Data Source.
 * Currently bound to PlaceholderDeliveryDataSourceService in /mock-data; will be swapped for the real HTTP backend later.
 */
export interface DeliveryDataSourceContract {
  getInitialTickets(): TicketItem[];
}

export const DELIVERY_DATA_SOURCE = new InjectionToken<DeliveryDataSourceContract>('DELIVERY_DATA_SOURCE');
