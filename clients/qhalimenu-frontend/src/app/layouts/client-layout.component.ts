import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteHeaderComponent } from '../shared/site-header/site-header.component';
import { SiteFooterComponent } from '../shared/site-footer/site-footer.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent],
  template: `
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <app-site-header />
    <main id="contenido" class="app-main">
      <router-outlet />
    </main>
    <app-site-footer />
  `
})
export class ClientLayoutComponent {}
