import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KeycloakService } from '../../services/keycloak.service';
import { CarritoService } from '../../services/carrito.service';
import { LogoComponent } from '../logo/logo.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoComponent, IconComponent],
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.css'
})
export class SiteHeaderComponent {
  readonly keycloak = inject(KeycloakService);
  readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);
  readonly usuarioAbierto = signal(false);
  readonly desplazado = signal(false);

  readonly enInicio = computed(() => this.router.url === '/');
  readonly mostrarVolver = computed(() => !this.enInicio());

  constructor() {
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.menuAbierto.set(false);
        this.usuarioAbierto.set(false);
      });
  }

  @HostListener('window:scroll')
  alDesplazar(): void {
    this.desplazado.set(window.scrollY > 12);
  }

  @HostListener('document:keydown.escape')
  cerrarTodo(): void {
    this.menuAbierto.set(false);
    this.usuarioAbierto.set(false);
  }

  alternarUsuario(evento: Event): void {
    evento.stopPropagation();
    this.usuarioAbierto.update(valor => !valor);
  }

  @HostListener('document:click')
  cerrarUsuario(): void {
    this.usuarioAbierto.set(false);
  }

  alternarMenu(): void {
    this.menuAbierto.update(valor => !valor);
  }

  salir(): void {
    this.usuarioAbierto.set(false);
    this.keycloak.logout();
  }
}
