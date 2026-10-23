package pe.edu.upeu.orden.exception;

import org.springframework.http.HttpStatus;

public class AccesoDenegadoException extends NegocioException {

    public AccesoDenegadoException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
