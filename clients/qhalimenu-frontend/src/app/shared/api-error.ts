import { HttpErrorResponse } from '@angular/common/http';

const MENSAJES: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Verifica que el API Gateway esté en ejecución.',
  400: 'Los datos enviados no son válidos. Revisa el formulario e inténtalo otra vez.',
  401: 'Tu sesión expiró. Vuelve a iniciar sesión para continuar.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  409: 'La operación entra en conflicto con el estado actual (por ejemplo, stock insuficiente).',
  500: 'Ocurrió un error interno en el servidor. Inténtalo nuevamente en unos segundos.',
  502: 'Un servicio no está disponible en este momento.',
  503: 'El servicio no está disponible. Inténtalo nuevamente en unos segundos.',
  504: 'El servicio tardó demasiado en responder.'
};

export function mensajeHttp(error: unknown, porDefecto = 'No se pudo completar la operación.'): string {
  if (error instanceof HttpErrorResponse) {
    const delServidor = error.error?.message;
    if (typeof delServidor === 'string' && delServidor.trim()) {
      return delServidor;
    }
    return MENSAJES[error.status] ?? porDefecto;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return porDefecto;
}

export function esErrorDeSesion(error: unknown): boolean {
  return error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403);
}
