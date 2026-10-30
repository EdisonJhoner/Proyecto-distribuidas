import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { KeycloakService } from '../services/keycloak.service';

interface Orden {
  id: number;
  estado: string;
  total: number;
  metodoPago: string;
  fechaCreacion: string;
}

interface Pago {
  id?: number;
  ordenId: number;
  monto: number;
  metodoPago: string;
  estadoPago: string;
}

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Mis Órdenes</h2>

    <p *ngIf="ordenes.length === 0" class="vacio">Aún no tienes órdenes registradas.</p>

    <table *ngIf="ordenes.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Estado</th>
          <th>Método de pago</th>
          <th>Total</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let orden of ordenes">
          <td>{{ orden.id }}</td>
          <td>
            <span class="badge" [ngClass]="claseEstado(orden.estado)">{{ estadoLegible(orden.estado) }}</span>
          </td>
          <td>{{ metodoLegible(orden.metodoPago) }}</td>
          <td>S/ {{ orden.total | number:'1.2-2' }}</td>
          <td>{{ orden.fechaCreacion | date:'short' }}</td>
        </tr>
      </tbody>
    </table>

    <ng-container *ngIf="keycloak.hasRole('ADMIN')">
      <h2 class="titulo-seccion">Pagos en efectivo pendientes</h2>
      <p class="ayuda">Confirma aquí cuando el cliente entregue el dinero en efectivo.</p>

      <p *ngIf="cargandoPagos" class="vacio">Cargando pagos...</p>
      <p *ngIf="!cargandoPagos && pagosEfectivo.length === 0" class="vacio">
        No hay pagos en efectivo pendientes.
      </p>

      <table *ngIf="pagosEfectivo.length > 0">
        <thead>
          <tr>
            <th>Pago</th>
            <th>Orden</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let pago of pagosEfectivo">
            <td>{{ pago.id }}</td>
            <td>{{ pago.ordenId }}</td>
            <td>S/ {{ pago.monto | number:'1.2-2' }}</td>
            <td><span class="badge pendiente">{{ estadoLegible(pago.estadoPago) }}</span></td>
            <td>
              <button (click)="confirmarEfectivo(pago)" [disabled]="confirmando === pago.id">
                {{ confirmando === pago.id ? 'Confirmando...' : 'Confirmar efectivo' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="error" *ngIf="errorAdmin">{{ errorAdmin }}</p>
    </ng-container>
  `,
  styles: [`
    table { border-collapse: collapse; width: 100%; max-width: 820px; }
    th, td { border: 1px solid #d0d7de; padding: .55rem .7rem; text-align: left; }
    th { background: #f5f8fc; }
    .vacio { color: #666; }
    .ayuda { color: #666; margin-top: -.5rem; }
    .titulo-seccion { margin-top: 2rem; }
    .badge { display: inline-block; padding: .2rem .55rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
    .badge.pagada { background: #e8f5e9; color: #1b5e20; }
    .badge.pendiente { background: #fff8e1; color: #8a6100; }
    .badge.cancelada { background: #fdecea; color: #b3261e; }
    .badge.neutro { background: #eef1f4; color: #333; }
    button {
      background: #1976d2; color: #fff; border: 0; border-radius: 6px;
      padding: .45rem .8rem; cursor: pointer; font-weight: 600;
    }
    button:hover { background: #145ea8; }
    button:disabled { background: #9db8d6; cursor: not-allowed; }
    .error { background: #fdecea; color: #b3261e; border-radius: 6px; padding: .6rem .8rem; }
  `]
})
export class OrdenesComponent implements OnInit, OnDestroy {
  private readonly api = 'http://localhost:18080/api/v1';
  private temporizador?: ReturnType<typeof setInterval>;

  ordenes: Orden[] = [];
  pagosEfectivo: Pago[] = [];
  cargandoPagos = false;
  confirmando: number | null = null;
  errorAdmin = '';

  constructor(private http: HttpClient, public keycloak: KeycloakService) {}

  ngOnInit() {
    this.cargarOrdenes();
    if (this.esAdmin()) {
      this.cargarPagosEfectivo();
    }
    this.temporizador = setInterval(() => {
      this.cargarOrdenes();
      if (this.esAdmin()) {
        this.cargarPagosEfectivo();
      }
    }, 5000);
  }

  ngOnDestroy() {
    if (this.temporizador) {
      clearInterval(this.temporizador);
    }
  }

  cargarOrdenes() {
    this.http.get<Orden[]>(`${this.api}/ordenes/mis-ordenes`).subscribe({
      next: (data) => this.ordenes = data,
      error: () => this.ordenes = []
    });
  }

  cargarPagosEfectivo() {
    this.cargandoPagos = this.pagosEfectivo.length === 0;
    this.http.get<Pago[]>(`${this.api}/pagos`).subscribe({
      next: (pagos) => {
        this.pagosEfectivo = pagos.filter(
          pago => pago.metodoPago === 'EFECTIVO' && pago.estadoPago === 'PENDIENTE');
        this.cargandoPagos = false;
      },
      error: () => {
        this.cargandoPagos = false;
      }
    });
  }

  confirmarEfectivo(pago: Pago) {
    if (!pago.id) {
      return;
    }
    this.errorAdmin = '';
    this.confirmando = pago.id;

    this.http.post<Pago>(`${this.api}/pagos/${pago.id}/confirmar`, {}).subscribe({
      next: () => {
        this.confirmando = null;
        this.cargarPagosEfectivo();
        this.cargarOrdenes();
      },
      error: (err) => {
        this.confirmando = null;
        this.errorAdmin = err?.error?.message || 'No se pudo confirmar el pago en efectivo.';
      }
    });
  }

  esAdmin(): boolean {
    return this.keycloak.hasRole('ADMIN');
  }

  estadoLegible(estado: string): string {
    switch (estado) {
      case 'PENDIENTE_PAGO': return 'Pendiente de pago';
      case 'PAGADA': return 'Pagada';
      case 'CANCELADA': return 'Cancelada';
      case 'PROCESADO': return 'Procesado';
      case 'RECHAZADO': return 'Rechazado';
      case 'PENDIENTE': return 'Pendiente';
      default: return estado || '—';
    }
  }

  claseEstado(estado: string): string {
    switch (estado) {
      case 'PAGADA':
      case 'PROCESADO': return 'pagada';
      case 'PENDIENTE_PAGO':
      case 'PENDIENTE': return 'pendiente';
      case 'CANCELADA':
      case 'RECHAZADO': return 'cancelada';
      default: return 'neutro';
    }
  }

  metodoLegible(metodo: string): string {
    switch (metodo) {
      case 'EFECTIVO': return 'Efectivo';
      case 'TARJETA': return 'Tarjeta';
      case 'MERCADOPAGO': return 'MercadoPago';
      case 'YAPE_PLIN': return 'Yape / Plin';
      default: return metodo || '—';
    }
  }
}
