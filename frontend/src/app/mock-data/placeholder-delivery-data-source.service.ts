import { Injectable } from '@angular/core';
import { DeliveryDataSourceContract } from '../contracts/delivery-data-source.contract';
import { DeliveryIssue, DeliveryOrder, ResolutionActivityLog } from '../models';
import { MOCK_DELIVERY_ISSUES } from './mock-delivery-issues.data';
import { MOCK_DELIVERY_ORDERS } from './mock-delivery-orders.data';
import { MOCK_RESOLUTION_LOGS } from './mock-resolution-logs.data';

/**
 * Placeholder data source that injects mock data into the application.
 * Replace this provider in app.config.ts when connecting the real backend API.
 */
@Injectable()
export class PlaceholderDeliveryDataSourceService implements DeliveryDataSourceContract {
  getInitialOrders(): DeliveryOrder[] {
    // TODO (Backend): Replace with HTTP GET /api/orders
    return structuredClone(MOCK_DELIVERY_ORDERS);
  }

  getInitialIssues(): DeliveryIssue[] {
    // TODO (Backend): Replace with HTTP GET /api/issues
    return structuredClone(MOCK_DELIVERY_ISSUES);
  }

  getInitialResolutionLogs(): ResolutionActivityLog[] {
    // TODO (Backend): Replace with HTTP GET /api/resolution-logs
    return structuredClone(MOCK_RESOLUTION_LOGS);
  }
}

