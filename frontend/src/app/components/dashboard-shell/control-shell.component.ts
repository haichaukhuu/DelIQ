import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-control-shell',
  imports: [MatButtonModule, MatIconModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './control-shell.component.html',
  styleUrl: './control-shell.component.scss',
})
export class ControlShellComponent {
  private readonly document = inject(DOCUMENT);
  readonly isSidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }

  toggleTheme(): void {
    const rootElement = this.document.documentElement;
    const prefersDark =
      this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
    const isDark =
      rootElement.getAttribute('data-theme') === 'dark' ||
      (!rootElement.getAttribute('data-theme') && prefersDark);
    rootElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  }
}
