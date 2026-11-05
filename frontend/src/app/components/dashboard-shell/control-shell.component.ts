import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-control-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './control-shell.component.html',
  styleUrl: './control-shell.component.scss',
})
export class ControlShellComponent {
  private readonly document = inject(DOCUMENT);
  readonly isSidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    const nextCollapsed = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(nextCollapsed);
    this.document.body?.classList.toggle('sidebar-min', nextCollapsed);
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
