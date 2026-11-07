import { Routes } from '@angular/router';
import { ControlShellComponent } from './components/dashboard-shell/control-shell.component';
import { DashboardListComponent } from './components/dashboard/dashboard-list/dashboard-list.component';
import { SettingsComponent } from './components/settings/settings.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'control/dashboard' },
  {
    path: 'control',
    component: ControlShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardListComponent },
      { path: 'settings', component: SettingsComponent },
    ],
  },
  { path: '**', redirectTo: 'control/dashboard' },
];
