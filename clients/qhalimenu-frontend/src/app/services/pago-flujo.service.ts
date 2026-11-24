import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Orden } from '../models/orden.models';
import { KeycloakService } from './keycloak.service';
import { OrdenesService } from './ordenes.service';
import { PagosService } from './pagos.service';

export type MetodoPagoUI = 'MERCADOPAGO' | 'EFECTIVO';

export interface ResultadoPago {
  /** PAGADA: la orden ya figura pagada. PENDIENTE: pago pendiente en pasarela/Caja.
   *  REDIRIGIDO: el checkout real se abrió en otra ventana. */
  estado: 'PAGADA' | 'PENDIENTE' | 'REDIRIGIDO';
  orden?: Orden;
  mensaje: string;
}

const espera = (ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms));

/**
 * Orquesta el flujo de pago contra los microservicios.
 * Mercado Pago SIEMPRE se atiende en su propio checkout (ventana externa);
 * QhaliMenu no contiene interfaz de pago simulada.
 */
@Injectable({ providedIn: 'root' })
export class PagoFlujoService {
  private readonly pagos = inject(PagosService);
  private readonly ordenes = inject(OrdenesService);
  private readonly keycloak = inject(KeycloakService);

  async pagar(
    orden: Orden,
    metodo: MetodoPagoUI,
    ventanaPago?: Window | null
  ): Promise<ResultadoPago> {
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
        mensaje: 'Reserva registrada. Muestra tu código en caja para pagar en efectivo.'
      };
    }

    if (pago.estadoPago === 'PROCESADO') {
      return this.esperarOrdenPagada(orden);
    }

    const destino = pago.sandboxInitPoint || pago.initPoint;
    if (!destino) {
      throw new Error('Mercado Pago no devolvió la URL de su checkout.');
    }

    const mensaje = 'Se abrió Mercado Pago en otra ventana. Completa el pago allí y vuelve a QhaliMenu para ver tu boleta.';
    if (ventanaPago && !ventanaPago.closed) {
      ventanaPago.location.href = destino;
      ventanaPago.focus();
      return { estado: 'REDIRIGIDO', orden, mensaje };
    }

    const abierta = window.open(destino, '_blank', 'popup,width=1100,height=800');
    if (!abierta) {
      throw new Error('El navegador bloqueó la ventana de pago. Permite ventanas emergentes e inténtalo otra vez.');
    }
    return { estado: 'REDIRIGIDO', orden, mensaje };
  }

  /** Procesa el retorno del checkout real de Mercado Pago (pago-retorno). */
  async procesarRetorno(
    preferenceId: string | null | undefined,
    collectionStatus?: string | null,
    status?: string | null,
    externalReference?: string | null
  ): Promise<ResultadoPago> {
    // Mercado Pago normalmente devuelve preference_id, pero en retornos manuales
    // puede llegar solo external_reference (el id de la orden).
    let referencia = preferenceId?.trim() || '';
    if (!referencia && externalReference) {
      const ordenId = Number(externalReference);
      if (Number.isFinite(ordenId) && ordenId > 0) {
        const pagosOrden = await firstValueFrom(this.pagos.listarPorOrden(ordenId));
        referencia = pagosOrden[pagosOrden.length - 1]?.preferenceId ?? '';
      }
    }
    if (!referencia) {
      throw new Error('Mercado Pago no devolvió la referencia del pago.');
    }

    const pago = await firstValueFrom(this.pagos.feedback(referencia, collectionStatus, status));
    const orden = await firstValueFrom(this.ordenes.obtener(pago.ordenId));
    if (pago.estadoPago === 'PROCESADO') {
      return this.esperarOrdenPagada(orden);
    }
    if (pago.estadoPago === 'RECHAZADO') {
      return {
        estado: 'PENDIENTE',
        orden,
        mensaje: 'Mercado Pago rechazó el pago. Puedes intentarlo de nuevo desde la boleta.'
      };
    }
    return {
      estado: 'PENDIENTE',
      orden,
      mensaje: 'Tu pago está pendiente en Mercado Pago. La reserva se actualizará al confirmarse.'
    };
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
