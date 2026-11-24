import { Pago } from '../models/pago.models';
import { Orden } from '../models/orden.models';
import {
  claseEstadoOrden,
  claseEstadoPago,
  cortar,
  esHoy,
  esOrdenPagada,
  estadoOrdenPermiteCancelar,
  etiquetaEstadoOrden,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  imagenProducto,
  porcentaje,
  totalProcesado,
  unidadesDeOrden
} from './utils';

describe('utils', () => {
  const ordenBase: Orden = {
    id: 1,
    idCliente: 'cli',
    fechaCreacion: new Date().toISOString(),
    estado: 'PAGADA',
    tipoComprobante: 'BOLETA',
    metodoPago: 'TARJETA',
    momentoPago: 'AHORA',
    total: 30
  };

  it('traduce estados de orden', () => {
    expect(etiquetaEstadoOrden('PAGADA')).toContain('Pagada');
    expect(etiquetaEstadoOrden('NO_EXISTE')).toBe('NO_EXISTE');
    expect(etiquetaEstadoOrden()).toBe('—');
  });

  it('asigna clases visuales a los estados', () => {
    expect(claseEstadoOrden('PAGADA')).toBe('is-paid');
    expect(claseEstadoOrden('ENTREGADA')).toBe('is-done');
    expect(claseEstadoOrden('CANCELADA')).toBe('is-cancelled');
    expect(claseEstadoOrden('PENDIENTE_PAGO')).toBe('is-pending');
    expect(claseEstadoOrden()).toBe('is-neutral');
  });

  it('traduce estados y métodos de pago', () => {
    expect(etiquetaEstadoPago('PROCESADO')).toBe('Procesado');
    expect(claseEstadoPago('RECHAZADO')).toBe('is-cancelled');
    expect(etiquetaMetodoPago('EFECTIVO')).toBe('Efectivo en caja');
    expect(etiquetaMetodoPago('YAPE')).toBe('Yape');
  });

  it('resuelve imágenes locales de forma determinista', () => {
    expect(imagenProducto({ nombre: 'Ceviche clásico' })).toContain('salmon');
    expect(imagenProducto({ nombre: 'Chicha morada' })).toContain('limonada');
    expect(imagenProducto({ nombre: 'Lomo saltado' })).toContain('plato-criollo');
    expect(imagenProducto(null)).toContain('mesa');
  });

  it('detecta si una fecha es de hoy', () => {
    expect(esHoy(new Date().toISOString())).toBeTrue();
    expect(esHoy('2000-01-01T10:00:00')).toBeFalse();
    expect(esHoy(null)).toBeFalse();
  });

  it('calcula unidades y reglas de negocio de la orden', () => {
    const orden: Orden = {
      ...ordenBase,
      detalles: [
        { id: 1, idProducto: 1, cantidad: 2, precioUnitario: 15 },
        { id: 2, idProducto: 2, cantidad: 1, precioUnitario: 5 }
      ]
    };
    expect(unidadesDeOrden(orden)).toBe(3);
    expect(esOrdenPagada(orden)).toBeTrue();
    expect(estadoOrdenPermiteCancelar(orden)).toBeTrue();
    expect(estadoOrdenPermiteCancelar({ ...orden, estado: 'ENTREGADA' })).toBeFalse();
  });

  it('suma solo los pagos procesados', () => {
    const pagos: Pago[] = [
      { ordenId: 1, monto: 20, metodoPago: 'MERCADOPAGO', estadoPago: 'PROCESADO' },
      { ordenId: 2, monto: 15, metodoPago: 'MERCADOPAGO', estadoPago: 'PENDIENTE' },
      { ordenId: 3, monto: 10, metodoPago: 'EFECTIVO', estadoPago: 'PROCESADO' }
    ];
    expect(totalProcesado(pagos)).toBe(30);
  });

  it('trunca texto y calcula porcentajes', () => {
    expect(cortar('Hola mundo', 5)).toBe('Hola…');
    expect(cortar(undefined)).toBe('');
    expect(porcentaje(1, 4)).toBe(25);
    expect(porcentaje(1, 0)).toBe(0);
  });
});
