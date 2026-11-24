import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Orden } from '../../models/orden.models';
import { KeycloakService } from '../../services/keycloak.service';
import { OrdenesService } from '../../services/ordenes.service';
import { PagoFlujoService, MetodoPagoUI } from '../../services/pago-flujo.service';
import { ToastService } from '../../services/toast.service';
import { mensajeHttp } from '../../shared/api-error';
import { EstadoBadgeComponent } from '../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  etiquetaEstadoOrden,
  etiquetaMetodoPago,
  fechaLocal,
  horaCorta
} from '../../shared/utils';

@Component({
  selector: 'app-boleta',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './boleta.component.html',
  styleUrl: './boleta.component.css'
})
export class BoletaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ordenes = inject(OrdenesService);
  private readonly pagoFlujo = inject(PagoFlujoService);
  private readonly toast = inject(ToastService);
  readonly keycloak = inject(KeycloakService);

  readonly orden = signal<Orden | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly pagando = signal(false);
  readonly recienCreada = signal(false);
  readonly errorPago = signal(false);

  private temporizador?: ReturnType<typeof setInterval>;

  readonly esPendiente = computed(() => this.orden()?.estado === 'PENDIENTE_PAGO');
  readonly esPagada = computed(() => this.orden()?.estado === 'PAGADA');
  readonly esEntregada = computed(() => this.orden()?.estado === 'ENTREGADA');
  readonly esCancelada = computed(() => this.orden()?.estado === 'CANCELADA');

  readonly metodoOrden = computed<MetodoPagoUI>(() =>
    this.orden()?.metodoPago === 'EFECTIVO' ? 'EFECTIVO' : 'MERCADOPAGO'
  );

  readonly metodoEsEfectivo = computed(() => this.metodoOrden() === 'EFECTIVO');

  readonly volverRuta = computed(() => {
    if (this.keycloak.esCaja()) return '/caja';
    if (this.keycloak.esAdmin()) return '/admin/ordenes';
    return '/mis-ordenes';
  });

  readonly volverTexto = computed(() => {
    if (this.keycloak.esCaja()) return 'Volver a caja';
    if (this.keycloak.esAdmin()) return 'Volver a órdenes';
    return 'Volver a mis reservas';
  });

  ngOnInit(): void {
    this.recienCreada.set(this.route.snapshot.queryParamMap.get('nuevo') === '1');
    this.errorPago.set(this.route.snapshot.queryParamMap.get('pagoError') === '1');

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('La boleta solicitada no es válida.');
      this.cargando.set(false);
      return;
    }
    this.cargar(id);
    // La orden puede pasar a PAGADA cuando Kafka confirma el pago: refrescamos
    // la boleta mientras esté pendiente para mostrar el código de recojo.
    this.temporizador = setInterval(() => {
      if (this.esPendiente() && !this.pagando()) {
        this.cargar(id, true);
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
    }
  }

  cargar(id: number, silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    this.ordenes.obtener(id).subscribe({
      next: orden => {
        this.orden.set(orden);
        this.cargando.set(false);
        this.error.set('');
      },
      error: () => {
        if (!silencioso) {
          this.cargando.set(false);
          this.error.set('No pudimos cargar esta boleta. Verifica el número de orden e inténtalo otra vez.');
        }
      }
    });
  }

  fechaCreacion(): string {
    const fecha = fechaLocal(this.orden()?.fechaCreacion);
    if (!fecha) return '—';
    return `${fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })} · ${horaCorta(this.orden()?.fechaCreacion)}`;
  }

  fechaPago(): string {
    const valor = this.orden()?.fechaPago;
    if (!valor) return 'Pendiente';
    const fecha = fechaLocal(valor);
    if (!fecha) return 'Pendiente';
    return `${fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${horaCorta(valor)}`;
  }

  etiqueta(estado: string): string {
    return etiquetaEstadoOrden(estado);
  }

  clase(estado: string): string {
    return claseEstadoOrden(estado);
  }

  metodo(metodo: string): string {
    return etiquetaMetodoPago(metodo);
  }

  qrRecojo(codigo: string): string {
    return `${environment.qrApiUrl}?size=220x220&data=${encodeURIComponent(codigo)}`;
  }

  imprimir(): void {
    window.print();
  }

  async reintentarPago(): Promise<void> {
    const orden = this.orden();
    if (!orden || this.pagando()) return;
    if (this.metodoEsEfectivo()) {
      this.toast.info('Pago en efectivo', 'Muestra tu código en caja; el cajero registrará el cobro.');
      return;
    }

    const ventanaPago = this.metodoOrden() === 'MERCADOPAGO'
      ? window.open('', '_blank', 'popup,width=1100,height=800')
      : null;

    this.pagando.set(true);
    this.errorPago.set(false);
    try {
      const resultado = await this.pagoFlujo.pagar(orden, this.metodoOrden(), ventanaPago);
      if (resultado.estado === 'REDIRIGIDO') {
        this.toast.info('Pago en otra ventana', resultado.mensaje);
        return;
      }
      if (resultado.estado === 'PAGADA') {
        this.toast.success('Pago confirmado', 'Tu reserva está lista para recoger.');
        this.cargar(orden.id);
      } else {
        this.toast.info('Pago en proceso', resultado.mensaje);
        this.cargar(orden.id);
      }
      await this.router.navigate([], { queryParams: {}, replaceUrl: true });
      this.recienCreada.set(false);
    } catch (error) {
      if (ventanaPago && !ventanaPago.closed) {
        ventanaPago.location.href = `${window.location.origin}/boleta/${orden.id}?pagoError=1`;
        ventanaPago.focus();
      }
      this.toast.error('No se pudo completar el pago', mensajeHttp(error));
    } finally {
      this.pagando.set(false);
    }
  }
}
