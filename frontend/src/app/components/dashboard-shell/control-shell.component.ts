import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-control-shell',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './control-shell.component.html',
  styleUrl: './control-shell.component.scss',
})
export class ControlShellComponent {
  readonly isSidebarCollapsed = signal(false);

  toggleSidebar(): void {
    this.isSidebarCollapsed.update((collapsed) => !collapsed);
  }
}
