import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NewDashboardStore } from '../../services/new-dashboard-store.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly store = inject(NewDashboardStore);
  private readonly router = inject(Router);

  readonly username = signal<string>('');
  readonly password = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  onSubmit(): void {
    this.errorMessage.set(null);
    const ok = this.authService.login(this.username(), this.password());
    if (!ok) {
      this.errorMessage.set('Invalid email or password. Please use your employee credentials.');
      return;
    }

    void this.store.reloadWithDelay(5000);
    void this.router.navigateByUrl('/control/dashboard');
  }
}

