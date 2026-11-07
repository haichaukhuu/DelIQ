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
  events: Array<{ occurred_at: string; source_system: string; description?: string }>;
  recommendations: BackendRecommendation[];
  audit: Array<{ created_at: string; actor: string; action: string; details?: { reason?: string } }>;
};

@Injectable()
export class BackendDeliveryDataSourceService implements DeliveryDataSourceContract {
  private readonly baseUrl = '/api';

  async loadTickets(): Promise<TicketItem[]> {
    const cases = await this.request<BackendCase[]>('/cases?limit=200');
    return Promise.all(cases.map((item) => this.mapCase(item)));
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
    const recommendations = detail.recommendations.map((recommendation) => this.mapRecommendation(recommendation));
    const path = this.mapPath(item.autonomy_path);
    return {
      id: item.source_order_number,
      backendId: item.id,
      name: item.title,
      tier: item.customer_type,
      customerTier: item.customer_tier,
      path,
      sev: this.mapSeverity(item.severity),
      type: item.exception_type,
      carrier: 'Not assigned',
      val: Number(item.order_value ?? 0),
      slaMinutes: this.slaMinutes(item.promised_window_end),
      urgencyScore: Number(item.urgency_score),
      status: this.mapStatus(item.status, path),
      info: item.summary ?? item.title,
      recs: recommendations,
      draft: recommendations[0]?.draft ?? 'No customer message has been drafted.',
      tl: [
        ...detail.events.map((event) => this.timeline(event.occurred_at, this.actor(event.source_system), event.description ?? event.source_system, 'ai')),
        ...detail.audit.map((entry) => this.timeline(entry.created_at, this.actor(entry.actor), entry.action, 'hu')),
      ],
      recommendationIds: detail.recommendations.map((recommendation) => recommendation.id),
    };
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

  private mapStatus(status: string, path: TicketPath): TicketStatus {
    if (status === 'RESOLVED' || status === 'CLOSED') return 'Resolved';
    if (status === 'PENDING_APPROVAL') return 'Awaiting approval';
    if (status === 'IN_PROGRESS') return 'In progress';
    if (status === 'DISMISSED') return 'Rejected';
    if (path === 'A') return 'Auto-resolved';
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
