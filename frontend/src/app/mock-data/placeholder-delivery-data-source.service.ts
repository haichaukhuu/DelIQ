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
  getInitialTickets(): TicketItem[] {
    // TODO (Backend): Replace with GET /api/tickets from the backend Control Tower API.
    return structuredClone(MOCK_TICKETS);
  }
}
