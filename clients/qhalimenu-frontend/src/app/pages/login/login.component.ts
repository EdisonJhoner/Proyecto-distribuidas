import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KeycloakService } from '../../services/keycloak.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { LogoComponent } from '../../shared/logo/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly route = inject(ActivatedRoute);
  readonly keycloak = inject(KeycloakService);

  readonly cuentasDemo = [
    { rol: 'Cliente', usuario: 'cliente1', clave: 'Cliente123!', detalle: 'Reservas, pagos y boletas' },
    { rol: 'Caja', usuario: 'caja1', clave: 'Caja123!', detalle: 'Entrega con código o QR' },
    { rol: 'Administrador', usuario: 'admin', clave: 'Admin123!', detalle: 'Catálogo, pagos y reportes' }
  ];

  /**
   * Si no hay una ruta solicitada, se vuelve a /login: el guard de invitados
   * enviará al usuario ya autenticado a su panel según el rol real del token.
   */
  private destino(): string {
    const solicitado = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    const valido = solicitado.startsWith('/') && !solicitado.startsWith('//') && !solicitado.startsWith('/login');
    return valido ? solicitado : '/login';
  }

  ingresar(): void {
    this.keycloak.login(this.destino());
  }
}
