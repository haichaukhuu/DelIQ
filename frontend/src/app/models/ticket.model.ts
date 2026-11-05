export type TicketPath = 'A' | 'B' | 'C';
export type TicketSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type TicketStatus =
  | 'Auto-resolved'
  | 'Awaiting approval'
  | 'Human-led'
  | 'In progress'
  | 'Resolved'
  | 'Rejected';

export type TimelineActor = 'AI' | 'Driver' | 'Customer' | 'System' | 'Dispatcher';
export type TimelineTone = 'ai' | 'hu' | 'no';

export interface Recommendation {
  title: string;
  speedText: string; // e.g. "ETA 2h 10m" / "Today 14:00"
  costText: string;  // e.g. "€120"
  successProbability: number; // 0..100
}

export interface TimelineEntry {
  time: string; // HH:MM
  actor: TimelineActor;
  text: string;
  cls: TimelineTone;
}

export interface TicketItem {
  id: string;
  name: string; // order/customer summary
  tier: 'B2B' | 'B2C';
  path: TicketPath; // A/B/C
  sev: TicketSeverity;
  type: string; // issue type
  carrier: string;
  val: number; // euros
  slaMinutes: number;
  urgencyScore: number; // 0..100
  status: TicketStatus;
  info: string; // short one-line note
  recs: Recommendation[];
  draft: string; // drafted customer message
  tl: TimelineEntry[]; // timeline
}
