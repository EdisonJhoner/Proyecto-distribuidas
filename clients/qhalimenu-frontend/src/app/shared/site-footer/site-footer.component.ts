import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';
import { LogoComponent } from '../logo/logo.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, LogoComponent, IconComponent],
  template: `
    <footer class="site-footer">
      <div class="container site-footer__grid">
        <div class="site-footer__brand">
          <app-logo />
          <p>
            Almuerzos saludables, listos para recoger. Reserva en línea, paga seguro
            y recoge con tu boleta digital.
          </p>
          <span class="site-footer__tag">Proyecto académico · Arquitectura de microservicios</span>
        </div>

        <nav class="site-footer__col" aria-label="Explorar">
          <h3>Explorar</h3>
          <a routerLink="/catalogo">Menú de hoy</a>
          <a routerLink="/" fragment="como-funciona">Cómo funciona</a>
          <a routerLink="/" fragment="beneficios">Beneficios</a>
          @if (keycloak.autenticado()) {
            <a [routerLink]="keycloak.rutaInicio()">Mi panel</a>
          } @else {
            <a routerLink="/login">Iniciar sesión</a>
          }
        </nav>

        <div class="site-footer__col">
          <h3>Servicio</h3>
          <p><app-icon name="clock" [size]="16" /> Lun a Vie · 11:00 – 15:00</p>
          <p><app-icon name="map-pin" [size]="16" /> Campus universitario · Lima, Perú</p>
          <p><app-icon name="mail" [size]="16" /> soporte&#64;qhalimenu.local</p>
        </div>

        <div class="site-footer__col">
          <h3>Pagos y recojo</h3>
          <p class="site-footer__payments">
            <span class="pay-pill"><app-icon name="card" [size]="15" /> Mercado Pago</span>
            <span class="pay-pill"><app-icon name="cash" [size]="15" /> Efectivo</span>
          </p>
          <p class="site-footer__hint">
            Mercado Pago opera en entorno de prueba. El efectivo se paga al recoger.
          </p>
        </div>
      </div>

      <div class="container site-footer__bottom">
        <span>© {{ anio }} QhaliMenu. Todos los derechos reservados.</span>
        <span class="site-footer__badge">
          <app-icon name="shield" [size]="15" /> Autenticación segura con Keycloak
        </span>
      </div>
    </footer>
  `
})
export class SiteFooterComponent {
  readonly anio = new Date().getFullYear();
  readonly keycloak = inject(KeycloakService);
}
