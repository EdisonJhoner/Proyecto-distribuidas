import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Orden } from '../../../models/orden.models';
import { Pago } from '../../../models/pago.models';
import { ConfirmService } from '../../../services/confirm.service';
import { OrdenesService } from '../../../services/ordenes.service';
import { PagosService } from '../../../services/pagos.service';
import { ToastService } from '../../../services/toast.service';
import { mensajeHttp } from '../../../shared/api-error';
import { EstadoBadgeComponent } from '../../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import {
  claseEstadoPago,
  etiquetaEstadoPago,
  etiquetaMetodoPago,
  fechaCorta,
  horaCorta
} from '../../../shared/utils';

type FiltroEstadoPago = 'todos' | 'PENDIENTE' | 'PROCESADO' | 'RECHAZADO';

@Component({
  selector: 'app-admin-pagos',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './admin-pagos.component.html',
  styleUrl: './admin-pagos.component.css'
})
export class AdminPagosComponent implements OnInit {
  private readonly pagosService = inject(PagosService);
  private readonly ordenesService = inject(OrdenesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly pagos = signal<Pago[]>([]);
  readonly ordenes = signal<Orden[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly estado = signal<FiltroEstadoPago>('todos');
  readonly metodo = signal('todos');
  readonly confirmando = signal<number | null>(null);

  readonly filtros: { valor: FiltroEstadoPago; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
    { valor: 'PROCESADO', etiqueta: 'Procesados' },
    { valor: 'RECHAZADO', etiqueta: 'Rechazados' }
  ];

  readonly mapaOrdenes = computed(() => {
    const mapa = new Map<number, Orden>();
    for (const orden of this.ordenes()) {
      mapa.set(orden.id, orden);
    }
    return mapa;
  });

  readonly metodos = computed(() => {
    const set = new Set<string>();
    for (const pago of this.pagos()) {
      if (pago.metodoPago) set.add(pago.metodoPago);
    }
    return [...set].sort();
  });

  readonly conteo = computed(() => {
    const mapa: Record<FiltroEstadoPago, number> = {
      todos: this.pagos().length,
      PENDIENTE: 0,
      PROCESADO: 0,
      RECHAZADO: 0
    };
    for (const pago of this.pagos()) {
      if (pago.estadoPago in mapa) {
        mapa[pago.estadoPago as FiltroEstadoPago] += 1;
      }
    }
    return mapa;
  });

  readonly total = computed(() => this.pagos().length);
  readonly procesados = computed(() => this.pagos().filter(pago => pago.estadoPago === 'PROCESADO'));
  readonly montoProcesado = computed(() =>
    this.procesados().reduce((total, pago) => total + Number(pago.monto || 0), 0));
  readonly pendientes = computed(() => this.pagos().filter(pago => pago.estadoPago === 'PENDIENTE'));
  readonly efectivoPendiente = computed(() =>
    this.pendientes().filter(pago => pago.metodoPago === 'EFECTIVO').length);
  readonly rechazados = computed(() =>
    this.pagos().filter(pago => pago.estadoPago === 'RECHAZADO').length);

  readonly filtrados = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    const estado = this.estado();
    const metodo = this.metodo();
    return this.pagos()
      .filter(pago => {
        if (estado !== 'todos' && pago.estadoPago !== estado) return false;
        if (metodo !== 'todos' && pago.metodoPago !== metodo) return false;
        if (!termino) return true;
        const orden = this.mapaOrdenes().get(pago.ordenId);
        const texto = this.normalizar(`${pago.id ?? ''} ${pago.ordenId} ${pago.metodoPago} ${pago.estadoPago} ${pago.preferenceId ?? ''} ${orden?.nombreCliente ?? ''} ${orden?.codigoRecojo ?? ''}`);
        return texto.includes(termino);
      })
      .sort((a, b) => Number(b.id ?? 0) - Number(a.id ?? 0));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      pagos: this.pagosService.listar(),
      ordenes: this.ordenesService.listar().pipe(catchError(() => of([] as Orden[])))
    }).subscribe({
      next: resultado => {
        this.pagos.set(resultado.pagos);
        this.ordenes.set(resultado.ordenes);
        this.cargando.set(false);
      },
      error: error => {
        this.pagos.set([]);
        this.cargando.set(false);
        this.error.set(mensajeHttp(error, 'No se pudieron cargar los pagos.'));
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  filtrarEstado(valor: FiltroEstadoPago): void {
    this.estado.set(valor);
  }

  cambiarMetodo(evento: Event): void {
    this.metodo.set((evento.target as HTMLSelectElement).value);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estado.set('todos');
    this.metodo.set('todos');
  }

  async confirmar(pago: Pago): Promise<void> {
    if (pago.id === undefined) {
      this.toast.error('Pago sin identificador', 'No se puede confirmar este registro.');
      return;
    }
    const id = pago.id;
    const esEfectivo = pago.metodoPago === 'EFECTIVO';
    const confirmado = await this.confirm.confirmar({
      titulo: esEfectivo ? '¿Confirmar cobro en efectivo?' : '¿Confirmar este pago?',
      mensaje: `Se marcará como PROCESADO el pago de S/ ${Number(pago.monto).toFixed(2)} de la orden #${pago.ordenId}. La orden se actualizará de forma asíncrona mediante Kafka.`,
      confirmar: 'Sí, confirmar',
      cancelar: 'Revisar'
    });
    if (!confirmado) return;

    this.confirmando.set(id);
    this.pagosService.confirmarPago(id).subscribe({
      next: actualizado => {
        this.confirmando.set(null);
        this.toast.success(
          'Pago confirmado',
          `Orden #${pago.ordenId} · ${etiquetaMetodoPago(actualizado.metodoPago)}.`
        );
        setTimeout(() => this.cargar(), 900);
      },
      error: error => {
        this.confirmando.set(null);
        this.toast.error('No se pudo confirmar el pago', mensajeHttp(error));
      }
    });
  }

  ordenDe(ordenId: number): Orden | undefined {
    return this.mapaOrdenes().get(ordenId);
  }

  etiqueta(estado: string): string {
    return etiquetaEstadoPago(estado);
  }

  clase(estado: string): string {
    return claseEstadoPago(estado);
  }

  metodoLegible(metodo: string): string {
    return etiquetaMetodoPago(metodo);
  }

  fecha(pago: Pago): string {
    const valor = pago.fechaPago;
    if (!valor) return 'Sin fecha de pago';
    return `${fechaCorta(valor)} · ${horaCorta(valor)}`;
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
