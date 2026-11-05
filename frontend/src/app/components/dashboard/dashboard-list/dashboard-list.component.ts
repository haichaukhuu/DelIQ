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

  approve(id: string): void {
    if (this.store.killSwitch()) {
      this.toast('Kill switch is on. Turn it off to continue');
      return;
    }
    const ok = this.store.approve(id);
    if (ok) {
      this.store.rejectedOpen.update((open) => ({ ...open, [id]: false }));
      this.toast('Approved and executed');
    }
  }

  reject(id: string, reason: string): void {
    const ok = this.store.reject(id, reason);
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: false }));
    if (ok) {
      this.toast('Rejected and logged');
    }
  }

  toggleReject(id: string): void {
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: !open[id] }));
  }

  own(id: string): void {
    const ok = this.store.takeOwnership(id);
    if (ok) {
      this.toast('You now own ' + id);
    }
  }

  resolve(id: string): void {
    const ok = this.store.markResolved(id);
    if (ok) {
      this.toast('Marked as resolved');
    }
  }

  private toast(msg: string): void {
    this.toastText.set(msg);
    setTimeout(() => this.toastText.set(null), 2000);
  }
}
