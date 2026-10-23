package pe.edu.upeu.orden.controller;

import pe.edu.upeu.orden.dto.OrdenRequest;
import pe.edu.upeu.orden.dto.OrdenResponse;
import pe.edu.upeu.orden.security.CurrentUserProvider;
import pe.edu.upeu.orden.service.OrdenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ordenes")
@RequiredArgsConstructor
public class OrdenController {

    private final OrdenService ordenService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public List<OrdenResponse> listar() {
        return ordenService.listar();
    }

    @GetMapping("/{id}")
    public OrdenResponse obtener(@PathVariable Long id) {
        return ordenService.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrdenResponse crear(@Valid @RequestBody OrdenRequest request) {
        return ordenService.crear(request, currentUserProvider.getIdClienteString());
    }
}
