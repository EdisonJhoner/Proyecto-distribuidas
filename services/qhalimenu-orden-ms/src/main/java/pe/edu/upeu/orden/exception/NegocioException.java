package pe.edu.upeu.orden.exception;

import org.springframework.http.HttpStatus;

public class NegocioException extends RuntimeException {

    private final HttpStatus status;

    public NegocioException(String message) {
        this(message, HttpStatus.BAD_REQUEST);
    }

    public NegocioException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
