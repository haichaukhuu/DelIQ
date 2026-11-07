import { TicketItem } from '../models/ticket.model';

// Static demo data used by the new dashboard UI. Keeping separate from other mock data
// to simplify later backend wiring and A/B testing.
export const MOCK_TICKETS: TicketItem[] = [
  {
    id: 'DQ-2041',
    name: 'Plasterboard pallets, Bergström Bygg site',
    tier: 'B2B',
    path: 'C',
    sev: 'Critical',
    type: 'Vehicle breakdown',
    carrier: 'NordFrakt',
    val: 48200,
    slaMinutes: 95,
    urgencyScore: 96,
    status: 'Human-led',
    info: 'Truck stopped on E4, 62 km from site. Crew of 6 waits on site.',
    recs: [],
    draft: '',
    tl: [
      { time: '07:42', actor: 'AI', text: 'Detection: GPS stalled 38 min, milestone “In transit” overdue', cls: 'ai' },
      { time: '07:44', actor: 'AI', text: 'Classified: B2B strategic account, SLA 95 min, urgency 96', cls: 'ai' },
      { time: '07:44', actor: 'AI', text: 'Routed to Path C (vehicle breakdown). No autonomous action allowed', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2038',
    name: 'Insulation rolls, Hallberg Entreprenad',
    tier: 'B2B',
    path: 'B',
    sev: 'High',
    type: 'Short-pick / stockout',
    carrier: 'Schenker',
    val: 12900,
    slaMinutes: 210,
    urgencyScore: 81,
    status: 'Awaiting approval',
    info: 'Warehouse picked 38 of 48 rolls. Stock shows 0 until restock tomorrow 06:00.',
    recs: [
      { title: 'Split delivery: ship 38 today, 10 tomorrow 08:00', speedText: 'Today 14:00', costText: '€120', successProbability: 84 },
      { title: 'Send replacement order from Örebro DC', speedText: 'Today 17:30', costText: '€290', successProbability: 72 },
      { title: 'Reschedule full delivery to tomorrow', speedText: 'Tomorrow 08:00', costText: '€0', successProbability: 93 }
    ],
    draft: 'Hej, 10 of 48 rolls are out of stock. We can deliver 38 today at 14:00 and the rest tomorrow at 08:00. Please confirm.',
    tl: [
      { time: '08:05', actor: 'AI', text: 'Detection: pick confirmed 38/48 against order 48', cls: 'ai' },
      { time: '08:06', actor: 'AI', text: 'Classified: B2B tier 2, SLA 3h 30m, urgency 81', cls: 'ai' },
      { time: '08:06', actor: 'AI', text: 'Generated 3 fixes, ranked by speed, cost and chance of meeting deadline. Cost-bearing, so Path B', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2036',
    name: 'Roof battens, Nyström Tak AB',
    tier: 'B2B',
    path: 'B',
    sev: 'High',
    type: 'Late dispatch',
    carrier: 'DB Schenker',
    val: 7800,
    slaMinutes: 150,
    urgencyScore: 74,
    status: 'Awaiting approval',
    info: 'Loading finished 2h late. Planned slot 10:00 now at risk.',
    recs: [
      { title: 'Book express carrier for same-day slot', speedText: 'Today 13:30', costText: '€180', successProbability: 79 },
      { title: 'Move site slot to 15:00 and notify customer', speedText: 'Today 15:00', costText: '€0', successProbability: 90 }
    ],
    draft: 'Hej, your delivery will arrive at 15:00 instead of 10:00. We are sorry for the delay and have notified your site manager.',
    tl: [
      { time: '09:10', actor: 'AI', text: 'Detection: dispatch milestone 2h overdue', cls: 'ai' },
      { time: '09:11', actor: 'AI', text: 'Cost-bearing option found, sent for approval (Path B)', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2033',
    name: 'Paint buckets, private customer Ek',
    tier: 'B2C',
    path: 'A',
    sev: 'Low',
    type: 'Transit delay',
    carrier: 'PostNord',
    val: 640,
    slaMinutes: 400,
    urgencyScore: 32,
    status: 'Auto-resolved',
    info: 'Carrier scan missed at hub. Parcel is still moving.',
    recs: [ { title: 'Send updated ETA notification', speedText: 'Instant', costText: '€0', successProbability: 97 } ],
    draft: 'Hi Ek, your order is running about 3 hours late. New ETA: today 17:00–19:00.',
    tl: [
      { time: '07:20', actor: 'AI', text: 'Detection: no hub scan for 6h', cls: 'ai' },
      { time: '07:21', actor: 'AI', text: 'Path A: low-risk communication, sent ETA notification autonomously', cls: 'ai' },
      { time: '07:21', actor: 'System', text: 'Within spending cap (€0). Logged in audit trail', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2031',
    name: 'Tile adhesive, Svensson Bygg',
    tier: 'B2B',
    path: 'A',
    sev: 'Medium',
    type: 'Missing information',
    carrier: 'Bring',
    val: 2300,
    slaMinutes: 300,
    urgencyScore: 45,
    status: 'Auto-resolved',
    info: 'Site gate code missing on the delivery note.',
    recs: [ { title: 'Ask customer for gate code and unloading contact', speedText: 'Instant', costText: '€0', successProbability: 92 } ],
    draft: 'Hej, we need the gate code for tomorrow’s delivery. Please reply to this message.',
    tl: [
      { time: '06:50', actor: 'AI', text: 'Detection: required field “site access” empty', cls: 'ai' },
      { time: '06:51', actor: 'AI', text: 'Path A: sent request for missing information', cls: 'ai' },
      { time: '07:35', actor: 'Customer', text: 'Replied with gate code 🔒 (masked)', cls: 'hu' }
    ]
  },
  {
    id: 'DQ-2029',
    name: 'Kitchen cabinets, Lindgren Interiör',
    tier: 'B2B',
    path: 'C',
    sev: 'High',
    type: 'Delivery-day failure',
    carrier: 'NordFrakt',
    val: 31500,
    slaMinutes: 60,
    urgencyScore: 90,
    status: 'Human-led',
    info: 'Customer refused unloading: two doors damaged on arrival.',
    recs: [],
    draft: '',
    tl: [
      { time: '10:02', actor: 'Driver', text: 'Reported damage on site (photo attached)', cls: 'hu' },
      { time: '10:03', actor: 'AI', text: 'High-value order, so Path C. Case brief prepared for account manager', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2027',
    name: 'Bathroom fittings, Norrland Rör',
    tier: 'B2B',
    path: 'B',
    sev: 'Medium',
    type: 'Transit delay',
    carrier: 'Schenker',
    val: 5400,
    slaMinutes: 260,
    urgencyScore: 58,
    status: 'Awaiting approval',
    info: 'Carrier API shows 90 min delay due to weather on E45.',
    recs: [
      { title: 'Reschedule site slot to tomorrow 07:00', speedText: 'Tomorrow 07:00', costText: '€0', successProbability: 95 },
      { title: 'Keep slot, add driver overtime', speedText: 'Today 19:00', costText: '€220', successProbability: 66 }
    ],
    draft: 'Hej, due to weather your delivery is moved to tomorrow at 07:00. Reply “change” if you need another time.',
    tl: [
      { time: '09:40', actor: 'AI', text: 'Detection: ETA past slot by 90 min', cls: 'ai' },
      { time: '09:41', actor: 'AI', text: 'B2B rescheduling needs dispatcher approval (Path B)', cls: 'ai' }
    ]
  },
  {
    id: 'DQ-2024',
    name: 'Garden decking, private customer Holm',
    tier: 'B2C',
    path: 'A',
    sev: 'Low',
    type: 'Transit delay',
    carrier: 'PostNord',
    val: 1150,
    slaMinutes: 500,
    urgencyScore: 25,
    status: 'Auto-resolved',
    info: 'Pickup scan late by 40 min. No customer impact yet.',
    recs: [ { title: 'Send status acknowledgement', speedText: 'Instant', costText: '€0', successProbability: 99 } ],
    draft: 'Hi Holm, your decking is on its way. We will update you if the time changes.',
    tl: [
      { time: '08:30', actor: 'AI', text: 'Detection: minor delay before customer impact', cls: 'ai' },
      { time: '08:31', actor: 'AI', text: 'Path A: status acknowledgement sent', cls: 'ai' }
    ]
  }
];
