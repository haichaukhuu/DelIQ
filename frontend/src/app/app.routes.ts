import { Routes } from '@angular/router';
import { ControlShellComponent } from './components/dashboard-shell/control-shell.component';
import { DashboardListComponent } from './components/dashboard/dashboard-list/dashboard-list.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', pathMatch: 'full', redirectTo: 'control/dashboard' },
  {
    path: 'control',
    component: ControlShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardListComponent },
    ],
  },
  { path: '**', redirectTo: 'control/dashboard' },
];
