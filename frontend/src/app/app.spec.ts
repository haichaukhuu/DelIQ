import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DELIVERY_DATA_SOURCE } from './contracts/delivery-data-source.contract';
import { PlaceholderDeliveryDataSourceService } from './mock-data/placeholder-delivery-data-source.service';
import { AuthService } from './services/auth.service';
import { NewDashboardStore } from './services/new-dashboard-store.service';

describe('App & Control Tower Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: DELIVERY_DATA_SOURCE,
          useClass: PlaceholderDeliveryDataSourceService,
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should redirect unauthenticated users to /login and allow login with default employee credentials', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    auth.logout();

    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/control/dashboard');
    await fixture.whenStable();
    expect(router.url).toBe('/login');

    expect(auth.login('wrong@deliq.com', 'wrong')).toBe(false);
    expect(auth.login('desmond@deliq.com', 'desmond123')).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('should navigate to /control/dashboard and render the Control Tower Dashboard header and tickets', async () => {
    const auth = TestBed.inject(AuthService);
    auth.login('desmond@deliq.com', 'desmond123');
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/control/dashboard');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Control Tower Dashboard');
    expect(compiled.querySelector('.cnt')?.textContent).toContain('8 orders');
  });

  it('should approve a Path B ticket and log timeline entries', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await Promise.resolve();
    const initialTimelineCount = store.tickets().find((t) => t.id === 'DQ-2038')?.tl.length ?? 0;

    store.setPick('DQ-2038', 1);
    const approved = await store.approve('DQ-2038');

    expect(approved).toBe(true);
    const updated = store.tickets().find((t) => t.id === 'DQ-2038');
    expect(updated?.status).toBe('Resolved');
    expect(updated?.tl.length).toBe(initialTimelineCount + 2);
  });

  it('should reject a Path B ticket with reason and push it to Path C (Human-led)', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await Promise.resolve();
    const rejected = await store.reject('DQ-2036', 'Cost too high');

    expect(rejected).toBe(true);
    const updated = store.tickets().find((t) => t.id === 'DQ-2036');
    expect(updated?.path).toBe('C');
    expect(updated?.status).toBe('Human-led');
    expect(updated?.recs).toEqual([]);
    expect(updated?.tl.at(-1)?.text).toContain('pushed to Path C');
  });

  it('should take ownership and resolve a Path C ticket', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await Promise.resolve();

    expect(await store.takeOwnership('DQ-2041')).toBe(true);
    expect(store.tickets().find((t) => t.id === 'DQ-2041')?.status).toBe('In progress');

    expect(await store.markResolved('DQ-2041')).toBe(true);
    expect(store.tickets().find((t) => t.id === 'DQ-2041')?.status).toBe('Resolved');
  });

  it('should sort filtered tickets by the selected order', async () => {
    const store = TestBed.inject(NewDashboardStore);
    await Promise.resolve();

    store.sort.set('urgency');
    expect(store.filtered().map((ticket) => ticket.urgencyScore)).toEqual([96, 90, 81, 74, 58, 45, 32, 25]);

    store.sort.set('sla');
    expect(store.filtered().map((ticket) => ticket.slaMinutes)).toEqual([60, 95, 150, 210, 260, 300, 400, 500]);
  });
});
