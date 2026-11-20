import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Orden } from '../../../models/orden.models';
import { ConfirmService } from '../../../services/confirm.service';
import { OrdenesService } from '../../../services/ordenes.service';
import { ToastService } from '../../../services/toast.service';
import { mensajeHttp } from '../../../shared/api-error';
import { EstadoBadgeComponent } from '../../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  esHoy,
  etiquetaEstadoOrden,
  etiquetaMetodoPago,
  fechaCorta,
  horaCorta,
  unidadesDeOrden
} from '../../../shared/utils';

type FiltroEstado = 'todas' | 'PENDIENTE_PAGO' | 'PAGADA' | 'ENTREGADA' | 'CANCELADA';
type FiltroPeriodo = 'todas' | 'hoy' | 'semana';
type Accion = 'entregar' | 'cancelar' | 'eliminar';

@Component({
  selector: 'app-admin-ordenes',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './admin-ordenes.component.html',
  styleUrl: './admin-ordenes.component.css'
})
export class AdminOrdenesComponent implements OnInit {
  private readonly ordenes = inject(OrdenesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly lista = signal<Orden[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly estado = signal<FiltroEstado>('todas');
  readonly periodo = signal<FiltroPeriodo>('todas');
  readonly limite = signal(20);

  readonly procesando = signal<string | null>(null);
  readonly cerrando = signal(false);

  readonly filtros: { valor: FiltroEstado; etiqueta: string }[] = [
    { valor: 'todas', etiqueta: 'Todas' },
    { valor: 'PENDIENTE_PAGO', etiqueta: 'Pendiente de pago' },
    { valor: 'PAGADA', etiqueta: 'Pagadas' },
    { valor: 'ENTREGADA', etiqueta: 'Entregadas' },
    { valor: 'CANCELADA', etiqueta: 'Canceladas' }
  ];

  readonly conteo = computed(() => {
    const mapa: Record<FiltroEstado, number> = {
      todas: this.lista().length,
      PENDIENTE_PAGO: 0,
      PAGADA: 0,
      ENTREGADA: 0,
      CANCELADA: 0
    };
    for (const orden of this.lista()) {
      if (orden.estado in mapa) {
        mapa[orden.estado as FiltroEstado] += 1;
      }
    }
    return mapa;
  });

  readonly total = computed(() => this.lista().length);
  readonly hoy = computed(() => this.lista().filter(orden => esHoy(orden.fechaCreacion)).length);
  readonly porRecoger = computed(() => this.lista().filter(orden => orden.estado === 'PAGADA').length);
  readonly pendientesPago = computed(() => this.lista().filter(orden => orden.estado === 'PENDIENTE_PAGO').length);
  readonly ingresos = computed(() =>
    this.lista()
      .filter(orden => orden.estado === 'PAGADA' || orden.estado === 'ENTREGADA')
      .reduce((total, orden) => total + Number(orden.total || 0), 0));

  readonly filtradas = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    const estado = this.estado();
    const periodo = this.periodo();
    const hace7Dias = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return this.lista()
      .filter(orden => {
        if (estado !== 'todas' && orden.estado !== estado) return false;
        const fecha = new Date(orden.fechaCreacion);
        if (periodo === 'hoy' && !esHoy(orden.fechaCreacion)) return false;
        if (periodo === 'semana' && (Number.isNaN(fecha.getTime()) || fecha.getTime() < hace7Dias)) return false;
        if (!termino) return true;
        const texto = this.normalizar(`${orden.id} ${orden.nombreCliente ?? ''} ${orden.codigoRecojo ?? ''} ${orden.metodoPago} ${orden.estado}`);
        return texto.includes(termino);
      })
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
  });

