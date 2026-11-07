import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewDashboardStore } from '../../services/new-dashboard-store.service';

@Component({
  selector: 'app-demo-tools',
  standalone: true,
  template: `<section class="demo-tools" *ngIf="store.demoEnabled()">
    <button type="button" (click)="run()">Run detection</button>
    <button type="button" (click)="reset()">Reset demo</button>
    <select #scenario aria-label="Demo scenario">
      <option *ngFor="let item of store.scenarios()" [value]="item">{{ item }}</option>
    </select>
    <button type="button" (click)="inject(scenario.value)">Inject scenario</button>
    <span *ngIf="summary">{{ summary }}</span>
  </section>`,
  imports: [CommonModule],
})
export class DemoToolsComponent {
  readonly store = inject(NewDashboardStore);
  summary = '';
  async run(): Promise<void> { this.summary = await this.store.runDetection(); }
  async reset(): Promise<void> { this.summary = await this.store.resetDemo(); }
  async inject(scenario: string): Promise<void> { this.summary = await this.store.injectScenario(scenario); }
}
