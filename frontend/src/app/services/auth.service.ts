import { Injectable, signal } from '@angular/core';

const AUTH_STORAGE_KEY = 'deliq_demo_authenticated';
const DEFAULT_EMAIL = 'desmond@deliq.com';
const DEFAULT_PASSWORD = 'desmond123';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isAuthenticated = signal<boolean>(this.readSessionState());

  login(username: string, password: string): boolean {
    const normalizedUser = username.trim().toLowerCase();
    if (normalizedUser === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
      this.isAuthenticated.set(true);
      this.writeSessionState(true);
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.writeSessionState(false);
  }

  private readSessionState(): boolean {
    try {
      return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private writeSessionState(authenticated: boolean): void {
    try {
      if (typeof sessionStorage === 'undefined') {
        return;
      }
      if (authenticated) {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      } else {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors in SSR or restricted environments.
    }
  }
}

