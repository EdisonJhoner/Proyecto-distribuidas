package pe.edu.upeu.orden.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CodigoRecojoRequest {

    @NotBlank
    @Size(max = 20)
    private String codigo;
}
