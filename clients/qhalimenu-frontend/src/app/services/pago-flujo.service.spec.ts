import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Orden } from '../models/orden.models';
import { KeycloakService } from './keycloak.service';
import { OrdenesService } from './ordenes.service';
import { PagoFlujoService } from './pago-flujo.service';
import { PagosService } from './pagos.service';

describe('PagoFlujoService', () => {
  let servicio: PagoFlujoService;
  let pagos: jasmine.SpyObj<PagosService>;
  let ordenes: jasmine.SpyObj<OrdenesService>;

  const checkoutReal = 'https://sandbox.mercadopago.com.pe/checkout/v1/payment/redirect/real-1';

  const orden: Orden = {
    id: 7,
    idCliente: 'cli',
    fechaCreacion: new Date().toISOString(),
    estado: 'PENDIENTE_PAGO',
    tipoComprobante: 'BOLETA',
    metodoPago: 'MERCADOPAGO',
    momentoPago: 'AHORA',
    total: 25
  };

  const pagoPendiente = {
    ordenId: 7,
    monto: 25,
    metodoPago: 'MERCADOPAGO',
    estadoPago: 'PENDIENTE',
    preferenceId: 'pref-1',
    initPoint: 'https://www.mercadopago.com.pe/checkout/v1/payment/redirect/real-1',
    sandboxInitPoint: checkoutReal
  };

  beforeEach(() => {
    pagos = jasmine.createSpyObj<PagosService>('PagosService', [
      'crearPreferencia',
      'feedback',
      'listarPorOrden'
    ]);
    ordenes = jasmine.createSpyObj<OrdenesService>('OrdenesService', ['obtener']);

    pagos.crearPreferencia.and.returnValue(of(pagoPendiente));
    pagos.feedback.and.returnValue(of({ ...pagoPendiente, estadoPago: 'PROCESADO' }));

    TestBed.configureTestingModule({
      providers: [
        PagoFlujoService,
        { provide: PagosService, useValue: pagos },
        { provide: OrdenesService, useValue: ordenes },
        { provide: KeycloakService, useValue: { getEmail: () => 'cliente@upeu.edu.pe' } }
      ]
    });
    servicio = TestBed.inject(PagoFlujoService);
  });

  it('crea la preferencia con el total y el correo de la sesión', async () => {
    const ventana = { closed: false, location: { href: '' }, focus: () => {} } as unknown as Window;
    await servicio.pagar(orden, 'MERCADOPAGO', ventana);

    expect(pagos.crearPreferencia).toHaveBeenCalledWith({
      ordenId: 7,
      monto: 25,
      metodoPago: 'MERCADOPAGO',
      email: 'cliente@upeu.edu.pe'
    });
  });

  it('deja el efectivo pendiente de confirmación en caja', async () => {
    pagos.crearPreferencia.and.returnValue(of({ ...pagoPendiente, metodoPago: 'EFECTIVO' }));

    const resultado = await servicio.pagar(orden, 'EFECTIVO');

    expect(resultado.estado).toBe('PENDIENTE');
    expect(resultado.mensaje).toContain('caja');
  });

  it('carga el checkout real de Mercado Pago en la ventana abierta por el usuario', async () => {
    const ventana = {
      closed: false,
      location: { href: '' },
      focus: jasmine.createSpy('focus')
    } as unknown as Window;

    const resultado = await servicio.pagar(orden, 'MERCADOPAGO', ventana);

    expect(resultado.estado).toBe('REDIRIGIDO');
    expect(ventana.location.href).toBe(checkoutReal);
    expect(ventana.focus).toHaveBeenCalled();
  });

  it('abre una ventana nueva si no se preabrió en el clic', async () => {
    const ventana = { closed: false, location: { href: '' }, focus: () => {} } as unknown as Window;
    spyOn(window, 'open').and.returnValue(ventana);

    await servicio.pagar(orden, 'MERCADOPAGO');

    expect(window.open).toHaveBeenCalledWith(checkoutReal, '_blank', 'popup,width=1100,height=800');
  });

  it('avisa si Mercado Pago no devuelve la URL del checkout', async () => {
    pagos.crearPreferencia.and.returnValue(of({
      ...pagoPendiente,
      initPoint: undefined,
      sandboxInitPoint: undefined
    }));

    await expectAsync(servicio.pagar(orden, 'MERCADOPAGO')).toBeRejectedWithError(/URL de su checkout/);
  });

  it('al volver de Mercado Pago consulta el feedback y deja la orden pagada', async () => {
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'PAGADA' }));

    const resultado = await servicio.procesarRetorno('pref-real-1', 'approved', 'approved');

    expect(pagos.feedback).toHaveBeenCalledWith('pref-real-1', 'approved', 'approved');
    expect(resultado.estado).toBe('PAGADA');
  });

  it('al volver sin preference_id usa external_reference para recuperar el pago', async () => {
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'PAGADA' }));
    pagos.listarPorOrden.and.returnValue(of([
      { ...pagoPendiente, preferenceId: 'pref-real-1' },
      { ...pagoPendiente, preferenceId: 'pref-real-2' }
    ]));

    const resultado = await servicio.procesarRetorno(null, 'approved', 'approved', '7');

    expect(pagos.listarPorOrden).toHaveBeenCalledWith(7);
    expect(pagos.feedback).toHaveBeenCalledWith('pref-real-2', 'approved', 'approved');
    expect(resultado.estado).toBe('PAGADA');
  });

  it('informa la cancelación cuando la orden deja de estar pendiente', async () => {
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'CANCELADA' }));

    const resultado = await servicio.procesarRetorno('pref-real-1', 'approved', 'approved');

    expect(resultado.estado).toBe('PENDIENTE');
    expect(resultado.mensaje).toContain('cancelada');
  });
});
