import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DeliveryOrder, ResolutionProgressStep } from '../../models';
import { ControlTowerStateService } from '../../services/control-tower-state.service';
import { ResolutionActorIndicatorComponent } from '../../shared/components/resolution-actor-indicator/resolution-actor-indicator.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SystemTelemetryGridComponent } from '../../shared/components/system-telemetry-grid/system-telemetry-grid.component';

@Component({
  selector: 'app-ai-resolution-workspace-panel',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ResolutionActorIndicatorComponent,
    StatusBadgeComponent,
    SystemTelemetryGridComponent,
  ],
  templateUrl: './ai-resolution-workspace-panel.component.html',
  styleUrl: './ai-resolution-workspace-panel.component.scss',
})
export class AiResolutionWorkspacePanelComponent {
  readonly stateService = inject(ControlTowerStateService);

  readonly isOverrideDrawerOpen = signal<boolean>(false);
  readonly customOverrideReasonText = signal<string>('');
  readonly actionFeedbackMessage = signal<string | null>(null);

  readonly progressSteps: ResolutionProgressStep[] = [
    'Order Tracked',
    'Issue Detected',
    'Urgency Classified',
    'AI Remedy Generated',
    'Governance Gate',
    'Executing Fix',
    'Resolved & Logged',
  ];

  selectRemediationOption(issueId: string, optionId: string): void {
    this.stateService.chooseRemediationOption(issueId, optionId);
  }

  updateMessageDraft(issueId: string, updatedText: string): void {
    this.stateService.updateDraftedCustomerMessage(issueId, updatedText);
  }

  approveAiPlan(issueId: string): void {
    this.stateService.approveAiRemediationByHuman(issueId);
    this.isOverrideDrawerOpen.set(false);
    this.actionFeedbackMessage.set(
      'AI Remediation Plan approved by human dispatcher. Write-back and customer notification queued.'
    );
  }

  toggleOverrideDrawer(): void {
    this.isOverrideDrawerOpen.update((open) => !open);
  }

  submitHumanOverride(issueId: string): void {
    const reason = this.customOverrideReasonText().trim();
    if (!reason) {
      return;
    }
    this.stateService.overrideAiRemediationByHuman(issueId, reason);
    this.customOverrideReasonText.set('');
    this.isOverrideDrawerOpen.set(false);
    this.actionFeedbackMessage.set(
      'Human employee override recorded and logged for AI governance.'
    );
  }

  takeHumanSpecialistControl(issueId: string): void {
    this.stateService.assignHumanSpecialistForDirectResolution(issueId);
    this.actionFeedbackMessage.set(
      'Human Fleet Specialist took direct ownership and initiated recovery protocol.'
    );
  }

  simulateAnomalyForHealthyOrder(order: DeliveryOrder): void {
    this.stateService.reportIssueAndInvokeAiEngine({
      orderId: order.orderId,
      reportedByRole: 'Warehouse Bay Picker',
      issueCategory: 'Warehouse Short-Pick / Stockout',
      issueDescription: `Simulated short-pick exception reported on ${order.itemsSummary} at ${order.distributionCenterName}.`,
    });
    this.actionFeedbackMessage.set(
      `AI Engine analyzed order ${order.orderId} and generated ranked remediation options.`
    );
  }
}
