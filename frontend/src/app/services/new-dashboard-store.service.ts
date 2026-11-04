import { Injectable, computed, signal } from '@angular/core';
import { MOCK_TICKETS } from '../mock-data/mock-tickets.data';
import { TicketItem, TicketPath, TicketStatus } from '../models/ticket.model';

// Lightweight UI store for the new dashboard. Purely front-end; no backend calls.
@Injectable({ providedIn: 'root' })
export class NewDashboardStore {
  // Source data (static)
  readonly tickets = signal<TicketItem[]>(MOCK_TICKETS);

  // UI state
  readonly openId = signal<string | null>(null);
  readonly query = signal<string>('');
  readonly filterPath = signal<TicketPath | ''>('');
  readonly filterStatus = signal<TicketStatus | ''>('');
  readonly filterType = signal<string>('');
  readonly picks = signal<Record<string, number>>({}); // ticketId -> rec index
  readonly rejectedOpen = signal<Record<string, boolean>>({});

  // Governance settings
  readonly killSwitch = signal<boolean>(false);
  readonly autonomousPathA = signal<boolean>(true);
  readonly spendingCap = signal<number>(500);

  // Derived lists
  readonly issueTypes = computed(() => {
    const all = this.tickets().map(t => t.type);
    return Array.from(new Set(all));
  });

  readonly statuses = computed(() => {
    const base = this.tickets().map(t => t.status);
    const extra: TicketStatus[] = ['Resolved', 'Rejected'];
    return Array.from(new Set([...base, ...extra]));
  });

  readonly filtered = computed(() => {
    const q = this.query().toLowerCase();
    const fp = this.filterPath();
    const fs = this.filterStatus();
    const ft = this.filterType();
    return this.tickets().filter(t =>
      (!q || (t.id + t.name + t.type + t.carrier).toLowerCase().includes(q)) &&
      (!fp || t.path === fp) &&
      (!fs || t.status === fs) &&
      (!ft || t.type === ft)
    );
  });

  toggleOpen(id: string) {
    this.openId.update(v => (v === id ? null : id));
  }

  setPick(ticketId: string, recIndex: number) {
    this.picks.update(m => ({ ...m, [ticketId]: recIndex }));
  }

  approve(ticketId: string) {
    if (this.killSwitch()) return false;
    const pick = this.picks()[ticketId] ?? 0;
    this.addTimeline(ticketId, 'Dispatcher', `Approved: ${this.tickets().find(t => t.id === ticketId)!.recs[pick].title}`, 'hu');
    this.addTimeline(ticketId, 'System', 'Action executed, customer message sent, write-back logged', 'ai');
    this.updateStatus(ticketId, 'Resolved');
    return true;
  }

  reject(ticketId: string, reason: string) {
    this.addTimeline(ticketId, 'Dispatcher', `Rejected recommendation. Reason: ${reason}`, 'no');
    this.addTimeline(ticketId, 'AI', 'Generating a new ranked plan from the reason given', 'ai');
    this.updateStatus(ticketId, 'Rejected');
  }

  takeOwnership(ticketId: string) {
    this.addTimeline(ticketId, 'Dispatcher', 'Took ownership of this case', 'hu');
    this.updateStatus(ticketId, 'In progress');
  }

  markResolved(ticketId: string) {
    this.updateStatus(ticketId, 'Resolved');
  }

  private updateStatus(ticketId: string, next: TicketStatus) {
    this.tickets.update(list => list.map(t => (t.id === ticketId ? { ...t, status: next } : t)));
  }

  private addTimeline(ticketId: string, actor: TicketItem['tl'][number]['actor'], text: string, cls: 'ai' | 'hu' | 'no') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.tickets.update(list => list.map(t => (
      t.id === ticketId ? { ...t, tl: [...t.tl, { time, actor, text, cls }] } : t
    )));
  }
}
