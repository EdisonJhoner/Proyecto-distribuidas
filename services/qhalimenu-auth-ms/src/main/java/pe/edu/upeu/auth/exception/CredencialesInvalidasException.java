package pe.edu.upeu.auth.exception;

import org.springframework.http.HttpStatus;

public class CredencialesInvalidasException extends NegocioException {

    public CredencialesInvalidasException(String message) {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}
