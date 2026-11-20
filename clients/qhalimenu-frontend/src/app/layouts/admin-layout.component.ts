import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeycloakService } from '../services/keycloak.service';
import { LogoComponent } from '../shared/logo/logo.component';
import { IconComponent, IconName } from '../shared/icon/icon.component';

interface EnlaceAdmin {
  ruta: string;
  etiqueta: string;
  icono: IconName;
  exacto?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogoComponent, IconComponent],
  template: `
    <div class="admin-shell" [class.is-open]="menuAbierto()">
      <aside class="admin-sidebar">
        <div class="admin-sidebar__brand">
          <app-logo />
          <button type="button" class="icon-btn admin-sidebar__close" (click)="menuAbierto.set(false)" aria-label="Cerrar menú">
            <app-icon name="close" [size]="20" />
          </button>
        </div>

        <nav class="admin-nav" aria-label="Panel administrativo">
          <span class="admin-nav__group">Operación</span>
          @for (enlace of enlaces; track enlace.ruta) {
            <a
              [routerLink]="enlace.ruta"
              routerLinkActive="is-active"
              [routerLinkActiveOptions]="{ exact: enlace.exacto ?? false }">
              <app-icon [name]="enlace.icono" [size]="18" />
              <span>{{ enlace.etiqueta }}</span>
            </a>
          }
        </nav>

        <div class="admin-sidebar__foot">
          <a class="admin-site-link" routerLink="/catalogo" target="_blank" rel="noopener">
            <app-icon name="external" [size]="16" /> Ver sitio público
          </a>
          <div class="admin-user">
            <span class="admin-user__avatar">{{ keycloak.iniciales() }}</span>
            <div class="admin-user__data">
              <strong>{{ keycloak.nombre() }}</strong>
              <small>{{ keycloak.rolPrincipal() }}</small>
            </div>
            <button type="button" class="icon-btn" (click)="keycloak.logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
              <app-icon name="logout" [size]="18" />
            </button>
          </div>
        </div>
      </aside>

      <div class="admin-backdrop" (click)="menuAbierto.set(false)"></div>

      <div class="admin-body">
        <header class="admin-topbar">
          <button type="button" class="icon-btn admin-topbar__toggle" (click)="menuAbierto.set(true)" aria-label="Abrir menú">
            <app-icon name="menu" [size]="22" />
          </button>
          <div class="admin-topbar__title">
            <span class="admin-topbar__eyebrow">QhaliMenu · Administración</span>
            <strong>{{ titulo() }}</strong>
          </div>
          <div class="admin-topbar__actions">
            <span class="admin-live"><span class="admin-live__dot"></span> Datos en vivo</span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="keycloak.logout()">
              <app-icon name="logout" [size]="16" /> Salir
            </button>
          </div>
        </header>

        <main class="admin-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AdminLayoutComponent {
  readonly keycloak = inject(KeycloakService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);
  readonly titulo = signal('Panel administrativo');

  readonly enlaces: EnlaceAdmin[] = [
    { ruta: '/admin', etiqueta: 'Resumen general', icono: 'chart', exacto: true },
    { ruta: '/admin/productos', etiqueta: 'Productos', icono: 'utensils' },
    { ruta: '/admin/categorias', etiqueta: 'Categorías', icono: 'filter' },
    { ruta: '/admin/ordenes', etiqueta: 'Órdenes', icono: 'package' },
    { ruta: '/admin/pagos', etiqueta: 'Pagos', icono: 'card' },
    { ruta: '/admin/clientes', etiqueta: 'Clientes', icono: 'users' }
  ];

  private readonly titulos: Record<string, string> = {
    '/admin': 'Resumen general',
    '/admin/productos': 'Gestión de productos',
    '/admin/categorias': 'Gestión de categorías',
    '/admin/ordenes': 'Gestión de órdenes',
    '/admin/pagos': 'Control de pagos',
    '/admin/clientes': 'Directorio de clientes'
  };

  constructor() {
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.menuAbierto.set(false);
        const url = this.router.url.split('?')[0];
        this.titulo.set(this.titulos[url] ?? 'Panel administrativo');
      });
  }

  @HostListener('document:keydown.escape')
  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
