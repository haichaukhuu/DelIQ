import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type BadgeColorTone = 'green' | 'amber' | 'red' | 'blue' | 'dark' | 'neutral';

@Component({
  selector: 'app-status-badge',
  imports: [MatIconModule],
  template: `
    <span class="reusable-status-badge" [class]="'tone-' + tone()">
      @if (iconName()) {
        <mat-icon class="badge-icon">{{ iconName() }}</mat-icon>
      }
      <span class="badge-text">{{ label() }}</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      max-width: 100%;
      min-width: 0;
    }
    .reusable-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.22rem 0.55rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.3;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      max-width: 100%;
    }
    .badge-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      flex-shrink: 0;
    }
    .badge-text {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .tone-green {
      background: #dcfce7;
      color: #166534;
    }
    .tone-amber {
      background: #fef3c7;
      color: #92400e;
    }
    .tone-red {
      background: #fee2e2;
      color: #991b1b;
    }
    .tone-blue {
      background: #dbeafe;
      color: #1e40af;
    }
    .tone-dark {
      background: #0f3d32;
      color: #ffffff;
    }
    .tone-neutral {
      background: #e2e8f0;
      color: #334155;
    }
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeColorTone>('neutral');
  readonly iconName = input<string | null>(null);
}
