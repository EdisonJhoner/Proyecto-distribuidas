package pe.edu.upeu.pago.controller;

import pe.edu.upeu.pago.dto.PagoRequest;
import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.service.PagoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class PagoController {

    private final PagoService pagoService;

    @GetMapping
    public List<PagoResponse> listar() {
        return pagoService.listar();
    }

    @GetMapping("/orden/{ordenId}")
    public List<PagoResponse> listarPorOrden(@PathVariable Long ordenId) {
        return pagoService.listarPorOrden(ordenId);
    }

    @GetMapping("/feedback")
    public PagoResponse feedback(@RequestParam("preference_id") String preferenceId,
                                 @RequestParam(value = "collection_status", required = false) String collectionStatus,
                                 @RequestParam(value = "status", required = false) String status) {
        return pagoService.procesarFeedback(preferenceId, collectionStatus, status);
    }

    @RequestMapping(value = "/webhook", method = {RequestMethod.GET, RequestMethod.POST})
    @ResponseStatus(HttpStatus.OK)
    public void webhook(@RequestParam(value = "preference_id", required = false) String preferenceId,
                        @RequestParam(value = "collection_status", required = false) String collectionStatus,
                        @RequestParam(value = "status", required = false) String status) {
        pagoService.procesarWebhook(preferenceId, collectionStatus, status);
    }

    @GetMapping("/{id}")
    public PagoResponse obtener(@PathVariable Long id) {
        return pagoService.obtener(id);
    }

    @PostMapping("/{id}/confirmar")
    public PagoResponse confirmar(@PathVariable Long id) {
        return pagoService.confirmarPago(id);
    }

    @PostMapping("/orden/{ordenId}/confirmar-efectivo")
    public PagoResponse confirmarEfectivo(@PathVariable Long ordenId) {
        return pagoService.confirmarEfectivoPorOrden(ordenId);
    }

    @PostMapping("/crear-preferencia")
    public PagoResponse crearPreferencia(@RequestBody(required = false) PagoRequest request) {
        return pagoService.crearPreferencia(request != null ? request : new PagoRequest());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> conflicto(IllegalStateException e) {
        log.warn("Conflicto al crear pago: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> entradaInvalida(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body("Datos de pago inválidos");
    }
}
