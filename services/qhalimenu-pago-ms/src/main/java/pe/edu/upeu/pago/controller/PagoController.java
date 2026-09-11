package pe.edu.upeu.pago.controller;

import pe.edu.upeu.pago.dto.PagoRequest;
import pe.edu.upeu.pago.dto.PagoResponse;
import pe.edu.upeu.pago.service.PagoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
public class PagoController {

    private static final String INIT_POINT_SIMULADO =
            "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=simulated_12345";

    private final PagoService pagoService;

    @GetMapping
    public List<PagoResponse> listar() {
        return pagoService.listar();
    }

    @GetMapping("/orden/{ordenId}")
    public List<PagoResponse> listarPorOrden(@PathVariable Long ordenId) {
        return pagoService.listarPorOrden(ordenId);
    }

    @GetMapping("/simulacion/{preferenceId}")
    public PagoResponse confirmarSimulacion(@PathVariable String preferenceId) {
        return pagoService.confirmarSimulacion(preferenceId);
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

    @PostMapping("/crear-preferencia")
    public ResponseEntity<PagoResponse> crearPreferencia(@RequestBody(required = false) PagoRequest request) {
        try {
            PagoRequest seguro = request != null ? request : new PagoRequest();
            return ResponseEntity.ok(pagoService.crearPreferencia(seguro));
        } catch (Throwable t) {
            log.error("Error crítico en PagoController: ", t);
            return ResponseEntity.ok(respuestaSimulacion(request));
        }
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<PagoResponse> manejarErrorDeEntrada(Throwable t) {
        log.error("Error crítico en PagoController: ", t);
        return ResponseEntity.ok(respuestaSimulacion(null));
    }

    private PagoResponse respuestaSimulacion(PagoRequest request) {
        Long ordenId = request != null && request.getOrdenId() != null ? request.getOrdenId() : 0L;
        BigDecimal monto = request != null && request.getMonto() != null ? request.getMonto() : BigDecimal.ZERO;
        return PagoResponse.builder()
                .ordenId(ordenId)
                .monto(monto)
                .metodoPago("MERCADOPAGO")
                .estadoPago("PENDIENTE")
                .initPoint(INIT_POINT_SIMULADO)
                .sandboxInitPoint(INIT_POINT_SIMULADO)
                .modoSimulacion(true)
                .build();
    }
}
