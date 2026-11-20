import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PagoFlujoService } from '../../services/pago-flujo.service';
import { ToastService } from '../../services/toast.service';
import { mensajeHttp } from '../../shared/api-error';
import { IconComponent } from '../../shared/icon/icon.component';

/** Página a la que Mercado Pago devuelve el navegador tras el checkout. */
@Component({
  selector: 'app-pago-retorno',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './pago-retorno.component.html',
  styleUrl: './pago-retorno.component.css'
})
export class PagoRetornoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pagoFlujo = inject(PagoFlujoService);
  private readonly toast = inject(ToastService);

  readonly cargando = signal(true);
  readonly mensaje = signal('Confirmando tu pago con Mercado Pago…');
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const preferenceId = params.get('preference_id');
    const externalReference = params.get('external_reference')
      ?? params.get('externalReference')
      ?? params.get('orden_id')
      ?? params.get('ordenId');
    if (!preferenceId && !externalReference) {
      this.cargando.set(false);
      this.error.set('No recibimos la confirmación de Mercado Pago. Revisa tus reservas.');
      return;
    }

    const collectionStatus = params.get('collection_status') ?? params.get('status');
    try {
      const resultado = await this.pagoFlujo.procesarRetorno(
        preferenceId,
        params.get('collection_status'),
        params.get('status'),
        externalReference
      );
      if (resultado.orden) {
        const rechazado = ['rejected', 'rechazado', 'cancelled', 'canceled', 'failure']
          .includes((collectionStatus ?? '').toLowerCase());
        if (resultado.estado === 'PAGADA') {
          this.toast.success('¡Pago aprobado!', 'Tu reserva está lista para recoger.');
        } else if (rechazado) {
          this.toast.error('Pago rechazado', resultado.mensaje);
        } else {
          this.toast.warning('Pago pendiente', resultado.mensaje);
        }
        // Siempre mostramos la boleta: ahí puede revisar el estado y reintentar.
        await this.router.navigate(['/boleta', resultado.orden.id], {
          queryParams: rechazado ? { pagoError: 1 } : { nuevo: 1 },
          replaceUrl: true
        });
        return;
      }
      this.mensaje.set(resultado.mensaje);
      this.toast.warning('Pago pendiente', resultado.mensaje);
    } catch (error) {
      this.error.set(mensajeHttp(error, 'No se pudo verificar el pago. Vuelve a intentarlo.'));
    } finally {
      this.cargando.set(false);
    }
  }
}
