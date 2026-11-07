import { platformCommercialDb, platformCoreDb, platformDb, assertQuery } from '../supabase.js';
import type { DeliverySnapshot } from '../domain/types.js';

const chunks = <T>(values: T[], size: number): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

export async function loadSnapshots(): Promise<DeliverySnapshot[]> {
  const orders = assertQuery<Array<Record<string, any>>>(await platformCommercialDb.from('erp_sales_orders').select('*').limit(1000));
  const result: DeliverySnapshot[] = [];
  for (const batch of chunks(orders, 150)) {
    const ids = batch.map((order) => order.id);
    const [customers, sites, centers, lines, fulfillments] = await Promise.all([
      platformCoreDb.from('erp_customers').select('*').in('id', batch.map((order) => order.customer_id)),
      platformCoreDb.from('erp_delivery_sites').select('*').in('id', batch.map((order) => order.delivery_site_id)),
      platformCoreDb.from('wms_distribution_centers').select('*').in('id', batch.map((order) => order.distribution_center_id)),
      platformCommercialDb.from('erp_sales_order_lines').select('*').in('sales_order_id', ids),
      platformDb.from('wms_fulfillments').select('*').in('sales_order_id', ids),
    ]);
    const customerMap = new Map(assertQuery(customers).map((row: any) => [row.id, row]));
    const siteMap = new Map(assertQuery(sites).map((row: any) => [row.id, row]));
    const centerMap = new Map(assertQuery(centers).map((row: any) => [row.id, row]));
    const orderLines = assertQuery(lines);
    const fulfillmentRows = assertQuery(fulfillments);
    for (const order of batch) {
      const fulfillment = fulfillmentRows.find((row: any) => row.sales_order_id === order.id);
      const fulfillmentLines = fulfillment ? assertQuery(await platformDb.from('wms_fulfillment_lines').select('*').eq('fulfillment_id', fulfillment.id)) : [];
      const delivery = fulfillment ? assertQuery<Record<string, any> | null>(await platformDb.from('tms_deliveries').select('*').eq('fulfillment_id', fulfillment.id).maybeSingle()) : null;
      const customer = customerMap.get(order.customer_id) as any;
      const site = siteMap.get(order.delivery_site_id) as any;
      const center = centerMap.get(order.distribution_center_id) as any;
      result.push({
        order: { id: order.id, number: order.order_number, valueSek: Number(order.order_value_sek ?? order.total_value_sek ?? 0), customerType: customer?.customer_type === 'B2B' ? 'B2B' : 'B2C', customerTier: customer?.tier ?? 'STANDARD', preferredLanguage: customer?.preferred_language ?? 'en', contactName: customer?.name, contactPhone: customer?.phone, safetyFlag: Boolean(order.safety_flag) },
        fulfillment: fulfillment ? { status: fulfillment.status, plannedDispatchAt: fulfillment.planned_dispatch_at, dispatchedAt: fulfillment.dispatched_at, updatedAt: fulfillment.updated_at, lines: fulfillmentLines.map((line: any) => ({ sku: line.sku, orderedQuantity: Number(line.quantity_ordered ?? orderLines.find((item: any) => item.id === line.sales_order_line_id)?.quantity ?? 0), pickedQuantity: Number(line.quantity_picked ?? 0), shortReason: line.short_reason })) } : null,
        delivery: delivery ? { number: delivery.delivery_number, status: delivery.status, plannedEta: delivery.planned_eta, currentEta: delivery.current_eta, trackingReference: delivery.tracking_reference, updatedAt: delivery.updated_at, vehicleType: delivery.vehicle_type } : null,
        promisedWindow: { start: order.promised_window_start ?? order.delivery_window_start, end: order.promised_window_end ?? order.delivery_window_end },
        altStock: {},
        distributionCenterCode: center?.code ?? order.distribution_center_code ?? 'STO',
        customer: { siteName: site?.name, accessNotes: site?.access_notes, craneRequired: Boolean(site?.crane_required) },
      });
    }
  }
  return result;
}
