import { Injectable, computed, inject, signal } from '@angular/core';
import { AI_TRIAGE_ENGINE } from '../contracts/ai-triage-engine.contract';
import { DELIVERY_DATA_SOURCE } from '../contracts/delivery-data-source.contract';
import {
  DeliveryIssue,
  DeliveryOrder,
  IssueResolutionState,
  NewIssueReportInput,
  OrderHealthStatus,
  ResolutionActivityLog,
} from '../models';

export interface CombinedOrderAndIssueViewModel {
  order: DeliveryOrder;
  linkedIssue: DeliveryIssue | null;
}

/**
 * Application state facade for the Unified Control Tower Dashboard.
 * Combines live order tracking with each order's active issue and resolution state.
 */
@Injectable({ providedIn: 'root' })
export class ControlTowerStateService {
  private readonly dataSource = inject(DELIVERY_DATA_SOURCE);
  private readonly aiTriageEngine = inject(AI_TRIAGE_ENGINE);

  readonly activeDistributionCenterName = signal<string>('Gothenburg Pilot DC (SE-01)');
  readonly isShadowModeActive = signal<boolean>(false);
  readonly isAutonomyPaused = signal<boolean>(false);
  readonly autonomousSpendingCapEuros = signal<number>(0);

  readonly deliveryOrders = signal<DeliveryOrder[]>(this.dataSource.getInitialOrders());
  readonly deliveryIssues = signal<DeliveryIssue[]>(this.dataSource.getInitialIssues());
  readonly resolutionLogs = signal<ResolutionActivityLog[]>(
    this.dataSource.getInitialResolutionLogs()
  );

  readonly selectedOrderId = signal<string>(
    this.deliveryOrders()[0]?.orderId ?? ''
  );

  /**
   * Unified list joining each tracked DeliveryOrder with its linked DeliveryIssue (if any).
   */
  readonly combinedOrdersWithIssues = computed<CombinedOrderAndIssueViewModel[]>(() => {
    const issuesById = new Map<string, DeliveryIssue>(
      this.deliveryIssues().map((issue) => [issue.issueId, issue])
    );

    return this.deliveryOrders().map((order) => ({
      order,
      linkedIssue: order.linkedIssueId ? (issuesById.get(order.linkedIssueId) ?? null) : null,
    }));
  });

  readonly selectedOrderWithIssue = computed<CombinedOrderAndIssueViewModel | undefined>(() => {
    const targetOrderId = this.selectedOrderId();
    return this.combinedOrdersWithIssues().find(
      (entry) => entry.order.orderId === targetOrderId
    );
  });

  readonly selectedIssue = computed<DeliveryIssue | undefined>(() => {
    return this.selectedOrderWithIssue()?.linkedIssue ?? undefined;
  });

  readonly aiHandledIssuesCount = computed<number>(
    () =>
      this.deliveryIssues().filter(
        (issue) =>
          issue.resolutionState === 'AI Resolving Automatically' ||
          issue.resolutionState === 'Resolved by AI'
      ).length
  );

  readonly humanActionRequiredCount = computed<number>(
    () =>
      this.deliveryIssues().filter(
        (issue) =>
          issue.resolutionState === 'Waiting for Human Approval' ||
          issue.resolutionState === 'Human Employee Resolving'
      ).length
  );

  selectOrderById(orderId: string): void {
    this.selectedOrderId.set(orderId);
  }

  chooseRemediationOption(issueId: string, optionId: string): void {
    this.deliveryIssues.update((issues) =>
      issues.map((issue) =>
        issue.issueId === issueId
          ? { ...issue, selectedRemediationOptionId: optionId }
          : issue
      )
    );
  }

  updateDraftedCustomerMessage(issueId: string, updatedMessage: string): void {
    this.deliveryIssues.update((issues) =>
      issues.map((issue) =>
        issue.issueId === issueId
          ? { ...issue, draftedCustomerMessage: updatedMessage }
          : issue
      )
    );
  }

  approveAiRemediationByHuman(issueId: string): void {
    // TODO (Backend): POST /api/issues/{issueId}/approve to trigger ERP/WMS/TMS write-back & SMS dispatch.
    const targetIssue = this.deliveryIssues().find((i) => i.issueId === issueId);
    if (!targetIssue) {
      return;
    }

    const selectedOption =
      targetIssue.aiRemediationOptions.find(
        (opt) => opt.optionId === targetIssue.selectedRemediationOptionId
      ) ?? targetIssue.aiRemediationOptions[0];

    const wasOverridden = !selectedOption.isRecommendedByAi;

    this.updateIssueAndOrderStatus(
      issueId,
      targetIssue.orderId,
      'Resolved by Human Employee',
      'Issue Resolved',
      'Resolved & Logged'
    );

    this.prependResolutionLog({
      logId: `LOG-${9005 + this.resolutionLogs().length}`,
      timestampText: 'Just now',
      issueId: targetIssue.issueId,
      orderId: targetIssue.orderId,
      handlerMode: targetIssue.handlerMode,
      actorType: 'Human Dispatcher',
      actorName: targetIssue.assignedEmployeeOrAgentName,
      actionSummary: this.isShadowModeActive()
        ? `[SHADOW MODE] Human dispatcher validated AI remedy: ${selectedOption.optionTitle}`
        : `Human dispatcher approved & executed AI plan: ${selectedOption.optionTitle} (€${selectedOption.estimatedExtraCostEuros}) + Sent SMS to ${targetIssue.customerContactInfo}`,
      wasAiRecommendationOverridden: wasOverridden,
      overrideReasonText: wasOverridden
        ? 'Dispatcher selected secondary AI option instead of top recommendation.'
        : null,
      rootCauseCategory:
        targetIssue.issueCategory === 'Warehouse Short-Pick / Stockout'
          ? 'SKU Stockout'
          : 'Carrier Transit Delay',
      depotOrStoreName: targetIssue.distributionCenterName,
      carrierName: 'Assigned Carrier',
      affectedSkuName: 'Order Materials',
    });
  }

