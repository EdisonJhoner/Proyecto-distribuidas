package pe.edu.upeu.orden.reconciliacion;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.edu.upeu.orden.service.OrdenService;

@Slf4j
@Component
@RequiredArgsConstructor
public class CierreDiaJob {

    private final OrdenService ordenService;

    @Scheduled(cron = "${qhalimenu.cierre.cron:0 0 22 * * *}", zone = "${qhalimenu.cierre.zona:America/Lima}")
    public void ejecutar() {
        int canceladas = ordenService.cancelarNoRecogidas();
        if (canceladas > 0) {
            log.warn("Cierre automático 22:00: {} orden(es) pagadas no recogidas canceladas (stock restaurado)",
                    canceladas);
        }
    }
}
