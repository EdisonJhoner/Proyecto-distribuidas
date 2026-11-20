export type EstadoOrden = 'PENDIENTE_PAGO' | 'PAGADA' | 'ENTREGADA' | 'CANCELADA';

export type MetodoPago = 'TARJETA' | 'YAPE' | 'PLIN' | 'EFECTIVO' | 'MERCADOPAGO';

export interface DetalleOrden {
  id: number;
  idProducto: number;
  nombreProducto?: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Orden {
  id: number;
  idCliente: string;
  fechaCreacion: string;
  estado: EstadoOrden | string;
  tipoComprobante: string;
  metodoPago: MetodoPago | string;
  momentoPago: string;
  total: number;
  codigoRecojo?: string;
  nombreCliente?: string;
  fechaPago?: string;
  fechaEntrega?: string;
  detalles?: DetalleOrden[];
}

export interface OrdenDetalleRequest {
  idProducto: number;
  cantidad: number;
}

export interface OrdenRequest {
  tipoComprobante: string;
  metodoPago: string;
  momentoPago: string;
  nombreCliente?: string;
  detalles: OrdenDetalleRequest[];
}

export interface CierreDiaResponse {
  canceladas: number;
}
