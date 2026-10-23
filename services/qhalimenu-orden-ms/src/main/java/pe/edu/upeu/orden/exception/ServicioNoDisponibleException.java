package pe.edu.upeu.orden.exception;

import org.springframework.http.HttpStatus;

public class ServicioNoDisponibleException extends NegocioException {

    public ServicioNoDisponibleException(String message, Throwable cause) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE);
        initCause(cause);
    }

    public ServicioNoDisponibleException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
