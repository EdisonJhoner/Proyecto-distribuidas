import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { Cliente } from '../../../models/cliente.models';
import { Orden } from '../../../models/orden.models';
import { Pago } from '../../../models/pago.models';
import { ClientesService } from '../../../services/clientes.service';
import { OrdenesService } from '../../../services/ordenes.service';
import { PagosService } from '../../../services/pagos.service';
import { EstadoBadgeComponent } from '../../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  claveDia,
  esHoy,
  etiquetaEstadoOrden,
  etiquetaMetodoPago,
  fechaCorta,
  horaCorta
} from '../../../shared/utils';

interface BarraDia {
  etiqueta: string;
  clave: string;
  ordenes: number;
  monto: number;
}

interface ProductoRanking {
  nombre: string;
  unidades: number;
  monto: number;
}

interface MetodoResumen {
  metodo: string;
  etiqueta: string;
  cantidad: number;
  monto: number;
  color: string;
}

const COLORES_METODO: Record<string, string> = {
  TARJETA: 'var(--qm-green-700)',
  YAPE: 'var(--qm-terracotta)',
  PLIN: 'var(--qm-lime)',
  EFECTIVO: 'var(--qm-info)',
  MERCADOPAGO: 'var(--qm-green-500)'
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly ordenesService = inject(OrdenesService);
  private readonly pagosService = inject(PagosService);
  private readonly clientesService = inject(ClientesService);

  readonly ordenes = signal<Orden[]>([]);
  readonly pagos = signal<Pago[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly hoy = computed(() => new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }));

  readonly pagosProcesados = computed(() =>
    this.pagos().filter(pago => pago.estadoPago === 'PROCESADO'));

  readonly ingresos = computed(() =>
    this.pagosProcesados().reduce((total, pago) => total + Number(pago.monto || 0), 0));

  readonly ticketPromedio = computed(() => {
    const procesados = this.pagosProcesados();
    return procesados.length ? this.ingresos() / procesados.length : 0;
  });

  readonly totalOrdenes = computed(() => this.ordenes().length);

  readonly porRecoger = computed(() =>
    this.ordenes().filter(orden => orden.estado === 'PAGADA'));

  readonly pendientesPago = computed(() =>
    this.ordenes().filter(orden => orden.estado === 'PENDIENTE_PAGO'));

  readonly canceladas = computed(() =>
    this.ordenes().filter(orden => orden.estado === 'CANCELADA').length);

  readonly ordenesHoy = computed(() =>
    this.ordenes().filter(orden => esHoy(orden.fechaCreacion)).length);

  readonly ventasHoy = computed(() =>
    this.ordenes()
      .filter(orden => esHoy(orden.fechaCreacion) && (orden.estado === 'PAGADA' || orden.estado === 'ENTREGADA'))
      .reduce((total, orden) => total + Number(orden.total || 0), 0));

  readonly barras = computed<BarraDia[]>(() => {
    const dias: BarraDia[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      dias.push({
        etiqueta: fecha.toLocaleDateString('es-PE', { weekday: 'short' }),
        clave: claveDia(fecha),
        ordenes: 0,
        monto: 0
      });
    }
    for (const orden of this.ordenes()) {
      const fecha = new Date(orden.fechaCreacion);
      if (Number.isNaN(fecha.getTime())) continue;
      const dia = dias.find(item => item.clave === claveDia(fecha));
      if (!dia) continue;
      dia.ordenes += 1;
      if (orden.estado !== 'CANCELADA') {
        dia.monto += Number(orden.total || 0);
      }
    }
    return dias;
  });

  readonly maximoBarra = computed(() =>
    Math.max(1, ...this.barras().map(dia => dia.ordenes)));

  readonly topProductos = computed<ProductoRanking[]>(() => {
    const mapa = new Map<string, ProductoRanking>();
    for (const orden of this.ordenes()) {
      if (orden.estado === 'CANCELADA') continue;
      for (const detalle of orden.detalles ?? []) {
        const nombre = detalle.nombreProducto || `Producto #${detalle.idProducto}`;
        const actual = mapa.get(nombre) ?? { nombre, unidades: 0, monto: 0 };
        actual.unidades += detalle.cantidad;
        actual.monto += Number(detalle.precioUnitario || 0) * detalle.cantidad;
        mapa.set(nombre, actual);
      }
    }
    return [...mapa.values()].sort((a, b) => b.unidades - a.unidades).slice(0, 5);
  });

  readonly maximoProducto = computed(() =>
    Math.max(1, ...this.topProductos().map(item => item.unidades)));

  readonly metodos = computed<MetodoResumen[]>(() => {
    const mapa = new Map<string, MetodoResumen>();
    for (const orden of this.ordenes()) {
      if (orden.estado === 'CANCELADA') continue;
      const metodo = orden.metodoPago || 'OTRO';
      const actual = mapa.get(metodo) ?? {
        metodo,
        etiqueta: etiquetaMetodoPago(metodo),
        cantidad: 0,
        monto: 0,
        color: COLORES_METODO[metodo] ?? 'var(--qm-muted)'
      };
      actual.cantidad += 1;
      actual.monto += Number(orden.total || 0);
      mapa.set(metodo, actual);
    }
    return [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad);
  });

  readonly totalMetodos = computed(() =>
    this.metodos().reduce((total, item) => total + item.cantidad, 0));

  readonly donut = computed(() => {
    const metodos = this.metodos();
    const total = this.totalMetodos();
    if (!total) {
      return 'conic-gradient(var(--qm-cream-deep) 0 100%)';
    }
    let acumulado = 0;
    const segmentos = metodos.map(item => {
      const inicio = (acumulado / total) * 100;
      acumulado += item.cantidad;
      const fin = (acumulado / total) * 100;
      return `${item.color} ${inicio.toFixed(2)}% ${fin.toFixed(2)}%`;
    });
    return `conic-gradient(${segmentos.join(', ')})`;
  });

  readonly recientes = computed(() =>
    [...this.ordenes()]
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 6));

  readonly atencion = computed(() =>
    this.ordenes()
      .filter(orden => orden.estado === 'PENDIENTE_PAGO' || orden.estado === 'PAGADA')
      .sort((a, b) => new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime())
      .slice(0, 5));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    let fallos = 0;
    const proteger = <T>(origen: Observable<T[]>): Observable<T[]> =>
      origen.pipe(catchError(() => {
        fallos += 1;
        return of([] as T[]);
      }));

    forkJoin({
      ordenes: proteger(this.ordenesService.listar()),
      pagos: proteger(this.pagosService.listar()),
      clientes: proteger(this.clientesService.listar())
    }).subscribe({
      next: resultado => {
        this.ordenes.set(resultado.ordenes);
        this.pagos.set(resultado.pagos);
        this.clientes.set(resultado.clientes);
        this.cargando.set(false);
        if (fallos > 0) {
          this.error.set('Algunos servicios no respondieron. Los indicadores muestran solo los datos disponibles.');
        }
      },
      error: () => {
        this.cargando.set(false);
        this.error.set('No se pudieron cargar los indicadores. Verifica el API Gateway.');
      }
    });
  }

  alturaBarra(valor: number): string {
    if (valor <= 0) return '4px';
    return `${Math.max(10, Math.round((valor / this.maximoBarra()) * 100))}%`;
  }

  alturaProducto(unidades: number): string {
    return `${Math.max(4, Math.round((unidades / this.maximoProducto()) * 100))}%`;
  }

  porcentajeMetodo(cantidad: number): number {
    const total = this.totalMetodos();
    return total ? Math.round((cantidad / total) * 100) : 0;
  }

  etiqueta(estado: string): string {
    return etiquetaEstadoOrden(estado);
  }

  clase(estado: string): string {
    return claseEstadoOrden(estado);
  }

  fecha(orden: Orden): string {
    return `${fechaCorta(orden.fechaCreacion)} · ${horaCorta(orden.fechaCreacion)}`;
  }
}