  overrideAiRemediationByHuman(issueId: string, customOverrideReason: string): void {
    // TODO (Backend): POST /api/issues/{issueId}/override to record human override for AI governance.
    const targetIssue = this.deliveryIssues().find((i) => i.issueId === issueId);
    if (!targetIssue) {
      return;
    }

    this.updateIssueAndOrderStatus(
      issueId,
      targetIssue.orderId,
      'Resolved by Human Employee',
      'Issue Resolved',
      'Resolved & Logged'
    );

    this.prependResolutionLog({
      logId: `LOG-${9005 + this.resolutionLogs().length}`,
      timestampText: 'Just now',
      issueId: targetIssue.issueId,
      orderId: targetIssue.orderId,
      handlerMode: targetIssue.handlerMode,
      actorType: 'Human Dispatcher',
      actorName: targetIssue.assignedEmployeeOrAgentName,
      actionSummary: `Human dispatcher overrode AI plan: ${customOverrideReason}`,
      wasAiRecommendationOverridden: true,
      overrideReasonText: customOverrideReason,
      rootCauseCategory: 'Carrier Transit Delay',
      depotOrStoreName: targetIssue.distributionCenterName,
      carrierName: 'Assigned Carrier',
      affectedSkuName: 'Order Materials',
    });
  }

  assignHumanSpecialistForDirectResolution(issueId: string): void {
    // TODO (Backend): POST /api/issues/{issueId}/escalate to assign human specialist & log intervention.
    const targetIssue = this.deliveryIssues().find((i) => i.issueId === issueId);
    if (!targetIssue) {
      return;
    }

    this.deliveryIssues.update((issues) =>
      issues.map((issue) =>
        issue.issueId === issueId
          ? {
              ...issue,
              assignedEmployeeOrAgentName: 'Senior Fleet Specialist (Human Active)',
              resolutionState: 'Resolved by Human Employee',
              currentProgressStep: 'Resolved & Logged',
            }
          : issue
      )
    );

    this.deliveryOrders.update((orders) =>
      orders.map((order) =>
        order.orderId === targetIssue.orderId
          ? { ...order, orderHealthStatus: 'Issue Resolved' }
          : order
      )
    );

    this.prependResolutionLog({
      logId: `LOG-${9005 + this.resolutionLogs().length}`,
      timestampText: 'Just now',
      issueId: targetIssue.issueId,
      orderId: targetIssue.orderId,
      handlerMode: 'Human Employee Led (Path C - Red)',
      actorType: 'Human Fleet Specialist',
      actorName: 'Senior Fleet Specialist',
      actionSummary:
        'Human specialist executed emergency crane recovery transfer and contacted VIP site director directly.',
      wasAiRecommendationOverridden: false,
      overrideReasonText: null,
      rootCauseCategory: 'Carrier Transit Delay',
      depotOrStoreName: targetIssue.distributionCenterName,
      carrierName: 'Nordic Crane Logistics',
      affectedSkuName: 'Heavy Structural Steel Lintels',
    });
  }

