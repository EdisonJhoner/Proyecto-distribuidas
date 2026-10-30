import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {
  private keycloak: Keycloak | undefined;

  init(): Promise<boolean> {
    this.keycloak = new Keycloak({
      url: 'http://localhost:18180',
      realm: 'qhalimenu',
      clientId: 'qhalimenu-frontend'
    });

    return this.keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
      pkceMethod: 'S256'
    }).catch(() => false);
  }

  login(): void {
    this.keycloak?.login({ redirectUri: window.location.origin });
  }

  logout(): void {
    this.keycloak?.logout({ redirectUri: window.location.origin });
  }

  hasRole(role: string): boolean {
    const roles: string[] = this.keycloak?.tokenParsed?.['realm_access']?.['roles'] ?? [];
    return roles.includes(role);
  }

  isLoggedIn(): boolean {
    return !!this.keycloak?.authenticated;
  }

  getToken(): string | undefined {
    return this.keycloak?.token;
  }

  getUsername(): string | undefined {
    return this.keycloak?.tokenParsed?.['preferred_username'];
  }

  getEmail(): string | undefined {
    return this.keycloak?.tokenParsed?.['email'];
  }
}
