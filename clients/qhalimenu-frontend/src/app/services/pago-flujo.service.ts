import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Orden } from '../models/orden.models';
import { Pago } from '../models/pago.models';
import { KeycloakService } from './keycloak.service';
import { OrdenesService } from './ordenes.service';
import { PagosService } from './pagos.service';

export type MetodoPagoUI = 'TARJETA' | 'YAPE' | 'PLIN' | 'EFECTIVO';

export interface ResultadoPago {
  /** PAGADA: la orden ya figura pagada. PENDIENTE: pago enviado, la orden se actualizará. */
  estado: 'PAGADA' | 'PENDIENTE' | 'REDIRIGIDO';
  orden?: Orden;
  mensaje: string;
}

const espera = (ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms));

/**
 * Orquesta el flujo real de pago contra los microservicios:
 * preferencia -> confirmación (pasarela simulada / billetera) -> espera de la
 * actualización asíncrona de la orden (SAGA por Kafka).
 */
@Injectable({ providedIn: 'root' })
export class PagoFlujoService {
  private readonly pagos = inject(PagosService);
  private readonly ordenes = inject(OrdenesService);
  private readonly keycloak = inject(KeycloakService);

  async pagar(orden: Orden, metodo: MetodoPagoUI): Promise<ResultadoPago> {
    const pago = await firstValueFrom(this.pagos.crearPreferencia({
      ordenId: orden.id,
      monto: orden.total,
      metodoPago: metodo,
      email: this.keycloak.getEmail()
    }));

    if (metodo === 'EFECTIVO') {
      return {
        estado: 'PENDIENTE',
        orden,
        mensaje: 'Reserva registrada. El pago en efectivo se confirma en caja.'
      };
    }

    if (pago.estadoPago === 'PROCESADO') {
      return this.esperarOrdenPagada(orden);
    }

    if (metodo === 'YAPE' || metodo === 'PLIN') {
      await firstValueFrom(this.pagos.confirmarBilletera(orden.id));
      return this.esperarOrdenPagada(orden);
    }

    return this.confirmarTarjeta(orden, pago);
  }

  private async confirmarTarjeta(orden: Orden, pago: Pago): Promise<ResultadoPago> {
    if (pago.modoSimulacion && pago.preferenceId) {
      await firstValueFrom(this.pagos.confirmarSimulacion(pago.preferenceId));
      return this.esperarOrdenPagada(orden);
    }

    if (pago.initPoint) {
      window.location.href = pago.sandboxInitPoint || pago.initPoint;
      return {
        estado: 'REDIRIGIDO',
        orden,
        mensaje: 'Te redirigimos a la pasarela de pago.'
      };
    }

    return this.esperarOrdenPagada(orden);
  }

  private async esperarOrdenPagada(orden: Orden): Promise<ResultadoPago> {
    for (let intento = 0; intento < 15; intento += 1) {
      await espera(intento < 4 ? 500 : 900);
      try {
        const actual = await firstValueFrom(this.ordenes.obtener(orden.id));
        if (actual.estado === 'PAGADA' || actual.estado === 'ENTREGADA') {
          return {
            estado: 'PAGADA',
            orden: actual,
            mensaje: 'Pago confirmado. Tu reserva está lista para recoger.'
          };
        }
        if (actual.estado === 'CANCELADA') {
          return {
            estado: 'PENDIENTE',
            orden: actual,
            mensaje: 'El pago no se completó y la orden fue cancelada.'
          };
        }
      } catch {
        // La orden puede tardar en reflejarse; se reintenta sin interrumpir.
      }
    }

    return {
      estado: 'PENDIENTE',
      orden,
      mensaje: 'El pago fue enviado. La orden se actualizará en unos segundos.'
    };
  }
}
