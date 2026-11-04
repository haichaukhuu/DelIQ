import { Component, input } from '@angular/core';
import { SystemTelemetrySnapshot } from '../../../models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * Reusable 4-system telemetry grid displaying ERP, WMS, TMS, and Carrier GPS feed statuses.
 */
@Component({
  selector: 'app-system-telemetry-grid',
  imports: [StatusBadgeComponent],
  template: `
    <div class="telemetry-grid">
      @for (item of snapshots(); track item.systemName) {
        <div
          class="telemetry-card"
          [class.telemetry-warning]="item.hasAnomalyWarning"
          [class.telemetry-unknown]="item.freshnessLevel === 'Status Unknown'"
        >
          <div class="telemetry-header">
            <strong class="system-name">{{ item.systemName }}</strong>
            <app-status-badge
              [label]="item.freshnessLevel + ' · ' + item.lastUpdatedText"
              [tone]="item.freshnessLevel === 'Status Unknown' ? 'red' : 'green'"
            />
          </div>
          <p class="telemetry-status">{{ item.statusText }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    .telemetry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
      gap: 0.65rem;
      min-width: 0;
    }
    .telemetry-card {
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .telemetry-warning {
      border-color: #f59e0b;
      background: #fffbeb;
    }
    .telemetry-unknown {
      border-color: #dc2626;
      background: #fef2f2;
    }
    .telemetry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .system-name {
      font-size: 0.8rem;
      color: #0f172a;
      overflow-wrap: anywhere;
    }
    .telemetry-status {
      margin: 0;
      font-size: 0.8rem;
      color: #334155;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
  `,
})
export class SystemTelemetryGridComponent {
  readonly snapshots = input.required<SystemTelemetrySnapshot[]>();
}