  readonly visibles = computed(() => this.filtradas().slice(0, this.limite()));
  readonly hayMas = computed(() => this.filtradas().length > this.visibles().length);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.ordenes.listar().subscribe({
      next: ordenes => {
        this.lista.set(ordenes);
        this.cargando.set(false);
      },
      error: error => {
        this.lista.set([]);
        this.cargando.set(false);
        this.error.set(mensajeHttp(error, 'No se pudieron cargar las órdenes.'));
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
    this.limite.set(20);
  }

  filtrarEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.limite.set(20);
  }

  cambiarPeriodo(evento: Event): void {
    this.periodo.set((evento.target as HTMLSelectElement).value as FiltroPeriodo);
    this.limite.set(20);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.estado.set('todas');
    this.periodo.set('todas');
    this.limite.set(20);
  }

  mostrarMas(): void {
    this.limite.update(valor => valor + 20);
  }

  async entregar(orden: Orden): Promise<void> {
    if (!orden.codigoRecojo) {
      this.toast.error('Sin código de recojo', 'Esta orden no tiene un código válido para entregar.');
      return;
    }
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Marcar como entregada?',
      mensaje: `La orden #${orden.id} pasará a estado ENTREGADA usando el código ${orden.codigoRecojo}.`,
      confirmar: 'Sí, entregar',
      cancelar: 'Volver'
    });
    if (!confirmado) return;

    const clave = `entregar-${orden.id}`;
    this.procesando.set(clave);
    this.ordenes.entregar(orden.codigoRecojo).subscribe({
      next: actualizada => {
        this.procesando.set(null);
        this.toast.success('Orden entregada', `#${actualizada.id} completada.`);
        this.cargar();
      },
      error: error => {
        this.procesando.set(null);
        this.toast.error('No se pudo entregar', mensajeHttp(error));
      }
    });
  }

  async cancelar(orden: Orden): Promise<void> {
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Cancelar la orden?',
      mensaje: `La orden #${orden.id} se cancelará y el stock de sus productos volverá al catálogo.`,
      confirmar: 'Sí, cancelar',
      cancelar: 'Conservar',
      peligro: true
    });
    if (!confirmado) return;

    const clave = `cancelar-${orden.id}`;
    this.procesando.set(clave);
    this.ordenes.cancelar(orden.id).subscribe({
      next: actualizada => {
        this.procesando.set(null);
        this.toast.info('Orden cancelada', `#${actualizada.id} · stock devuelto.`);
        this.cargar();
      },
      error: error => {
        this.procesando.set(null);
        this.toast.error('No se pudo cancelar', mensajeHttp(error));
      }
    });
  }

  async eliminar(orden: Orden): Promise<void> {
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Eliminar definitivamente?',
      mensaje: `La orden #${orden.id} se borrará del registro. Si estaba pagada o pendiente, el servidor devuelve el stock. Esta acción no se puede deshacer.`,
      confirmar: 'Sí, eliminar',
      cancelar: 'Conservar',
      peligro: true
    });
    if (!confirmado) return;

    const clave = `eliminar-${orden.id}`;
    this.procesando.set(clave);
    this.ordenes.eliminar(orden.id).subscribe({
      next: () => {
        this.procesando.set(null);
        this.toast.success('Orden eliminada', `#${orden.id}`);
        this.cargar();
      },
      error: error => {
        this.procesando.set(null);
        this.toast.error('No se pudo eliminar', mensajeHttp(error));
      }
    });
  }

  async cierreDia(): Promise<void> {
    if (this.cerrando()) return;
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Ejecutar cierre del día?',
      mensaje: 'El cierre procesa las órdenes pendientes según la regla del servicio. Revisa la cola antes de continuar.',
      confirmar: 'Ejecutar cierre',
      cancelar: 'Cancelar',
      peligro: true
    });
    if (!confirmado) return;

    this.cerrando.set(true);
    this.ordenes.cierreDia().subscribe({
      next: resultado => {
        this.cerrando.set(false);
        this.toast.success('Cierre del día ejecutado', `${resultado.canceladas} orden(es) cancelada(s).`);
        this.cargar();
      },
      error: error => {
        this.cerrando.set(false);
        this.toast.error('No se pudo ejecutar el cierre', mensajeHttp(error));
      }
    });
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

  fecha(orden: Orden): string {
    return `${fechaCorta(orden.fechaCreacion)} · ${horaCorta(orden.fechaCreacion)}`;
  }

  unidades(orden: Orden): number {
    return unidadesDeOrden(orden);
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
