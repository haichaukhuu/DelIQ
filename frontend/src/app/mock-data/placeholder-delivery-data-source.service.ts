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
