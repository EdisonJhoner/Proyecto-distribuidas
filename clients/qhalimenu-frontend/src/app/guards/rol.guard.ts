import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { KeycloakService } from '../services/keycloak.service';

/** Redirige a /login conservando la ruta solicitada para volver tras autenticarse. */
function exigirSesion(keycloak: KeycloakService, router: Router, url: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: url.startsWith('/') ? url : `/${url}` }
  });
}

export const authGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (keycloak.autenticado()) {
    return true;
  }
  return exigirSesion(keycloak, router, state.url);
};

export const invitadoGuard: CanActivateFn = () => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (!keycloak.autenticado()) {
    return true;
  }
  return router.parseUrl(keycloak.rutaInicio());
};

export const clienteGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (!keycloak.autenticado()) {
    return exigirSesion(keycloak, router, state.url);
  }
  if (keycloak.esAdmin() || keycloak.esCaja()) {
    return router.parseUrl(keycloak.rutaInicio());
  }
  return true;
};

export const cajaGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (!keycloak.autenticado()) {
    return exigirSesion(keycloak, router, state.url);
  }
  if (keycloak.esCaja()) {
    return true;
  }
  return router.parseUrl(keycloak.rutaInicio());
};

export const adminGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (!keycloak.autenticado()) {
    return exigirSesion(keycloak, router, state.url);
  }
  if (keycloak.esAdmin()) {
    return true;
  }
  return router.parseUrl(keycloak.rutaInicio());
};

export const boletaGuard: CanActivateFn = (_route, state) => {
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  if (!keycloak.autenticado()) {
    return exigirSesion(keycloak, router, state.url);
  }
  return true;
};
