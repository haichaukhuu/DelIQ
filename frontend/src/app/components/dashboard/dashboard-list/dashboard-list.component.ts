import { Component, computed, inject, signal } from '@angular/core';
import { DashboardFiltersComponent } from '../dashboard-filters/dashboard-filters.component';
import { TicketCardComponent } from '../ticket-card/ticket-card.component';
import { NewDashboardStore } from '../../../services/new-dashboard-store.service';

@Component({
  selector: 'app-dashboard-list',
  standalone: true,
  imports: [DashboardFiltersComponent, TicketCardComponent],
  templateUrl: './dashboard-list.component.html',
  styleUrl: './dashboard-list.component.scss',
})
export class DashboardListComponent {
  readonly store = inject(NewDashboardStore);
  readonly toastText = signal<string | null>(null);

  readonly count = computed(() => this.store.filtered().length);

  approve(id: string) {
    if (this.store.killSwitch()) {
      this.toast('Kill switch is on. Turn it off to continue');
      return;
    }
    const ok = this.store.approve(id);
    if (ok) this.toast('Approved and executed');
  }

  reject(id: string, reason: string) {
    this.store.reject(id, reason);
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: false }));
    this.toast('Rejected and logged');
  }

  toggleReject(id: string) {
    this.store.rejectedOpen.update((open) => ({ ...open, [id]: !open[id] }));
  }

  own(id: string) {
    this.store.takeOwnership(id);
    this.toast('You now own ' + id);
  }

  private toast(msg: string) {
    this.toastText.set(msg);
    setTimeout(() => this.toastText.set(null), 2000);
  }
}
