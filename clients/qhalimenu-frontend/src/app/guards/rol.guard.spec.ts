import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';
import { KeycloakService } from '../services/keycloak.service';
import { adminGuard, authGuard, boletaGuard, cajaGuard, clienteGuard, invitadoGuard } from './rol.guard';

class KeycloakStub {
  auth = false;
  admin = false;
  caja = false;

  autenticado(): boolean {
    return this.auth;
  }

  esAdmin(): boolean {
    return this.admin;
  }

  esCaja(): boolean {
    return this.caja;
  }

  rutaInicio(): string {
    if (this.admin) return '/admin';
    if (this.caja) return '/caja';
    return '/catalogo';
  }
}

describe('guards de rol', () => {
  let keycloak: KeycloakStub;
  let router: Router;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/carrito' } as RouterStateSnapshot;

  const ejecutar = (guard: typeof authGuard): boolean | UrlTree =>
    TestBed.runInInjectionContext(() => guard(route, state)) as boolean | UrlTree;

  beforeEach(() => {
    keycloak = new KeycloakStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: KeycloakService, useValue: keycloak }
      ]
    });
    router = TestBed.inject(Router);
  });

  it('authGuard redirige a /login con returnUrl cuando no hay sesión', () => {
    const resultado = ejecutar(authGuard) as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/login?returnUrl=%2Fcarrito');
  });

  it('authGuard permite el paso con sesión activa', () => {
    keycloak.auth = true;
    expect(ejecutar(authGuard)).toBeTrue();
  });

  it('invitadoGuard deja entrar sin sesión y expulsa a un usuario autenticado', () => {
    expect(ejecutar(invitadoGuard)).toBeTrue();
    keycloak.auth = true;
    keycloak.admin = true;
    const resultado = ejecutar(invitadoGuard) as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/admin');
  });

  it('clienteGuard permite clientes y redirige a admin/caja', () => {
    keycloak.auth = true;
    expect(ejecutar(clienteGuard)).toBeTrue();

    keycloak.admin = true;
    expect(router.serializeUrl(ejecutar(clienteGuard) as UrlTree)).toBe('/admin');

    keycloak.admin = false;
    keycloak.caja = true;
    expect(router.serializeUrl(ejecutar(clienteGuard) as UrlTree)).toBe('/caja');
  });

  it('adminGuard exige rol ADMIN', () => {
    keycloak.auth = true;
    expect(router.serializeUrl(ejecutar(adminGuard) as UrlTree)).toBe('/catalogo');
    keycloak.admin = true;
    expect(ejecutar(adminGuard)).toBeTrue();
  });

  it('cajaGuard exige rol CAJA', () => {
    keycloak.auth = true;
    expect(router.serializeUrl(ejecutar(cajaGuard) as UrlTree)).toBe('/catalogo');
    keycloak.caja = true;
    expect(ejecutar(cajaGuard)).toBeTrue();
  });

  it('boletaGuard solo exige sesión', () => {
    expect(ejecutar(boletaGuard)).not.toBeTrue();
    keycloak.auth = true;
    expect(ejecutar(boletaGuard)).toBeTrue();
  });
});
