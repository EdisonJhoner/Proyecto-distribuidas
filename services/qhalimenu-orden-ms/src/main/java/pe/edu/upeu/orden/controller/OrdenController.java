package pe.edu.upeu.orden.controller;

import pe.edu.upeu.orden.dto.CierreDiaResponse;
import pe.edu.upeu.orden.dto.CodigoRecojoRequest;
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

    @GetMapping("/mis-ordenes")
    public List<OrdenResponse> listarMisOrdenes() {
        return ordenService.listarPorCliente(currentUserProvider.getIdClienteString());
    }

    @GetMapping("/pendientes-recojo")
    public List<OrdenResponse> listarPendientesRecojo() {
        return ordenService.listarPendientesRecojo();
    }

    @GetMapping("/codigo/{codigo}")
    public OrdenResponse obtenerPorCodigo(@PathVariable String codigo) {
        return ordenService.obtenerPorCodigo(codigo);
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

    @PostMapping("/entregar")
    public OrdenResponse entregar(@Valid @RequestBody CodigoRecojoRequest request) {
        return ordenService.entregarPorCodigo(request.getCodigo());
    }

    @PostMapping("/{id}/cancelar")
    public OrdenResponse cancelar(@PathVariable Long id) {
        return ordenService.cancelar(id);
    }

    @PostMapping("/cierre-dia")
    public CierreDiaResponse cierreDia() {
        return new CierreDiaResponse(ordenService.cancelarNoRecogidas());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        ordenService.eliminar(id);
    }
}
