import { TicketItem, TicketPath, TicketSeverity, TicketStatus } from '../app/models';

interface DeliveryOverviewRow {
  delivery_id: number;
  delivery_number: string;
  delivery_status: string;
  fulfillment_status: string;
  order_number: string;
  customer_name: string;
  destination_city: string;
  carrier_name: string | null;
  current_eta: string | null;
}

interface SalesOrderRow {
  id: number;
  order_number: string;
  customer_id: number;
  promised_window_end: string;
  currency: string;
}

interface CustomerRow {
  id: number;
  customer_type: 'B2B' | 'B2C';
  tier: 'STRATEGIC' | 'KEY' | 'STANDARD';
}

interface OrderTotalRow {
  sales_order_id: number;
  total_amount: number | string;
}

interface DataPlatformConfig {
  url: string;
  serviceRoleKey: string;
}

function getConfig(): DataPlatformConfig {
  const url = process.env['SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for the data API.',
    );
  }

  return { url: url.replace(/\/$/, ''), serviceRoleKey };
}

async function getRows<T>(
  config: DataPlatformConfig,
  schema: string,
  relation: string,
  select: string,
): Promise<T[]> {
  const url = new URL(`${config.url}/rest/v1/${relation}`);
  url.searchParams.set('select', select);

  const response = await fetch(url, {
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Accept-Profile': schema,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase ${schema}.${relation} returned ${response.status}: ${body}`);
  }

  return (await response.json()) as T[];
}

function minutesUntil(promisedWindowEnd: string): number {
  return Math.max(0, Math.round((Date.parse(promisedWindowEnd) - Date.now()) / 60_000));
}

function classifyPath(
  customerType: CustomerRow['customer_type'],
  tier: CustomerRow['tier'],
  deliveryStatus: string,
  fulfillmentStatus: string,
  promisedWindowEnd: string,
): TicketPath {
  const minutes = minutesUntil(promisedWindowEnd);
  if (customerType === 'B2B' && (tier === 'STRATEGIC' || minutes <= 60)) {
    return 'C';
  }
  if (deliveryStatus === 'FAILED' || fulfillmentStatus === 'PICKING') {
    return 'B';
  }
  return 'A';
}

function classifySeverity(path: TicketPath, minutes: number): TicketSeverity {
  if (path === 'C') return 'Critical';
  if (path === 'B') return 'High';
  if (minutes <= 120) return 'Medium';
  return 'Low';
}

function classifyStatus(path: TicketPath, deliveryStatus: string): TicketStatus {
  if (deliveryStatus === 'DELIVERED') return 'Resolved';
  if (path === 'A') return 'Auto-resolved';
  if (path === 'B') return 'Awaiting approval';
  return 'Human-led';
}

export async function getDeliveryTickets(): Promise<TicketItem[]> {
  const config = getConfig();
  const [overview, orders, customers, totals] = await Promise.all([
    getRows<DeliveryOverviewRow>(
      config,
      'operations',
      'v_delivery_overview',
      'delivery_id,delivery_number,delivery_status,fulfillment_status,order_number,customer_name,destination_city,carrier_name,current_eta',
    ),
    getRows<SalesOrderRow>(
      config,
      'commercial',
      'erp_sales_orders',
      'id,order_number,customer_id,promised_window_end,currency',
    ),
    getRows<CustomerRow>(config, 'core', 'erp_customers', 'id,customer_type,tier'),
    getRows<OrderTotalRow>(config, 'commercial', 'v_order_totals', 'sales_order_id,total_amount'),
  ]);

  const ordersByNumber = new Map(orders.map((order) => [order.order_number, order]));
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const totalsByOrderId = new Map(
    totals.map((total) => [total.sales_order_id, Number(total.total_amount)]),
  );

  return overview.map((delivery) => {
    const order = ordersByNumber.get(delivery.order_number);
    if (!order) {
      throw new Error(`No sales order found for delivery ${delivery.delivery_number}.`);
    }

    const customer = customersById.get(order.customer_id);
    if (!customer) {
      throw new Error(`No customer found for order ${order.order_number}.`);
    }

    const minutes = minutesUntil(order.promised_window_end);
    const path = classifyPath(
      customer.customer_type,
      customer.tier,
      delivery.delivery_status,
      delivery.fulfillment_status,
      order.promised_window_end,
    );
    const total = totalsByOrderId.get(order.id) ?? 0;
    const issueType =
      delivery.fulfillment_status === 'PICKING'
        ? 'Short-pick / stockout'
        : delivery.delivery_status === 'FAILED'
          ? 'Delivery-day failure'
          : delivery.current_eta && Date.parse(delivery.current_eta) > Date.parse(order.promised_window_end)
            ? 'Transit delay'
            : 'Operational exception';

    return {
      id: order.order_number,
      name: `${delivery.delivery_number}, ${delivery.customer_name}`,
      tier: customer.customer_type,
      path,
      sev: classifySeverity(path, minutes),
      type: issueType,
      carrier: delivery.carrier_name ?? 'Unassigned',
      val: total,
      slaMinutes: minutes,
      urgencyScore: Math.min(
        100,
        Math.round((customer.customer_type === 'B2B' ? 45 : 20) + (100 - Math.min(minutes, 500) / 5)),
      ),
      status: classifyStatus(path, delivery.delivery_status),
      info: `${delivery.fulfillment_status} fulfilment, ${delivery.destination_city} delivery`,
      recs: [
        {
          title: path === 'A' ? 'Send updated delivery status' : 'Review and approve the recommended recovery',
          speedText: minutes <= 120 ? 'Before promised window' : 'Today',
          costText: 'Review required',
          successProbability: path === 'C' ? 70 : 85,
        },
      ],
      draft: `Hej, we are reviewing your ${issueType.toLowerCase()} for order ${order.order_number} and will update you shortly.`,
      tl: [
        {
          time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
          actor: 'System',
          text: `Read from ${delivery.delivery_number} in the source delivery platform`,
          cls: 'no',
        },
      ],
    };
  });
}
