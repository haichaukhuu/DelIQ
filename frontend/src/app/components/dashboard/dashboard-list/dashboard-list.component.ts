import { Component, computed, inject, signal } from '@angular/core';
import { NewDashboardStore } from '../../../services/new-dashboard-store.service';
import { DashboardFiltersComponent } from '../dashboard-filters/dashboard-filters.component';
import { TicketCardComponent } from '../ticket-card/ticket-card.component';

@Component({
  selector: 'app-dashboard-list',
  imports: [DashboardFiltersComponent, TicketCardComponent],
  templateUrl: './dashboard-list.component.html',
  styleUrl: './dashboard-list.component.scss',
})
export class DashboardListComponent {
  readonly store = inject(NewDashboardStore);
  readonly toastText = signal<string | null>(null);

  readonly count = computed(() => this.store.filtered().length);

  async approve(id: string): Promise<void> {
    if (this.store.killSwitch()) {
      this.toast('Kill switch is on. Turn it off to continue');
      return;
    }
    const ok = await this.store.approve(id);
    if (ok) {
      this.store.rejectedOpen.update((open) => ({ ...open, [id]: false }));
      this.toast('Approved and executed');
    } else {
      this.toast(this.store.error() ?? 'Approval failed');
    }
  }

  async reject(id: string, reason: string): Promise<void> {
    const ok = await this.store.reject(id, reason);
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: false }));
    if (ok) {
      this.toast('Rejected — pushed to Path C for human takeover');
    } else {
      this.toast(this.store.error() ?? 'Rejection failed');
    }
  }

  toggleReject(id: string): void {
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: !open[id] }));
  }

  async own(id: string): Promise<void> {
    const ok = await this.store.takeOwnership(id);
    if (ok) {
      this.toast('You now own ' + id);
    } else {
      this.toast(this.store.error() ?? 'Ownership update failed');
    }
  }

  async resolve(id: string): Promise<void> {
    const ok = await this.store.markResolved(id);
    if (ok) {
      this.toast('Marked as resolved');
    } else {
      this.toast(this.store.error() ?? 'Resolution failed');
    }
  }

  private toast(msg: string): void {
    this.toastText.set(msg);
    setTimeout(() => this.toastText.set(null), 2000);
  }
}
