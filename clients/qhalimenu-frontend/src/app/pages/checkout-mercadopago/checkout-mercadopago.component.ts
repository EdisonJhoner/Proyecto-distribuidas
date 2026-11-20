import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Orden } from '../../models/orden.models';
import { OrdenesService } from '../../services/ordenes.service';
import { PagoFlujoService } from '../../services/pago-flujo.service';
import { ToastService } from '../../services/toast.service';
import { mensajeHttp } from '../../shared/api-error';
import { IconComponent, IconName } from '../../shared/icon/icon.component';

type MetodoCheckout = 'TARJETA' | 'YAPE' | 'PLIN';

@Component({
  selector: 'app-checkout-mercadopago',
  standalone: true,
  imports: [DecimalPipe, RouterLink, IconComponent],
  templateUrl: './checkout-mercadopago.component.html',
  styleUrl: './checkout-mercadopago.component.css'
})
export class CheckoutMercadoPagoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordenes = inject(OrdenesService);
  private readonly pagoFlujo = inject(PagoFlujoService);
  private readonly toast = inject(ToastService);

  readonly preferenceId = this.route.snapshot.paramMap.get('preferenceId') ?? '';
  readonly ordenId = Number(this.route.snapshot.queryParamMap.get('ordenId'));

  readonly orden = signal<Orden | null>(null);
  readonly metodo = signal<MetodoCheckout>('TARJETA');
  readonly procesando = signal(false);
  readonly error = signal('');

  readonly opciones: { valor: MetodoCheckout; etiqueta: string; detalle: string; icono: IconName }[] = [
    { valor: 'TARJETA', etiqueta: 'Tarjeta', detalle: 'Crédito o débito (simulación)', icono: 'card' },
    { valor: 'YAPE', etiqueta: 'Yape', detalle: 'Billetera digital (simulación)', icono: 'wallet' },
    { valor: 'PLIN', etiqueta: 'Plin', detalle: 'Billetera digital (simulación)', icono: 'wallet' }
  ];

  readonly total = computed(() => this.orden()?.total ?? 0);

  ngOnInit(): void {
    if (!this.preferenceId || !this.ordenId) {
      this.error.set('No encontramos la preferencia de pago. Vuelve al carrito e inténtalo otra vez.');
      return;
    }
    this.ordenes.obtener(this.ordenId).subscribe({
      next: orden => this.orden.set(orden),
      error: () => this.error.set('No se pudo cargar la reserva asociada al pago.')
    });
  }

  async confirmar(): Promise<void> {
    if (this.procesando() || this.error()) return;
    this.procesando.set(true);
    this.error.set('');
    try {
      const resultado = await this.pagoFlujo.confirmarCheckoutSimulado(this.preferenceId, this.ordenId);
      if (resultado.estado === 'PAGADA') {
        this.toast.success('¡Pago confirmado!', 'Tu reserva está lista para recoger.');
      } else {
        this.toast.info('Pago registrado', resultado.mensaje);
      }
      await this.router.navigate(['/boleta', this.ordenId], { queryParams: { nuevo: 1 } });
    } catch (error) {
      this.error.set(mensajeHttp(error, 'No se pudo confirmar el pago. Vuelve a intentarlo.'));
    } finally {
      this.procesando.set(false);
    }
  }
}
