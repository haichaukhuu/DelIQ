import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NewDashboardStore } from '../../services/new-dashboard-store.service';
import { KpiBarComponent } from '../dashboard/kpi-bar.component';
import { DemoToolsComponent } from '../dashboard/demo-tools.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, KpiBarComponent, DemoToolsComponent],
  template: `
    <div class="settings">
      <a class="back" routerLink="/control/dashboard">← Back to dashboard</a>
      <h2>Settings</h2>
      <p class="intro">Control Tower governance and demo tools.</p>
      <section class="panel">
        <h3>Governance</h3>
        <label class="setting">
          <span><b>Kill switch</b><small>Pause all autonomous actions and require human handling.</small></span>
          <input type="checkbox" [checked]="store.killSwitch()" (change)="store.toggleKillSwitch()" />
        </label>
        <label class="setting">
          <span><b>Green autonomy</b><small>Allow low-risk Green cases to execute automatically.</small></span>
          <input type="checkbox" [checked]="store.autonomousPathA()" (change)="store.updateAutonomousPathA(!store.autonomousPathA())" />
        </label>
        <div class="value">Amber per-case cap <b>€{{ store.spendingCap() }}</b></div>
      </section>
      <section class="panel"><h3>Demo controls</h3><app-demo-tools /></section>
      <section class="panel"><h3>KPIs</h3><app-kpi-bar /></section>
      <p class="error" *ngIf="store.error()" role="alert">{{ store.error() }}</p>
    </div>
  `,
  styles: [`
    .settings { max-width: 860px; }
    .back { color: var(--mut); text-decoration: none; font-size: 13px; }
    h2 { margin: 18px 0 4px; }
    .intro { color: var(--mut); margin: 0 0 20px; }
    .panel { border: 1px solid var(--line); border-radius: 12px; padding: 18px; margin-bottom: 14px; background: var(--card); }
    h3 { margin: 0 0 14px; }
    .setting { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 12px 0; border-top: 1px solid var(--line); }
    .setting:first-of-type { border-top: 0; }
    .setting span { display: grid; gap: 4px; }
    small, .value { color: var(--mut); }
    input[type="checkbox"] { width: 18px; height: 18px; }
    .value { padding-top: 12px; border-top: 1px solid var(--line); }
    .error { color: #c93c3c; }
  `],
})
export class SettingsComponent {
  readonly store = inject(NewDashboardStore);
}
