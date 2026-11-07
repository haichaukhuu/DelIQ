import { Injectable, computed, inject, signal } from '@angular/core';
import { DELIVERY_DATA_SOURCE } from '../contracts/delivery-data-source.contract';
import {
  TicketItem,
  TicketPath,
  TicketSort,
  TicketStatus,
  TimelineActor,
  TimelineEntry,
  TimelineTone,
} from '../models';

// State store for the Control Tower dashboard, decoupled from data & AI implementations via DI contracts.
@Injectable({ providedIn: 'root' })
export class NewDashboardStore {
  private readonly dataSource = inject(DELIVERY_DATA_SOURCE);

  readonly tickets = signal<TicketItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // UI state
  readonly openId = signal<string | null>(null);
  readonly query = signal<string>('');
  readonly filterPath = signal<TicketPath | ''>('');
  readonly filterStatus = signal<TicketStatus | ''>('');
  readonly filterType = signal<string>('');
  readonly sort = signal<TicketSort>('default');
  readonly picks = signal<Record<string, number>>({}); // ticketId -> rec index
  readonly rejectedOpen = signal<Record<string, boolean>>({});

  // Governance settings
  readonly killSwitch = signal<boolean>(false);
  readonly autonomousPathA = signal<boolean>(true);
  readonly spendingCap = signal<number>(100);

  constructor() {
    void this.loadTickets();
  }

  // Derived lists
  readonly issueTypes = computed(() => {
    const all = this.tickets().map((t) => t.type);
    return Array.from(new Set(all));
  });

  readonly statuses = computed(() => {
    const base = this.tickets().map((t) => t.status);
    const extra: TicketStatus[] = ['Resolved', 'Rejected'];
    return Array.from(new Set([...base, ...extra]));
  });

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const fp = this.filterPath();
    const fs = this.filterStatus();
    const ft = this.filterType();
    const filtered = this.tickets().filter(
      (t) =>
        (!q || (t.id + t.name + t.type + t.carrier).toLowerCase().includes(q)) &&
        (!fp || t.path === fp) &&
        (!fs || t.status === fs) &&
        (!ft || t.type === ft)
    );

    switch (this.sort()) {
      case 'urgency':
        return [...filtered].sort((a, b) => b.urgencyScore - a.urgencyScore);
      case 'sla':
        return [...filtered].sort((a, b) => a.slaMinutes - b.slaMinutes);
      case 'value':
        return [...filtered].sort((a, b) => b.val - a.val);
      default:
        return filtered;
    }
  });

  toggleOpen(id: string): void {
    this.openId.update((v) => (v === id ? null : id));
  }

  toggleKillSwitch(): void {
    this.killSwitch.update((enabled) => !enabled);
  }

  setPick(ticketId: string, recIndex: number): void {
    if (recIndex < 0) {
      throw new Error('Recommendation index must be non-negative.');
    }
    this.picks.update((m) => ({ ...m, [ticketId]: recIndex }));
  }

  async approve(ticketId: string): Promise<boolean> {
    if (this.killSwitch()) {
      return false;
    }
    const targetTicket = this.tickets().find((t) => t.id === ticketId);
    if (!targetTicket || targetTicket.status === 'Resolved') {
      return false;
    }

    const pick = this.picks()[ticketId] ?? 0;
    try {
      await this.dataSource.approve(targetTicket.backendId!, targetTicket.recommendationIds?.[pick], 'Desmond');
      this.appendTimelineEntries(ticketId, [
        { time: this.currentTimeText(), actor: 'Dispatcher', text: `Approved: ${targetTicket.recs[pick]?.title ?? 'Selected recommendation'}`, cls: 'hu' },
        { time: this.currentTimeText(), actor: 'System', text: 'Action executed and audit entry recorded', cls: 'ai' },
      ]);
      this.updateStatus(ticketId, 'Resolved');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Approval failed');
      return false;
    }
  }

  async reject(ticketId: string, reason: string): Promise<boolean> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return false;
    }
    const targetTicket = this.tickets().find((t) => t.id === ticketId);
    if (!targetTicket || targetTicket.status === 'Resolved') {
      return false;
    }

    try {
      await this.dataSource.reject(targetTicket.backendId!, targetTicket.recommendationIds?.[this.picks()[ticketId] ?? 0], 'Desmond', trimmedReason);
      this.appendTimelineEntries(ticketId, [
        { time: this.currentTimeText(), actor: 'Dispatcher', text: `Rejected recommendation. Reason: ${trimmedReason}`, cls: 'no' },
      ]);
      this.updateStatus(ticketId, 'Rejected');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Rejection failed');
      return false;
    }
  }

  async takeOwnership(ticketId: string): Promise<boolean> {
    const targetTicket = this.tickets().find((t) => t.id === ticketId);
    if (!targetTicket) {
      return false;
    }
    try {
      await this.dataSource.takeOwnership(targetTicket.backendId!, 'Desmond');
      this.addTimeline(ticketId, 'Dispatcher', 'Took ownership of this case', 'hu');
      this.updateStatus(ticketId, 'In progress');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Ownership update failed');
      return false;
    }
  }

  async markResolved(ticketId: string): Promise<boolean> {
    const targetTicket = this.tickets().find((t) => t.id === ticketId);
    if (!targetTicket || targetTicket.status === 'Resolved') {
      return false;
    }
    try {
      await this.dataSource.resolve(targetTicket.backendId!, 'Desmond');
      this.addTimeline(ticketId, 'Dispatcher', 'Marked case as resolved', 'hu');
      this.updateStatus(ticketId, 'Resolved');
      return true;
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Resolution failed');
      return false;
    }
  }

  private async loadTickets(): Promise<void> {
    try {
      this.tickets.set(await this.dataSource.loadTickets());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load cases');
    } finally {
      this.loading.set(false);
    }
  }

  private updateStatus(ticketId: string, next: TicketStatus): void {
    this.tickets.update((list) =>
      list.map((t) => (t.id === ticketId ? { ...t, status: next } : t))
    );
  }

  private addTimeline(
    ticketId: string,
    actor: TimelineActor,
    text: string,
    cls: TimelineTone
  ): void {
    const entry: TimelineEntry = {
      time: this.currentTimeText(),
      actor,
      text,
      cls,
    };
    this.appendTimelineEntries(ticketId, [entry]);
  }

  private appendTimelineEntries(ticketId: string, entries: TimelineEntry[]): void {
    this.tickets.update((list) =>
      list.map((t) =>
        t.id === ticketId ? { ...t, tl: [...t.tl, ...entries] } : t
      )
    );
  }

  private currentTimeText(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
