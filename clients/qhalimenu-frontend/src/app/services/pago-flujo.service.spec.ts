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

  const orden: Orden = {
    id: 7,
    idCliente: 'cli',
    fechaCreacion: new Date().toISOString(),
    estado: 'PENDIENTE_PAGO',
    tipoComprobante: 'BOLETA',
    metodoPago: 'TARJETA',
    momentoPago: 'AHORA',
    total: 25
  };

  const pagoPendiente = {
    ordenId: 7,
    monto: 25,
    metodoPago: 'TARJETA',
    estadoPago: 'PENDIENTE',
    modoSimulacion: true,
    preferenceId: 'pref-1'
  };

  beforeEach(() => {
    pagos = jasmine.createSpyObj<PagosService>('PagosService', [
      'crearPreferencia',
      'confirmarBilletera',
      'confirmarSimulacion'
    ]);
    ordenes = jasmine.createSpyObj<OrdenesService>('OrdenesService', ['obtener']);

    pagos.crearPreferencia.and.returnValue(of(pagoPendiente));
    pagos.confirmarBilletera.and.returnValue(of(pagoPendiente));
    pagos.confirmarSimulacion.and.returnValue(of({ ...pagoPendiente, estadoPago: 'PROCESADO' }));

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
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'PAGADA' }));
    await servicio.pagar(orden, 'TARJETA');
    expect(pagos.crearPreferencia).toHaveBeenCalledWith({
      ordenId: 7,
      monto: 25,
      metodoPago: 'TARJETA',
      email: 'cliente@upeu.edu.pe'
    });
  });

  it('deja el efectivo pendiente de confirmación en caja', async () => {
    pagos.crearPreferencia.and.returnValue(of({ ...pagoPendiente, metodoPago: 'EFECTIVO' }));
    const resultado = await servicio.pagar(orden, 'EFECTIVO');
    expect(resultado.estado).toBe('PENDIENTE');
    expect(resultado.mensaje).toContain('caja');
    expect(pagos.confirmarSimulacion).not.toHaveBeenCalled();
    expect(pagos.confirmarBilletera).not.toHaveBeenCalled();
  });

  it('para billeteras confirma el pago y espera la orden pagada', async () => {
    pagos.crearPreferencia.and.returnValue(of({ ...pagoPendiente, metodoPago: 'YAPE' }));
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'PAGADA' }));

    const resultado = await servicio.pagar(orden, 'YAPE');

    expect(pagos.confirmarBilletera).toHaveBeenCalledWith(7);
    expect(resultado.estado).toBe('PAGADA');
  });

  it('para tarjeta usa la pasarela simulada cuando corresponde', async () => {
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'PAGADA' }));

    const resultado = await servicio.pagar(orden, 'TARJETA');

    expect(pagos.confirmarSimulacion).toHaveBeenCalledWith('pref-1');
    expect(resultado.estado).toBe('PAGADA');
  });

  it('informa la cancelación cuando la orden deja de estar pendiente', async () => {
    ordenes.obtener.and.returnValue(of({ ...orden, estado: 'CANCELADA' }));

    const resultado = await servicio.pagar(orden, 'TARJETA');

    expect(resultado.estado).toBe('PENDIENTE');
    expect(resultado.mensaje).toContain('cancelada');
  });
});
