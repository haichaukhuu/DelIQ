import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AiResolutionWorkspacePanelComponent } from './components/ai-resolution-workspace-panel/ai-resolution-workspace-panel.component';
import { LiveOrdersPanelComponent } from './components/live-orders-panel/live-orders-panel.component';
import { ResolutionActivityLogPanelComponent } from './components/resolution-activity-log-panel/resolution-activity-log-panel.component';
import { ControlTowerStateService } from './services/control-tower-state.service';
import { StatusBadgeComponent } from './shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatToolbarModule,
    LiveOrdersPanelComponent,
    AiResolutionWorkspacePanelComponent,
    ResolutionActivityLogPanelComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly stateService = inject(ControlTowerStateService);

  toggleShadowMode(enabled: boolean): void {
    this.stateService.isShadowModeActive.set(enabled);
  }

  toggleAutonomyKillSwitch(): void {
    this.stateService.isAutonomyPaused.update((paused) => !paused);
  }
}
