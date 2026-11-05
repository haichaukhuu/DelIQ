import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { provideControlTowerDependencies } from './contracts/control-tower.providers';
import { NewDashboardStore } from './services/new-dashboard-store.service';

describe('App & Control Tower Dashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideControlTowerDependencies()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should navigate to /control/dashboard and render the Control Tower Dashboard header and tickets', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl('/control/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Control Tower Dashboard');
    expect(compiled.querySelector('.cnt')?.textContent).toContain('8 orders');
  });

  it('should approve a Path B ticket and log timeline entries via AI_TRIAGE_ENGINE', () => {
    const store = TestBed.inject(NewDashboardStore);
    const initialTimelineCount = store.tickets().find((t) => t.id === 'DQ-2038')?.tl.length ?? 0;

    store.setPick('DQ-2038', 1);
    const approved = store.approve('DQ-2038');

    expect(approved).toBe(true);
    const updated = store.tickets().find((t) => t.id === 'DQ-2038');
    expect(updated?.status).toBe('Resolved');
    expect(updated?.tl.length).toBe(initialTimelineCount + 2);
  });

  it('should reject a Path B ticket with reason and trigger AI re-planning timeline entry', () => {
    const store = TestBed.inject(NewDashboardStore);
    const rejected = store.reject('DQ-2036', 'Cost too high');

    expect(rejected).toBe(true);
    const updated = store.tickets().find((t) => t.id === 'DQ-2036');
    expect(updated?.status).toBe('Rejected');
    expect(updated?.tl.at(-1)?.text).toContain('Generating a new ranked plan');
  });

  it('should take ownership and resolve a Path C ticket', () => {
    const store = TestBed.inject(NewDashboardStore);

    expect(store.takeOwnership('DQ-2041')).toBe(true);
    expect(store.tickets().find((t) => t.id === 'DQ-2041')?.status).toBe('In progress');

    expect(store.markResolved('DQ-2041')).toBe(true);
    expect(store.tickets().find((t) => t.id === 'DQ-2041')?.status).toBe('Resolved');
  });
});
