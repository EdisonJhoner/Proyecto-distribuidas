package pe.edu.upeu.orden.reconciliacion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.repository.OrdenRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrdenReconciliador {

    public static final String ESTADO_PENDIENTE_PAGO = "PENDIENTE_PAGO";
    public static final String ESTADO_CANCELADA = "CANCELADA";

    private final OrdenRepository ordenRepository;

    @Value("${qhalimenu.saga.timeout-minutos:15}")
    private long timeoutMinutos;

    @Scheduled(
            fixedDelayString = "${qhalimenu.saga.reconciliacion-delay-ms:60000}",
            initialDelayString = "${qhalimenu.saga.reconciliacion-initial-delay-ms:30000}")
    @Transactional
    public void cancelarOrdenesEstancadas() {
        LocalDateTime limite = LocalDateTime.now().minusMinutes(timeoutMinutos);
        List<Orden> estancadas =
                ordenRepository.findByEstadoAndFechaCreacionBefore(ESTADO_PENDIENTE_PAGO, limite);
        if (estancadas.isEmpty()) {
            return;
        }
        estancadas.forEach(orden -> orden.setEstado(ESTADO_CANCELADA));
        ordenRepository.saveAll(estancadas);
        log.warn("Reconciliación: {} orden(es) PENDIENTE_PAGO estancadas (> {} min) canceladas",
                estancadas.size(), timeoutMinutos);
    }
}
