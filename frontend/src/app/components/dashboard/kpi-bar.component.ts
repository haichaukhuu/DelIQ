import { Component, inject } from '@angular/core';
import { NewDashboardStore } from '../../services/new-dashboard-store.service';

@Component({
  selector: 'app-kpi-bar',
  standalone: true,
  template: `<section class="kpis" aria-label="Key performance indicators">
    <span>Open <b>{{ store.kpis()['open_cases'] ?? store.tickets().length }}</b></span>
    <span>Green <b>{{ store.kpis()['green_cases'] ?? 0 }}</b></span>
    <span>Amber <b>{{ store.kpis()['amber_cases'] ?? 0 }}</b></span>
    <span>Red <b>{{ store.kpis()['red_cases'] ?? 0 }}</b></span>
    <span>Early detection <b>{{ store.kpis()['early_detection_pct'] ?? 0 }}%</b></span>
    <span>Hours saved <b>{{ store.kpis()['estimated_hours_saved'] ?? 0 }}</b></span>
  </section>`,
})
export class KpiBarComponent {
  readonly store = inject(NewDashboardStore);
}
