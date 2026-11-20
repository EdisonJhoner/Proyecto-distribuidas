export type EstadoPago = 'PENDIENTE' | 'PROCESADO' | 'RECHAZADO';

export interface Pago {
  id?: number;
  ordenId: number;
  monto: number;
  metodoPago: string;
  estadoPago: EstadoPago | string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  modoSimulacion: boolean;
  fechaPago?: string;
}

export interface PagoRequest {
  ordenId: number;
  monto: number;
  metodoPago: string;
  email?: string;
}
