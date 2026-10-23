package pe.edu.upeu.orden.reconciliacion;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.repository.OrdenRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrdenReconciliadorTest {

    private final OrdenRepository ordenRepository = mock(OrdenRepository.class);
    private final OrdenReconciliador reconciliador = new OrdenReconciliador(ordenRepository);

    OrdenReconciliadorTest() {
        ReflectionTestUtils.setField(reconciliador, "timeoutMinutos", 15L);
    }

    @Test
    void cancelaOrdenesPendientePagoEstancadas() {
        Orden estancada = Orden.builder().id(1L).idCliente("1").estado("PENDIENTE_PAGO").build();
        when(ordenRepository.findByEstadoAndFechaCreacionBefore(
                eq("PENDIENTE_PAGO"), any(LocalDateTime.class)))
                .thenReturn(List.of(estancada));

        reconciliador.cancelarOrdenesEstancadas();

        assertEquals("CANCELADA", estancada.getEstado());
        verify(ordenRepository).saveAll(anyList());
    }

    @Test
    void noHaceNadaSiNoHayOrdenesEstancadas() {
        when(ordenRepository.findByEstadoAndFechaCreacionBefore(
                eq("PENDIENTE_PAGO"), any(LocalDateTime.class)))
                .thenReturn(List.of());

        reconciliador.cancelarOrdenesEstancadas();

        verify(ordenRepository, never()).saveAll(anyList());
    }
}
