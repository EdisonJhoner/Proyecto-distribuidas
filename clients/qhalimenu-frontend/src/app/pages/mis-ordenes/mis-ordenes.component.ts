import { DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Orden } from '../../models/orden.models';
import { KeycloakService } from '../../services/keycloak.service';
import { OrdenesService } from '../../services/ordenes.service';
import { ToastService } from '../../services/toast.service';
import { EstadoBadgeComponent } from '../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  etiquetaEstadoOrden,
  etiquetaMetodoPago,
  fechaCorta,
  horaCorta,
  unidadesDeOrden
} from '../../shared/utils';

type FiltroOrdenes = 'todas' | 'PENDIENTE_PAGO' | 'PAGADA' | 'ENTREGADA' | 'CANCELADA';

@Component({
  selector: 'app-mis-ordenes',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './mis-ordenes.component.html',
  styleUrl: './mis-ordenes.component.css'
})
export class MisOrdenesComponent implements OnInit, OnDestroy {
  private readonly ordenesService = inject(OrdenesService);
  private readonly toast = inject(ToastService);
  readonly keycloak = inject(KeycloakService);

  readonly ordenes = signal<Orden[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly filtro = signal<FiltroOrdenes>('todas');
  private temporizador?: ReturnType<typeof setInterval>;

  readonly filtros: { valor: FiltroOrdenes; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'PENDIENTE_PAGO', etiqueta: 'Pago pendiente' },
    { valor: 'PAGADA', etiqueta: 'Por recoger' },
    { valor: 'ENTREGADA', etiqueta: 'Entregadas' },
    { valor: 'CANCELADA', etiqueta: 'Canceladas' }
  ];

  readonly conteo = computed(() => {
    const mapa: Record<FiltroOrdenes, number> = {
      todas: this.ordenes().length,
      PENDIENTE_PAGO: 0,
      PAGADA: 0,
      ENTREGADA: 0,
      CANCELADA: 0
    };
    for (const orden of this.ordenes()) {
      if (orden.estado in mapa) {
        mapa[orden.estado as FiltroOrdenes] += 1;
      }
    }
    return mapa;
  });

  readonly filtradas = computed(() => {
    const filtro = this.filtro();
    return filtro === 'todas'
      ? this.ordenes()
      : this.ordenes().filter(orden => orden.estado === filtro);
  });

  readonly porRecoger = computed(() => this.ordenes().filter(orden => orden.estado === 'PAGADA').length);
  readonly entregadas = computed(() => this.ordenes().filter(orden => orden.estado === 'ENTREGADA').length);
  readonly pendientesPago = computed(() => this.ordenes().filter(orden => orden.estado === 'PENDIENTE_PAGO').length);

  ngOnInit(): void {
    this.cargar();
    this.temporizador = setInterval(() => this.cargar(true), 10_000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
    }
  }

  cargar(silencioso = false): void {
    if (!silencioso) {
      this.cargando.set(true);
    }
    this.ordenesService.misOrdenes().subscribe({
      next: ordenes => {
        this.ordenes.set(ordenes);
        this.error.set('');
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        if (!silencioso) {
          this.error.set('No se pudieron cargar tus reservas. Inténtalo nuevamente.');
        }
      }
    });
  }

  filtrar(filtro: FiltroOrdenes): void {
    this.filtro.set(filtro);
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

  unidades(orden: Orden): number {
    return unidadesDeOrden(orden);
  }

  fecha(orden: Orden): string {
    return `${fechaCorta(orden.fechaCreacion)} · ${horaCorta(orden.fechaCreacion)}`;
  }

  async copiarCodigo(codigo?: string): Promise<void> {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      this.toast.success('Código copiado', codigo);
    } catch {
      this.toast.info('Código de recojo', codigo);
    }
  }
}
