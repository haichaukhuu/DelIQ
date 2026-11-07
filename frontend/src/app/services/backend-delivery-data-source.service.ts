import { Injectable } from '@angular/core';
import { DeliveryDataSourceContract } from '../contracts/delivery-data-source.contract';
import {
  Recommendation,
  TicketItem,
  TicketPath,
  TicketSeverity,
  TicketStatus,
  TimelineActor,
  TimelineEntry,
  TimelineTone,
} from '../models';

type BackendRecommendation = {
  id?: string;
  title: string;
  estimated_cost: number;
  probability_of_on_time: number;
  proposed_message?: string;
  status?: string;
};

type BackendEvent = {
  event_type?: string;
  occurred_at: string;
  source_system: string;
  description?: string;
  payload?: { carrier?: string };
};

type BackendAuditEntry = {
  created_at: string;
  actor: string;
  action: string;
  entity_id?: string;
  details?: {
    reason?: string;
    recommendation_title?: string;
    issue_type?: string;
  };
};

type BackendCase = {
  id: string;
  case_number: string;
  source_order_number: string;
  customer_type: 'B2B' | 'B2C';
  customer_tier: string;
  exception_type: string;
  severity: string;
  autonomy_path: string;
  status: string;
  owner_name?: string;
  order_value?: number;
  promised_window_end?: string;
  current_eta?: string;
  urgency_score: number;
  title: string;
  summary?: string;
  top_recommendation?: string;
  top_recommendation_cost?: number;
};

type CaseResponse = {
  case: BackendCase;
  events: BackendEvent[];
  recommendations: BackendRecommendation[];
  audit: BackendAuditEntry[];
};

@Injectable()
export class BackendDeliveryDataSourceService implements DeliveryDataSourceContract {
  private readonly baseUrl = '/api';

  async loadTickets(): Promise<TicketItem[]> {
    const cases = await this.request<BackendCase[]>('/cases?limit=200');
    const uniqueCases = this.deduplicateByOrderNumber(cases);
    return Promise.all(uniqueCases.map((item) => this.mapCase(item)));
  }

