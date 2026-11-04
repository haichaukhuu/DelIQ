import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-control-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './control-shell.component.html',
  styleUrl: './control-shell.component.scss',
})
export class ControlShellComponent {
  toggleSidebar() {
    document.body.classList.toggle('sidebar-min');
  }

  toggleTheme() {
    const r = document.documentElement;
    const dark = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    r.setAttribute('data-theme', dark ? 'light' : 'dark');
  }
}
