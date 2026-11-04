import { Component, computed, input } from '@angular/core';
import { IssueHandlerMode, IssueResolutionState } from '../../../models';
import { BadgeColorTone, StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * Reusable indicator showing whether the AI Engine or a Human Employee is handling the issue,
 * along with its live resolution state.
 */
@Component({
  selector: 'app-resolution-actor-indicator',
  imports: [StatusBadgeComponent],
  template: `
    <div class="actor-indicator-group">
      <app-status-badge
        [label]="handlerMode()"
        [tone]="handlerTone()"
        [iconName]="handlerIcon()"
      />
      <app-status-badge
        [label]="resolutionState()"
        [tone]="resolutionTone()"
        [iconName]="resolutionIcon()"
      />
    </div>
  `,
  styles: `
    .actor-indicator-group {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
    }
  `,
})
export class ResolutionActorIndicatorComponent {
  readonly handlerMode = input.required<IssueHandlerMode>();
  readonly resolutionState = input.required<IssueResolutionState>();

  readonly handlerTone = computed<BadgeColorTone>(() => {
    const mode = this.handlerMode();
    if (mode.includes('Path A')) {
      return 'green';
    }
    if (mode.includes('Path B')) {
      return 'amber';
    }
    return 'red';
  });

  readonly handlerIcon = computed<string>(() => {
    const mode = this.handlerMode();
    if (mode.includes('Path A')) {
      return 'smart_toy';
    }
    if (mode.includes('Path B')) {
      return 'handshake';
    }
    return 'engineering';
  });

  readonly resolutionTone = computed<BadgeColorTone>(() => {
    const state = this.resolutionState();
    if (state === 'Resolved by AI' || state === 'Resolved by Human Employee') {
      return 'green';
    }
    if (state === 'Waiting for Human Approval') {
      return 'amber';
    }
    if (state === 'Human Employee Resolving') {
      return 'red';
    }
    return 'blue';
  });

  readonly resolutionIcon = computed<string>(() => {
    const state = this.resolutionState();
    if (state.startsWith('Resolved')) {
      return 'check_circle';
    }
    if (state === 'Waiting for Human Approval') {
      return 'hourglass_top';
    }
    return 'pending_actions';
  });
}
