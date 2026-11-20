import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { mensajeHttp } from '../shared/api-error';
import { KeycloakService } from '../services/keycloak.service';
import { ToastService } from '../services/toast.service';

function esApiPropia(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl)
    || (environment.apiBaseUrl.startsWith('/') && url.startsWith(environment.apiBaseUrl));
}

function traceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `qm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const keycloak = inject(KeycloakService);
  const toast = inject(ToastService);

  if (!esApiPropia(req.url)) {
    return next(req);
  }

  const conTraza = req.clone({
    setHeaders: { 'X-Trace-ID': traceId() }
  });

  return from(keycloak.ensureToken()).pipe(
    switchMap(token => {
      const peticion = token
        ? conTraza.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : conTraza;
      return next(peticion);
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          toast.warning('Sesión no válida', 'Vuelve a iniciar sesión para continuar.');
        } else if (error.status === 403) {
          toast.error('Acceso denegado', 'Tu rol no permite realizar esta operación.');
        } else if (error.status === 0) {
          toast.error('Sin conexión con el API', mensajeHttp(error));
        }
      }
      return throwError(() => error);
    })
  );
};
