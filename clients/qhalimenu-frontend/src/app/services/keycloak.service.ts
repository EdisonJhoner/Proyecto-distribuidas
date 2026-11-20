import { Injectable, computed, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../environments/environment';

interface TokenParsed {
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  sub?: string;
  realm_access?: { roles?: string[] };
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class KeycloakService {
  private keycloak: Keycloak | undefined;
  private refresco?: ReturnType<typeof setInterval>;

  private readonly _listo = signal(false);
  private readonly _autenticado = signal(false);
  private readonly _disponible = signal(true);
  private readonly _tokenParsed = signal<TokenParsed | undefined>(undefined);

  readonly listo = this._listo.asReadonly();
  readonly autenticado = this._autenticado.asReadonly();
  readonly disponible = this._disponible.asReadonly();
  readonly perfil = this._tokenParsed.asReadonly();

  readonly roles = computed<string[]>(() => {
    const parsed = this._tokenParsed();
    const realm = parsed?.realm_access?.roles ?? [];
    const planos = parsed?.roles ?? [];
    return [...new Set([...realm, ...planos])];
  });

  readonly esAdmin = computed(() => this.roles().includes('ADMIN'));
  readonly esCaja = computed(() => this.roles().includes('CAJA') && !this.esAdmin());
  readonly esCliente = computed(() => !this.esAdmin() && !this.esCaja());

  readonly username = computed(() => this._tokenParsed()?.preferred_username ?? '');
  readonly email = computed(() => this._tokenParsed()?.email ?? '');
  readonly nombre = computed(() => {
    const parsed = this._tokenParsed();
    if (!parsed) return '';
    if (parsed.name?.trim()) return parsed.name.trim();
    if (parsed.given_name?.trim()) {
      return `${parsed.given_name} ${parsed.family_name ?? ''}`.trim();
    }
    return parsed.preferred_username ?? '';
  });
  readonly iniciales = computed(() => {
    const nombre = this.nombre() || this.username();
    const partes = nombre.split(/\s+/).filter(Boolean);
    if (!partes.length) return 'QM';
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  });
  readonly rolPrincipal = computed(() => {
    if (this.esAdmin()) return 'Administrador';
    if (this.esCaja()) return 'Caja';
    return 'Cliente';
  });

  async init(): Promise<boolean> {
    this.keycloak = new Keycloak(environment.keycloak);
    try {
      const autenticado = await this.keycloak.init({
        onLoad: 'check-sso',
        pkceMethod: 'S256',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}/assets/silent-check-sso.html`
      });
      this._autenticado.set(autenticado);
      this._tokenParsed.set(this.keycloak.tokenParsed as TokenParsed | undefined);
      this.programarRefresco();
      return autenticado;
    } catch {
      this._disponible.set(false);
      this._autenticado.set(false);
      return false;
    } finally {
      this._listo.set(true);
    }
  }

  login(redirectPath?: string): void {
    if (!this.keycloak) return;
    const ruta = redirectPath ?? `${window.location.pathname}${window.location.search}`;
    const destino = `${window.location.origin}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;
    void this.keycloak.login({ redirectUri: destino });
  }

  logout(): void {
    if (!this.keycloak) return;
    if (this.refresco) {
      clearInterval(this.refresco);
      this.refresco = undefined;
    }
    this._tokenParsed.set(undefined);
    this._autenticado.set(false);
    void this.keycloak.logout({ redirectUri: window.location.origin });
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  isLoggedIn(): boolean {
    return this._autenticado();
  }

  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  getUsername(): string | undefined {
    return this.username() || undefined;
  }

  getNombre(): string {
    return this.nombre() || this.username() || 'Cliente';
  }

  getEmail(): string | undefined {
    return this.email() || undefined;
  }

  /**
   * Renueva el access token si está por vencer. Se usa en el interceptor HTTP
   * para que ninguna llamada al Gateway viaje con un token caducado.
   */
  async ensureToken(minValiditySeconds = 30): Promise<string | undefined> {
    if (!this.keycloak?.authenticated) {
      return undefined;
    }
    try {
      await this.keycloak.updateToken(minValiditySeconds);
      this._tokenParsed.set(this.keycloak.tokenParsed as TokenParsed | undefined);
      return this.keycloak.token;
    } catch {
      this._autenticado.set(false);
      this._tokenParsed.set(undefined);
      return undefined;
    }
  }

  /** Redirección inicial sugerida según el rol del usuario autenticado. */
  rutaInicio(): string {
    if (this.esAdmin()) return '/admin';
    if (this.esCaja()) return '/caja';
    return '/catalogo';
  }

  private programarRefresco(): void {
    if (this.refresco) {
      clearInterval(this.refresco);
    }
    this.refresco = setInterval(() => {
      if (this.keycloak?.authenticated) {
        void this.ensureToken(60);
      }
    }, 30_000);
  }
}