  async approve(ticketId: string, recommendationId: string | undefined, decidedBy: string): Promise<void> {
    await this.request(`/cases/${encodeURIComponent(ticketId)}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ recommendationId, decision: 'APPROVED', decidedBy }),
    });
  }

  async reject(ticketId: string, recommendationId: string | undefined, decidedBy: string, reason: string): Promise<void> {
    await this.request(`/cases/${encodeURIComponent(ticketId)}/approvals`, {
      method: 'POST',
      body: JSON.stringify({ recommendationId, decision: 'REJECTED', decidedBy, reason }),
    });
  }

  async takeOwnership(ticketId: string, ownerName: string): Promise<void> {
    await this.request(`/cases/${encodeURIComponent(ticketId)}/ownership`, {
      method: 'POST',
      body: JSON.stringify({ ownerName }),
    });
  }

  async resolve(ticketId: string, ownerName: string): Promise<void> {
    await this.request(`/cases/${encodeURIComponent(ticketId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolvedBy: ownerName }),
    });
  }

  private async mapCase(item: BackendCase): Promise<TicketItem> {
    const detail = await this.request<CaseResponse>(`/cases/${encodeURIComponent(item.id)}`);
    const path = this.mapPath(item.autonomy_path);
    const recommendations =
      path === 'C'
        ? []
        : detail.recommendations.map((recommendation) => this.mapRecommendation(recommendation));
    const carrier =
      detail.events.find((event) => event.payload?.carrier)?.payload?.carrier ?? 'Not assigned';
    return {
      id: item.source_order_number,
      backendId: item.id,
      name: item.title,
      tier: item.customer_type,
      customerTier: item.customer_tier,
      path,
      sev: this.mapSeverity(item.severity),
      type: this.mapExceptionType(item.exception_type),
      carrier,
      val: Number(item.order_value ?? 0),
      slaMinutes: this.slaMinutes(item.promised_window_end),
      urgencyScore: Number(item.urgency_score),
      status: this.mapStatus(item.status, path),
      info: item.summary ?? item.title,
      recs: recommendations,
      draft: path === 'C' ? '' : (recommendations[0]?.draft ?? 'No customer message has been drafted.'),
      tl: this.buildTimeline(detail),
      recommendationIds: path === 'C' ? [] : detail.recommendations.map((recommendation) => recommendation.id),
    };
  }

  private deduplicateByOrderNumber(cases: BackendCase[]): BackendCase[] {
    const byOrder = new Map<string, BackendCase>();
    for (const item of cases) {
      const existing = byOrder.get(item.source_order_number);
      if (!existing) {
        byOrder.set(item.source_order_number, item);
      } else if (
        !this.isCanonicalCaseNumber(existing.case_number) &&
        this.isCanonicalCaseNumber(item.case_number)
      ) {
        byOrder.set(item.source_order_number, item);
      }
    }
    return Array.from(byOrder.values());
  }

  private isCanonicalCaseNumber(caseNumber: string): boolean {
    return /^DLQ-00(0[1-9]|10)$/.test(caseNumber);
  }

  private buildTimeline(detail: CaseResponse): TimelineEntry[] {
    const hasRejectionAudit = detail.audit.some((entry) => entry.action === 'APPROVAL_REJECTED');
    const eventEntries = detail.events
      .filter((event) => !(hasRejectionAudit && event.event_type === 'ESCALATED_TO_PATH_C'))
      .map((event) =>
        this.timeline(
          event.occurred_at,
          this.eventActor(event),
          event.description ?? event.source_system,
          this.eventTone(event)
        )
      );
    const auditEntries = detail.audit.flatMap((entry) =>
      this.mapAuditEntry(entry, detail.recommendations)
    );
    return [...eventEntries, ...auditEntries];
  }

  private mapAuditEntry(
    entry: BackendAuditEntry,
    recommendations: BackendRecommendation[]
  ): TimelineEntry[] {
    switch (entry.action) {
      case 'APPROVAL_APPROVED': {
        const matchedTitle =
          entry.details?.recommendation_title ??
          recommendations.find((rec) => rec.id === entry.entity_id)?.title ??
          recommendations.find((rec) => rec.status === 'EXECUTED' || rec.status === 'APPROVED')?.title ??
          recommendations[0]?.title ??
          'Selected recommendation';
        return [
          this.timeline(entry.created_at, 'Dispatcher', `Approved: ${matchedTitle}`, 'hu'),
          this.timeline(entry.created_at, 'System', 'Action executed and audit entry recorded', 'ai'),
        ];
      }
      case 'APPROVAL_REJECTED': {
        const reason = entry.details?.reason || 'No reason specified';
        return [
          this.timeline(entry.created_at, 'Dispatcher', `Rejected recommendation. Reason: ${reason}`, 'no'),
          this.timeline(entry.created_at, 'AI', 'Case pushed to Path C (Human-led) for human takeover', 'ai'),
        ];
      }
      case 'TAKE_OWNERSHIP':
        return [
          this.timeline(entry.created_at, 'Dispatcher', 'Took ownership of this case', 'hu'),
        ];
      case 'MANUAL_RESOLUTION':
        return [
          this.timeline(entry.created_at, 'Dispatcher', 'Marked case as resolved', 'hu'),
        ];
      case 'CREATE_ISSUE_REPORT':
        return [
          this.timeline(
            entry.created_at,
            'Dispatcher',
            `Reported issue: ${entry.details?.issue_type ?? 'Manual report'}`,
            'hu'
          ),
        ];
      default:
        return [
          this.timeline(entry.created_at, this.actor(entry.actor), entry.action, 'hu'),
        ];
    }
  }

  private eventActor(event: BackendEvent): TimelineActor {
    if (event.event_type === 'CUSTOMER_REPLY' || event.source_system === 'CUSTOMER') return 'Customer';
    if (event.event_type === 'POD_DAMAGE_REPORTED') return 'Driver';
    if (event.source_system === 'MANUAL') return 'Dispatcher';
    if (event.event_type === 'AUDIT_LOGGED') return 'System';
    return 'AI';
  }

  private eventTone(event: BackendEvent): TimelineTone {
    const actor = this.eventActor(event);
    return actor === 'Customer' || actor === 'Driver' || actor === 'Dispatcher' ? 'hu' : 'ai';
  }

  private mapRecommendation(item: BackendRecommendation): Recommendation {
    return {
      title: item.title,
      speedText: item.probability_of_on_time >= 90 ? 'Within promised window' : 'Re-plan required',
      costText: `€${Number(item.estimated_cost).toLocaleString()}`,
      successProbability: Number(item.probability_of_on_time ?? 0),
      draft: item.proposed_message ?? '',
    };
  }

  private mapPath(path: string): TicketPath {
    if (path === 'GREEN') return 'A';
    if (path === 'AMBER') return 'B';
    return 'C';
  }

  private mapSeverity(severity: string): TicketSeverity {
    const normalized = severity.toLowerCase();
    if (normalized === 'critical') return 'Critical';
    if (normalized === 'high') return 'High';
    if (normalized === 'low') return 'Low';
    return 'Medium';
  }

  private mapExceptionType(exceptionType: string): string {
    switch (exceptionType) {
      case 'SHORT_PICK':
        return 'Short-pick / stockout';
      case 'STOCKOUT':
        return 'Stockout';
      case 'LATE_DISPATCH':
        return 'Late dispatch';
      case 'TRANSIT_DELAY':
        return 'Transit delay';
      case 'DELIVERY_FAILURE':
        return 'Delivery-day failure';
      case 'OTHER':
        return 'Missing information';
      default:
        return exceptionType;
    }
  }

  private mapStatus(status: string, path: TicketPath): TicketStatus {
    if (path === 'A' && (status === 'RESOLVED' || status === 'CLOSED' || status === 'OPEN')) {
      return 'Auto-resolved';
    }
    if (status === 'RESOLVED' || status === 'CLOSED') return 'Resolved';
    if (status === 'PENDING_APPROVAL') return 'Awaiting approval';
    if (status === 'IN_PROGRESS') return 'In progress';
    if (status === 'DISMISSED') return 'Rejected';
    if (path === 'C') return 'Human-led';
    return 'Awaiting approval';
  }

  private slaMinutes(value?: string): number {
    if (!value) return 0;
    return Math.max(0, Math.round((Date.parse(value) - Date.now()) / 60000));
  }

  private actor(value: string): TimelineActor {
    if (value === 'MANUAL' || value === 'Dispatcher' || value === 'Erik') return 'Dispatcher';
    if (value === 'CUSTOMER' || value === 'Customer') return 'Customer';
    if (value === 'CARRIER' || value === 'Driver') return 'Driver';
    return 'System';
  }

  private timeline(timestamp: string, actor: TimelineActor, text: string, cls: TimelineTone): TimelineEntry {
    return { time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), actor, text, cls };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error ?? `Backend request failed (${response.status})`);
    return body as T;
  }
}
