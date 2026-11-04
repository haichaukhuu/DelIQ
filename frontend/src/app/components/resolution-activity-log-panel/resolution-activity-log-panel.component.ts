import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ControlTowerStateService } from '../../services/control-tower-state.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-resolution-activity-log-panel',
  imports: [MatCardModule, MatIconModule, MatTableModule, StatusBadgeComponent],
  templateUrl: './resolution-activity-log-panel.component.html',
  styleUrl: './resolution-activity-log-panel.component.scss',
})
export class ResolutionActivityLogPanelComponent {
  readonly stateService = inject(ControlTowerStateService);

  readonly displayedColumns: string[] = [
    'logId',
    'issueAndOrder',
    'actorAndMode',
    'actionSummary',
    'overrideStatus',
    'rootCause',
  ];

  readonly humanOverrideCount = computed<number>(
    () =>
      this.stateService
        .resolutionLogs()
        .filter((log) => log.wasAiRecommendationOverridden).length
  );
}
