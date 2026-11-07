import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { BackendDeliveryDataSourceService } from '../services/backend-delivery-data-source.service';
import { DELIVERY_DATA_SOURCE } from './delivery-data-source.contract';

/**
 * Bind the control tower to the server API. Rule-based classification and
 * workflow policy remain server-owned; the frontend only renders the result.
 */
export function provideControlTowerDependencies(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: DELIVERY_DATA_SOURCE,
      useClass: BackendDeliveryDataSourceService,
    },
  ]);
}
