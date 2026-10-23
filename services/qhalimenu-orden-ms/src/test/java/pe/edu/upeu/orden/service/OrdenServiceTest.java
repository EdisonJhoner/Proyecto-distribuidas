package pe.edu.upeu.orden.service;

import pe.edu.upeu.orden.client.dto.CatalogoProductoDto;
import pe.edu.upeu.orden.client.dto.ClienteDto;
import pe.edu.upeu.orden.dto.OrdenDetalleRequest;
import pe.edu.upeu.orden.dto.OrdenRequest;
import pe.edu.upeu.orden.dto.OrdenResponse;
import pe.edu.upeu.orden.entity.Orden;
import pe.edu.upeu.orden.event.OrdenEventoPublisher;
import pe.edu.upeu.orden.event.PagoValidadoEvento;
import pe.edu.upeu.orden.exception.AccesoDenegadoException;
import pe.edu.upeu.orden.exception.NegocioException;
import pe.edu.upeu.orden.exception.ServicioNoDisponibleException;
import pe.edu.upeu.orden.mapper.OrdenMapper;
import pe.edu.upeu.orden.repository.OrdenRepository;
import pe.edu.upeu.orden.resilience.CatalogoResiliente;
import pe.edu.upeu.orden.resilience.ClienteResiliente;
import pe.edu.upeu.orden.security.CurrentUserProvider;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrdenServiceTest {

    private OrdenRepository ordenRepository;
    private CatalogoResiliente catalogoResiliente;
    private ClienteResiliente clienteResiliente;
    private CurrentUserProvider currentUserProvider;
    private OrdenEventoPublisher ordenEventoPublisher;
    private OrdenService ordenService;

    @BeforeEach
    void setUp() {
        ordenRepository = mock(OrdenRepository.class);
        catalogoResiliente = mock(CatalogoResiliente.class);
        clienteResiliente = mock(ClienteResiliente.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        ordenEventoPublisher = mock(OrdenEventoPublisher.class);
        ordenService = new OrdenService(ordenRepository, new OrdenMapper(),
                catalogoResiliente, clienteResiliente, currentUserProvider, ordenEventoPublisher);
        when(ordenRepository.save(any(Orden.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void limpiarContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void calculaElTotalConLosPreciosRealesDelCatalogo() {
        when(currentUserProvider.getIdCliente()).thenReturn(1L);
        when(clienteResiliente.validarCliente(1L))
                .thenReturn(new ClienteDto(1L, "12345678", "Ana Perez"));
        when(catalogoResiliente.obtenerProducto(10L))
                .thenReturn(new CatalogoProductoDto(10L, "Menu del dia", new BigDecimal("8.50"), true));
        when(catalogoResiliente.obtenerProducto(11L))
                .thenReturn(new CatalogoProductoDto(11L, "Jugo", new BigDecimal("3.00"), true));

        OrdenResponse response = ordenService.crear(requestConDosDetalles(), "1");

        assertEquals(new BigDecimal("20.00"), response.getTotal());
        assertEquals("PENDIENTE_PAGO", response.getEstado());
        assertEquals("1", response.getIdCliente());
        assertEquals(2, response.getDetalles().size());
        assertEquals(new BigDecimal("8.50"), response.getDetalles().get(0).getPrecioUnitario());
        verify(clienteResiliente).validarCliente(1L);
        verify(ordenEventoPublisher).publicarOrdenCreada(any(Orden.class));
    }

    @Test
    void rechazaLaOrdenSiElCatalogoNoEstaDisponible() {
        when(currentUserProvider.getIdCliente()).thenReturn(1L);
        when(clienteResiliente.validarCliente(1L))
                .thenReturn(new ClienteDto(1L, "12345678", "Ana Perez"));
        when(catalogoResiliente.obtenerProducto(10L))
                .thenThrow(new ServicioNoDisponibleException("catalogo no disponible"));

        assertThrows(ServicioNoDisponibleException.class,
                () -> ordenService.crear(requestConDosDetalles(), "1"));
    }

    @Test
    void noCreaOrdenSiElTokenNoTieneIdCliente() {
        when(currentUserProvider.getIdCliente()).thenReturn(null);

        assertThrows(NegocioException.class,
                () -> ordenService.crear(requestConDosDetalles(), null));
    }

    @Test
    void clienteNoPuedeVerOrdenDeOtroCliente() {
        when(currentUserProvider.getIdClienteString()).thenReturn("1");
        Orden ordenAjena = Orden.builder().id(5L).idCliente("2").build();
        when(ordenRepository.findByIdConDetalles(5L)).thenReturn(Optional.of(ordenAjena));

        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "cliente1", null, List.of(new SimpleGrantedAuthority("ROLE_CLIENTE"))));

        assertThrows(AccesoDenegadoException.class, () -> ordenService.obtener(5L));
    }

    @Test
    void adminPuedeVerCualquierOrden() {
        Orden ordenAjena = Orden.builder().id(6L).idCliente("9").build();
        when(ordenRepository.findByIdConDetalles(6L)).thenReturn(Optional.of(ordenAjena));

        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));

        assertEquals(6L, ordenService.obtener(6L).getId());
    }

    @Test
    void aplicarResultadoPagoValidadoMarcaOrdenPagada() {
        Orden orden = Orden.builder().id(7L).idCliente("1").estado("PENDIENTE_PAGO").build();
        when(ordenRepository.findById(7L)).thenReturn(Optional.of(orden));

        ordenService.aplicarResultadoPago(
                PagoValidadoEvento.validado(7L, 100L, "SIM-1", new BigDecimal("20.00")));

        assertEquals("PAGADA", orden.getEstado());
        verify(ordenRepository).save(orden);
    }

    @Test
    void aplicarResultadoPagoFallidoCancelaOrden() {
        Orden orden = Orden.builder().id(8L).idCliente("1").estado("PENDIENTE_PAGO").build();
        when(ordenRepository.findById(8L)).thenReturn(Optional.of(orden));

        ordenService.aplicarResultadoPago(
                PagoValidadoEvento.fallido(8L, 101L, "SIM-2", new BigDecimal("20.00")));

        assertEquals("CANCELADA", orden.getEstado());
        verify(ordenRepository).save(orden);
    }

    @Test
    void aplicarResultadoPagoEsIdempotenteSiYaEstaPagada() {
        Orden orden = Orden.builder().id(9L).idCliente("1").estado("PAGADA").build();
        when(ordenRepository.findById(9L)).thenReturn(Optional.of(orden));

        ordenService.aplicarResultadoPago(
                PagoValidadoEvento.validado(9L, 102L, "SIM-3", new BigDecimal("20.00")));

        assertEquals("PAGADA", orden.getEstado());
        verify(ordenRepository, never()).save(orden);
    }

    @Test
    void unPagoFallidoTardioNoCancelaUnaOrdenYaPagada() {
        Orden orden = Orden.builder().id(10L).idCliente("1").estado("PAGADA").build();
        when(ordenRepository.findById(10L)).thenReturn(Optional.of(orden));

        ordenService.aplicarResultadoPago(
                PagoValidadoEvento.fallido(10L, 103L, "SIM-4", new BigDecimal("20.00")));

        assertEquals("PAGADA", orden.getEstado());
        verify(ordenRepository, never()).save(orden);
    }

    private OrdenRequest requestConDosDetalles() {
        OrdenDetalleRequest detalle1 = new OrdenDetalleRequest();
        detalle1.setIdProducto(10L);
        detalle1.setCantidad(2);

        OrdenDetalleRequest detalle2 = new OrdenDetalleRequest();
        detalle2.setIdProducto(11L);
        detalle2.setCantidad(1);

        OrdenRequest request = new OrdenRequest();
        request.setTipoComprobante("BOLETA");
        request.setMetodoPago("TARJETA");
        request.setMomentoPago("ANTICIPADO");
        request.setDetalles(List.of(detalle1, detalle2));
        return request;
    }
}
