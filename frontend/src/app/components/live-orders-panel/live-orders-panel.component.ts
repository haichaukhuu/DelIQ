import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  DeliveryIssueCategory,
  IssueHandlerMode,
  OrderHealthStatus,
} from '../../models';
import {
  CombinedOrderAndIssueViewModel,
  ControlTowerStateService,
} from '../../services/control-tower-state.service';
import { ResolutionActorIndicatorComponent } from '../../shared/components/resolution-actor-indicator/resolution-actor-indicator.component';
import {
  BadgeColorTone,
  StatusBadgeComponent,
} from '../../shared/components/status-badge/status-badge.component';

export type UnifiedOrderQueueFilter =
  | 'ALL'
  | 'HUMAN_APPROVAL'
  | 'HUMAN_DIRECT'
  | 'AI_AUTONOMOUS'
  | 'HEALTHY_ONLY';

export interface FilterOptionButtonItem {
  filterKey: UnifiedOrderQueueFilter;
  label: string;
  count: number;
}

@Component({
  selector: 'app-live-orders-panel',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ResolutionActorIndicatorComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './live-orders-panel.component.html',
  styleUrl: './live-orders-panel.component.scss',
})
export class LiveOrdersPanelComponent {
  readonly stateService = inject(ControlTowerStateService);

  readonly selectedQueueFilter = signal<UnifiedOrderQueueFilter>('ALL');
  readonly isIssueSimulatorExpanded = signal<boolean>(false);
  readonly selectedOrderIdForReport = signal<string>('ORD-SE-8915');
  readonly selectedStaffRole = signal<string>('Warehouse Bay Picker');
  readonly selectedIssueCategory = signal<DeliveryIssueCategory>(
    'Warehouse Short-Pick / Stockout'
  );
  readonly issueDescriptionInput = signal<string>(
    '2 of 6 pallets of Rockwool Insulation Rolls found water-damaged at Bay 9 before carrier loading.'
  );

  readonly issueCategories: DeliveryIssueCategory[] = [
    'Warehouse Short-Pick / Stockout',
    'Late Dispatch / Transit Delay',
    'Vehicle Breakdown or Site Failure',
    'Missing Site Access Information',
  ];

  readonly filterOptionButtons = computed<FilterOptionButtonItem[]>(() => {
    const allItems = this.stateService.combinedOrdersWithIssues();
    return [
      {
        filterKey: 'ALL',
        label: 'All Orders',
        count: allItems.length,
      },
      {
        filterKey: 'HUMAN_APPROVAL',
        label: 'AI + Human Approval',
        count: allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode ===
            'AI Assisted + Human Approval (Path B - Amber)'
        ).length,
      },
      {
        filterKey: 'HUMAN_DIRECT',
        label: 'Human Specialist',
        count: allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode === 'Human Employee Led (Path C - Red)'
        ).length,
      },
      {
        filterKey: 'AI_AUTONOMOUS',
        label: 'AI Autonomous',
        count: allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode === 'AI Autonomous (Path A - Green)'
        ).length,
      },
      {
        filterKey: 'HEALTHY_ONLY',
        label: 'Healthy (No Issue)',
        count: allItems.filter((item) => item.linkedIssue === null).length,
      },
    ];
  });

  readonly filteredOrderAndIssueList = computed<CombinedOrderAndIssueViewModel[]>(() => {
    const filter = this.selectedQueueFilter();
    const allItems = this.stateService.combinedOrdersWithIssues();

    switch (filter) {
      case 'HUMAN_APPROVAL':
        return allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode ===
            'AI Assisted + Human Approval (Path B - Amber)'
        );
      case 'HUMAN_DIRECT':
        return allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode === 'Human Employee Led (Path C - Red)'
        );
      case 'AI_AUTONOMOUS':
        return allItems.filter(
          (item) =>
            item.linkedIssue?.handlerMode === 'AI Autonomous (Path A - Green)'
        );
      case 'HEALTHY_ONLY':
        return allItems.filter((item) => item.linkedIssue === null);
      default:
        return allItems;
    }
  });

  setQueueFilter(filter: UnifiedOrderQueueFilter): void {
    this.selectedQueueFilter.set(filter);
  }

  toggleIssueSimulator(preselectedOrderId?: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (preselectedOrderId) {
      this.selectedOrderIdForReport.set(preselectedOrderId);
      this.isIssueSimulatorExpanded.set(true);
      return;
    }
    this.isIssueSimulatorExpanded.update((open) => !open);
  }

  onSelectOrderCard(orderId: string): void {
    this.stateService.selectOrderById(orderId);
  }

  triggerNewIssueSimulation(): void {
    this.stateService.reportIssueAndInvokeAiEngine({
      orderId: this.selectedOrderIdForReport(),
      reportedByRole: this.selectedStaffRole(),
      issueCategory: this.selectedIssueCategory(),
      issueDescription:
        this.issueDescriptionInput().trim() ||
        'Exception reported via live tracking capture.',
    });
    this.isIssueSimulatorExpanded.set(false);
  }

  getOrderHealthBadgeTone(status: OrderHealthStatus): BadgeColorTone {
    if (status === 'On Schedule' || status === 'Issue Resolved') {
      return 'green';
    }
    if (status === 'Issue Detected - Awaiting Human Approval') {
      return 'amber';
    }
    if (status === 'Issue Detected - Human Specialist Resolving') {
      return 'red';
    }
    return 'blue';
  }

  getCardBorderAccentClass(linkedIssueMode?: IssueHandlerMode): string {
    if (!linkedIssueMode) {
      return 'border-healthy';
    }
    if (linkedIssueMode.includes('Path A')) {
      return 'border-green';
    }
    if (linkedIssueMode.includes('Path B')) {
      return 'border-amber';
    }
    return 'border-red';
  }
}
