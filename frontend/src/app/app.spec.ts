import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DELIVERY_DATA_SOURCE, DeliveryDataSourceContract } from './contracts/delivery-data-source.contract';
import { NewDashboardStore } from './services/new-dashboard-store.service';
import { MOCK_TICKETS } from './mock-data/mock-tickets.data';

class FakeDataSource implements DeliveryDataSourceContract {
  tickets = structuredClone(MOCK_TICKETS);
  settings = { killSwitch: false, autonomousPathA: true, llmEnabled: false, demoEnabled: true, scenarios: ['HERO_SHORT_PICK'] };
  async loadTickets() { return structuredClone(this.tickets); }
  async loadKpis() { return { open_cases: 8 }; }
  async loadSettings() { return this.settings; }
  async updateSettings(input: { killSwitch?: boolean; autonomousPathA?: boolean }) {
    if (input.killSwitch !== undefined) this.settings.killSwitch = input.killSwitch;
    if (input.autonomousPathA !== undefined) this.settings.autonomousPathA = input.autonomousPathA;
  }
  private find(ticketId: string) { return this.tickets.find((item) => (item.backendId && item.backendId === ticketId) || item.id === ticketId); }
  async approve(ticketId: string) { const ticket = this.find(ticketId); if (ticket) ticket.status = 'Resolved'; }
  async reject(ticketId: string) { const ticket = this.find(ticketId); if (ticket) ticket.status = 'Rejected'; }
  async takeOwnership(ticketId: string) { const ticket = this.find(ticketId); if (ticket) ticket.status = 'In progress'; }
  async resolve(ticketId: string) { const ticket = this.find(ticketId); if (ticket) ticket.status = 'Resolved'; }
  async runDetection() { return '2 cases detected'; }
  async injectScenario(scenario: string) { return `${scenario} injected`; }
  async resetDemo() { return 'Demo reset'; }
}

describe('App & Control Tower Dashboard', () => {
  let fake: FakeDataSource;

  beforeEach(async () => {
    fake = new FakeDataSource();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: DELIVERY_DATA_SOURCE, useValue: fake },
      ],
    }).compileComponents();
  });

  it('renders the queue', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/control/dashboard');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Control Tower Dashboard');
    expect(fixture.nativeElement.querySelector('.cnt')?.textContent).toContain('8 orders');
  });

  it('defaults to the first recommendation and reloads after approval', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await store.refresh();
    const ticket = store.tickets().find((item) => item.path === 'B')!;
    expect(store.picks()[ticket.id] ?? 0).toBe(0);
    expect(await store.approve(ticket.id)).toBe(true);
    expect(store.tickets().find((item) => item.id === ticket.id)?.status).toBe('Resolved');
  });

  it('supports ownership and reloads after resolution', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await store.refresh();
    const ticket = store.tickets().find((item) => item.path === 'C')!;
    expect(await store.takeOwnership(ticket.id)).toBe(true);
    expect(await store.markResolved(ticket.id)).toBe(true);
  });

  it('kill switch blocks approval and sorting remains deterministic', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await store.refresh();
    await store.updateAutonomousPathA(true);
    store.toggleKillSwitch();
    const amber = store.tickets().find((item) => item.path === 'B')!;
    expect(await store.approve(amber.id)).toBe(false);
    store.sort.set('urgency');
    expect(store.filtered().map((ticket) => ticket.urgencyScore)).toEqual([96, 90, 81, 74, 58, 45, 32, 25]);
  });

  it('returns a demo summary', async () => {
    const store = TestBed.inject(NewDashboardStore);
    expect(await store.injectScenario('HERO_SHORT_PICK')).toContain('injected');
  });
});