  reportIssueAndInvokeAiEngine(reportInput: NewIssueReportInput): DeliveryIssue | undefined {
    const targetOrder = this.deliveryOrders().find((o) => o.orderId === reportInput.orderId);
    if (!targetOrder) {
      return undefined;
    }

    const aiTriageResult = this.aiTriageEngine.analyzeDeliveryIssueAndGenerateRemedies({
      order: targetOrder,
      reportInput,
    });

    const newIssueId = `ISS-2026-${107 + this.deliveryIssues().length}`;
    const isAiAuto =
      aiTriageResult.recommendedHandlerMode === 'AI Autonomous (Path A - Green)' &&
      !this.isAutonomyPaused();
    const isHumanSpecialist =
      aiTriageResult.recommendedHandlerMode === 'Human Employee Led (Path C - Red)';

    const initialResolutionState: IssueResolutionState = isAiAuto
      ? 'Resolved by AI'
      : isHumanSpecialist
        ? 'Human Employee Resolving'
        : 'Waiting for Human Approval';

    const updatedOrderHealth: OrderHealthStatus = isAiAuto
      ? 'Issue Resolved'
      : isHumanSpecialist
        ? 'Issue Detected - Human Specialist Resolving'
        : 'Issue Detected - Awaiting Human Approval';

    const newIssue: DeliveryIssue = {
      issueId: newIssueId,
      orderId: targetOrder.orderId,
      distributionCenterName: targetOrder.distributionCenterName,
      customerName: targetOrder.customerName,
      customerSegment: targetOrder.customerSegment,
      siteLocationCity: targetOrder.destinationCity,
      orderValueEuros: targetOrder.orderValueEuros,
      siteCrewImpactNote: 'Active construction crew awaiting delivery on site',
      issueCategory: reportInput.issueCategory,
      issueTitle: `${reportInput.issueCategory} (${reportInput.reportedByRole})`,
      issueDescription: reportInput.issueDescription,
      handlerMode: aiTriageResult.recommendedHandlerMode,
      resolutionState: initialResolutionState,
      currentProgressStep: isAiAuto ? 'Resolved & Logged' : 'Governance Gate',
      assignedEmployeeOrAgentName: isAiAuto
        ? 'DelIQ AI Engine (Autonomous)'
        : isHumanSpecialist
          ? 'Senior Fleet Specialist (Human)'
          : 'Erik Lindqvist (Dispatcher)',
      remainingSlaCountdownText: '48 mins left',
      isSlaBreachImminent: !isAiAuto,
      urgencyEvaluation: aiTriageResult.urgencyEvaluation,
      systemTelemetrySnapshots: [
        {
          systemName: 'ERP (Order & Billing)',
          statusText: targetOrder.erpStatusSummary,
          lastUpdatedText: 'Just now',
          freshnessLevel: 'Live Sync',
          hasAnomalyWarning: false,
        },
        {
          systemName: 'WMS (Warehouse Stock)',
          statusText: `Flagged: ${reportInput.issueCategory}`,
          lastUpdatedText: 'Just now',
          freshnessLevel: 'Live Sync',
          hasAnomalyWarning: true,
        },
        {
          systemName: 'TMS (Transport Route)',
          statusText: targetOrder.tmsStatusSummary,
          lastUpdatedText: 'Just now',
          freshnessLevel: 'Live Sync',
          hasAnomalyWarning: true,
        },
        {
          systemName: 'Carrier GPS Feed',
          statusText: targetOrder.carrierStatusSummary,
          lastUpdatedText: 'Just now',
          freshnessLevel: targetOrder.dataFreshness,
          hasAnomalyWarning: false,
        },
      ],
      aiRemediationOptions: aiTriageResult.generatedOptions,
      selectedRemediationOptionId: aiTriageResult.recommendedOptionId,
      draftedCustomerMessage: aiTriageResult.draftedCustomerMessage,
      customerContactInfo: 'Site Foreman (+46 70 888 12 34)',
    };

    this.deliveryIssues.update((issues) => [newIssue, ...issues]);
    this.deliveryOrders.update((orders) =>
      orders.map((order) =>
        order.orderId === targetOrder.orderId
          ? {
              ...order,
              orderHealthStatus: updatedOrderHealth,
              wmsStatusSummary: `Issue: ${reportInput.issueCategory}`,
              linkedIssueId: newIssueId,
            }
          : order
      )
    );
    this.selectedOrderId.set(targetOrder.orderId);

    if (isAiAuto) {
      this.prependResolutionLog({
        logId: `LOG-${9005 + this.resolutionLogs().length}`,
        timestampText: 'Just now',
        issueId: newIssueId,
        orderId: targetOrder.orderId,
        handlerMode: 'AI Autonomous (Path A - Green)',
        actorType: 'AI Engine (Autonomous)',
        actorName: 'DelIQ AI Engine',
        actionSummary: `AI Engine automatically resolved low-risk issue (${reportInput.issueCategory}) and notified customer (€0 cost).`,
        wasAiRecommendationOverridden: false,
        overrideReasonText: null,
        rootCauseCategory: 'Site Access Info',
        depotOrStoreName: targetOrder.distributionCenterName,
        carrierName: targetOrder.carrierName,
        affectedSkuName: targetOrder.itemsSummary,
      });
    }

    return newIssue;
  }

  private updateIssueAndOrderStatus(
    issueId: string,
    orderId: string,
    resolutionState: IssueResolutionState,
    orderHealthStatus: OrderHealthStatus,
    progressStep: DeliveryIssue['currentProgressStep']
  ): void {
    this.deliveryIssues.update((issues) =>
      issues.map((issue) =>
        issue.issueId === issueId
          ? {
              ...issue,
              resolutionState,
              currentProgressStep: progressStep,
            }
          : issue
      )
    );

    this.deliveryOrders.update((orders) =>
      orders.map((order) =>
        order.orderId === orderId ? { ...order, orderHealthStatus } : order
      )
    );
  }

  private prependResolutionLog(entry: ResolutionActivityLog): void {
    this.resolutionLogs.update((logs) => [entry, ...logs]);
  }
}
