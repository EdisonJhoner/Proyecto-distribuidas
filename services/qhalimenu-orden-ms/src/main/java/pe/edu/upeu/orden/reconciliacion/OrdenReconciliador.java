package pe.edu.upeu.orden.reconciliacion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.entity.OrdenDetalle;
import pe.edu.upeu.orden.repository.OrdenRepository;
import pe.edu.upeu.orden.resilience.CatalogoResiliente;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrdenReconciliador {

    public static final String ESTADO_PENDIENTE_PAGO = "PENDIENTE_PAGO";
    public static final String ESTADO_CANCELADA = "CANCELADA";

    private final OrdenRepository ordenRepository;
    private final CatalogoResiliente catalogoResiliente;

    @Value("${qhalimenu.saga.timeout-minutos:15}")
    private long timeoutMinutos;

    @Scheduled(
            fixedDelayString = "${qhalimenu.saga.reconciliacion-delay-ms:60000}",
            initialDelayString = "${qhalimenu.saga.reconciliacion-initial-delay-ms:30000}")
    @Transactional
    public void cancelarOrdenesEstancadas() {
        LocalDateTime limite = LocalDateTime.now().minusMinutes(timeoutMinutos);
        List<Orden> estancadas =
                ordenRepository.findByEstadoAndFechaCreacionBeforeConDetalles(ESTADO_PENDIENTE_PAGO, limite)
                        .stream()
                        // El efectivo está PENDIENTE_PAGO a propósito: espera a que Caja cobre.
                        // Cancelarlo aquí hace que el pedido desaparezca de la cola de recojo.
                        .filter(orden -> !"EFECTIVO".equalsIgnoreCase(String.valueOf(orden.getMetodoPago())))
                        .toList();
        if (estancadas.isEmpty()) {
            return;
        }
        estancadas.forEach(orden -> {
            restaurarStock(orden);
            orden.setEstado(ESTADO_CANCELADA);
        });
        ordenRepository.saveAll(estancadas);
        log.warn("Reconciliación: {} orden(es) PENDIENTE_PAGO estancadas (> {} min) canceladas",
                estancadas.size(), timeoutMinutos);
    }

    private void restaurarStock(Orden orden) {
        if (orden.getDetalles() == null) {
            return;
        }
        for (OrdenDetalle detalle : orden.getDetalles()) {
            catalogoResiliente.restaurarStock(detalle.getIdProducto(), detalle.getCantidad());
        }
    }
}
