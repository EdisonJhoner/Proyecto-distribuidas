import { ApplicationConfig, LOCALE_ID, provideAppInitializer, provideZonelessChangeDetection, inject } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { KeycloakService } from './services/keycloak.service';

registerLocaleData(localeEsPe, 'es-PE');

/**
 * Keycloak se inicializa antes de arrancar la aplicación para que los guards
 * conozcan el estado real de la sesión (Authorization Code + PKCE).
 */
function inicializarSesion(): Promise<boolean> {
  return inject(KeycloakService).init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top'
      })
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(inicializarSesion),
    { provide: LOCALE_ID, useValue: 'es-PE' }
  ]
};
