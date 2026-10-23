package pe.edu.upeu.cliente.exception;

import org.springframework.http.HttpStatus;

public class AccesoDenegadoException extends RuntimeException {

    private final HttpStatus status;

    public AccesoDenegadoException(String mensaje) {
        super(mensaje);
        this.status = HttpStatus.FORBIDDEN;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
