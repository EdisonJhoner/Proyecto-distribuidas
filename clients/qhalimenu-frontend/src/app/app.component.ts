import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <header style="padding: 1rem; background: #1976d2; color: white; display: flex; gap: 1rem; align-items: center;">
      <a routerLink="/" style="color: white; text-decoration: none; font-weight: bold;">QhaliMenu</a>
      <a routerLink="/catalogo" style="color: white; text-decoration: none;">Catálogo</a>
      <a routerLink="/ordenes" style="color: white; text-decoration: none;">Mis Órdenes</a>
    </header>
    <main style="padding: 1rem;">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: []
})
export class AppComponent {
}
