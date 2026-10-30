import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { KeycloakService } from '../services/keycloak.service';

interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
}

interface Orden {
  id: number;
  total: number;
  estado: string;
  metodoPago: string;
}

interface Pago {
  id?: number;
  ordenId: number;
  monto: number;
  metodoPago: string;
  estadoPago: string;
  preferenceId?: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  modoSimulacion: boolean;
}

type MetodoPago = 'EFECTIVO' | 'TARJETA';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <h2>Catálogo de Productos</h2>

    <p *ngIf="!keycloak.isLoggedIn()" class="aviso-sesion">
      Inicia sesión para poder ordenar y pagar.
    </p>

    <div class="grid">
      <div class="card" *ngFor="let producto of productos">
        <h3>{{ producto.nombre }}</h3>
        <p>{{ producto.descripcion }}</p>
        <p class="precio">S/ {{ producto.precio | number:'1.2-2' }}</p>
        <button (click)="abrirPago(producto)">
          {{ keycloak.isLoggedIn() ? 'Ordenar' : 'Iniciar sesión para ordenar' }}
        </button>
      </div>
    </div>

    <div class="overlay" *ngIf="productoSeleccionado" (click)="cerrar()">
      <div class="modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <ng-container *ngIf="!ordenCreada">
          <h3>Confirmar pedido</h3>

          <div class="resumen">
            <span>{{ productoSeleccionado.nombre }}</span>
            <strong>S/ {{ productoSeleccionado.precio | number:'1.2-2' }}</strong>
          </div>

          <h4>¿Cómo quieres pagar?</h4>
          <div class="metodos">
            <label class="metodo" [class.activo]="metodo === 'EFECTIVO'">
              <input type="radio" name="metodoPago" value="EFECTIVO" [(ngModel)]="metodo">
              <span class="icono">💵</span>
              <span>
                <strong>Efectivo</strong>
                <small>Pagas al recibir tu pedido</small>
              </span>
            </label>

            <label class="metodo" [class.activo]="metodo === 'TARJETA'">
              <input type="radio" name="metodoPago" value="TARJETA" [(ngModel)]="metodo">
              <span class="icono">💳</span>
              <span>
                <strong>Tarjeta</strong>
                <small>Crédito o débito (pago simulado)</small>
              </span>
            </label>
          </div>

          <div class="tarjeta-form" *ngIf="metodo === 'TARJETA'">
            <label>
              Número de tarjeta
              <input
                [ngModel]="tarjeta.numero"
                (ngModelChange)="tarjeta.numero = formatearNumero($event)"
                name="numeroTarjeta"
                inputmode="numeric"
                autocomplete="cc-number"
                placeholder="4111 1111 1111 1111"
                maxlength="19">
            </label>

            <label>
              Titular
              <input
                [(ngModel)]="tarjeta.titular"
                name="titularTarjeta"
                autocomplete="cc-name"
                placeholder="NOMBRE APELLIDO"
                maxlength="60">
            </label>

            <div class="fila">
              <label>
                Vencimiento
                <input
                  [ngModel]="tarjeta.vencimiento"
                  (ngModelChange)="tarjeta.vencimiento = formatearVencimiento($event)"
                  name="vencimientoTarjeta"
                  inputmode="numeric"
                  autocomplete="cc-exp"
                  placeholder="MM/AA"
                  maxlength="5">
              </label>

              <label>
                CVV
                <input
                  [(ngModel)]="tarjeta.cvv"
                  (ngModelChange)="tarjeta.cvv = soloDigitos($event, 4)"
                  name="cvvTarjeta"
                  inputmode="numeric"
                  autocomplete="cc-csc"
                  type="password"
                  placeholder="123"
                  maxlength="4">
              </label>
            </div>

            <p class="hint">Pago de demostración: no se cobra dinero real ni se envían datos de tarjeta al servidor.</p>
          </div>

          <p class="error" *ngIf="error">{{ error }}</p>

          <div class="acciones">
            <button class="secundario" type="button" (click)="cerrar()" [disabled]="procesando">Cancelar</button>
            <button type="button" (click)="confirmar()" [disabled]="procesando || !metodo">
              {{ procesando ? 'Procesando pago...' : 'Confirmar y pagar' }}
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="ordenCreada">
          <h3>{{ metodo === 'TARJETA' ? 'Pago con tarjeta aprobado' : 'Pedido registrado' }}</h3>
          <p class="exito">{{ mensajeExito }}</p>
          <div class="acciones">
            <button type="button" routerLink="/ordenes" (click)="cerrar()">Ver mis órdenes</button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .card { border: 1px solid #d0d7de; border-radius: 10px; padding: 1rem; background: #fff; }
    .card h3 { margin: 0 0 .5rem; }
    .card p { margin: .25rem 0; color: #555; }
    .precio { font-weight: 700; color: #1976d2 !important; font-size: 1.1rem; }
    .card button, .acciones button {
      background: #1976d2; color: #fff; border: 0; border-radius: 6px;
      padding: .55rem .9rem; cursor: pointer; font-weight: 600;
    }
    .card button:hover, .acciones button:hover { background: #145ea8; }
    .card button:disabled, .acciones button:disabled { background: #9db8d6; cursor: not-allowed; }
    .aviso-sesion { background: #fff8e1; border: 1px solid #ffe082; padding: .6rem .8rem; border-radius: 6px; }
    .overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, .55);
      display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 1000;
    }
    .modal {
      background: #fff; border-radius: 12px; padding: 1.4rem; width: 100%; max-width: 440px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, .3); max-height: 90vh; overflow-y: auto;
    }
    .modal h3 { margin: 0 0 1rem; }
    .modal h4 { margin: 1.1rem 0 .6rem; }
    .resumen {
      display: flex; justify-content: space-between; align-items: center;
      background: #f5f8fc; border-radius: 8px; padding: .7rem .9rem;
    }
    .metodos { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
    .metodo {
      display: flex; gap: .5rem; align-items: center; border: 1px solid #d0d7de;
      border-radius: 8px; padding: .7rem; cursor: pointer;
    }
    .metodo.activo { border-color: #1976d2; background: #eef5fd; }
    .metodo input { accent-color: #1976d2; }
    .metodo small { display: block; color: #666; font-size: .75rem; }
    .icono { font-size: 1.4rem; }
    .tarjeta-form { margin-top: 1rem; display: grid; gap: .7rem; }
    .tarjeta-form label { display: grid; gap: .3rem; font-size: .85rem; font-weight: 600; color: #333; }
    .tarjeta-form input {
      padding: .55rem .6rem; border: 1px solid #c7d0da; border-radius: 6px;
      font-size: .95rem; font-weight: 400;
    }
    .fila { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
    .hint { font-size: .78rem; color: #777; margin: .2rem 0 0; }
    .error { background: #fdecea; color: #b3261e; border-radius: 6px; padding: .6rem .8rem; margin-top: 1rem; }
    .exito { background: #e8f5e9; color: #1b5e20; border-radius: 6px; padding: .8rem; }
    .acciones { display: flex; justify-content: flex-end; gap: .6rem; margin-top: 1.2rem; }
    .acciones .secundario { background: #eef1f4; color: #333; }
    .acciones .secundario:hover { background: #dfe4e9; }
  `]
})
export class CatalogoComponent implements OnInit {
  private readonly api = 'http://localhost:18080/api/v1';

  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;
  metodo: MetodoPago | null = null;
  tarjeta = { numero: '', titular: '', vencimiento: '', cvv: '' };
  procesando = false;
  error = '';
  mensajeExito = '';
  ordenCreada: Orden | null = null;

  constructor(private http: HttpClient, public keycloak: KeycloakService) {}

  ngOnInit() {
    this.http.get<Producto[]>(`${this.api}/productos`).subscribe(data => {
      this.productos = data;
    });
  }

  abrirPago(producto: Producto) {
    if (!this.keycloak.isLoggedIn()) {
      this.keycloak.login();
      return;
    }
    this.productoSeleccionado = producto;
    this.metodo = null;
    this.tarjeta = { numero: '', titular: '', vencimiento: '', cvv: '' };
    this.procesando = false;
    this.error = '';
    this.mensajeExito = '';
    this.ordenCreada = null;
  }

  cerrar() {
    if (this.procesando) {
      return;
    }
    this.productoSeleccionado = null;
    this.ordenCreada = null;
    this.error = '';
  }

  confirmar() {
    this.error = '';

    if (!this.metodo) {
      this.error = 'Selecciona un método de pago.';
      return;
    }

    if (this.metodo === 'TARJETA') {
      const errorTarjeta = this.validarTarjeta();
      if (errorTarjeta) {
        this.error = errorTarjeta;
        return;
      }
    }

    const producto = this.productoSeleccionado;
    if (!producto) {
      return;
    }

    this.procesando = true;

    const orden = {
      tipoComprobante: 'BOLETA',
      metodoPago: this.metodo,
      momentoPago: 'ANTICIPADO',
      detalles: [{ idProducto: producto.id, cantidad: 1 }]
    };

    this.http.post<Orden>(`${this.api}/ordenes`, orden).subscribe({
      next: (creada) => {
        if (this.metodo === 'EFECTIVO') {
          this.mostrarExito(creada,
            `Orden #${creada.id} registrada por S/ ${Number(creada.total).toFixed(2)}. ` +
            `Paga en efectivo al recibir tu pedido.`);
          return;
        }
        this.pagarConTarjeta(creada);
      },
      error: (err) => {
        this.procesando = false;
        this.error = this.mensajeError(err);
      }
    });
  }

  private pagarConTarjeta(orden: Orden) {
    const body = {
      ordenId: orden.id,
      monto: orden.total,
      metodoPago: 'TARJETA',
      email: this.keycloak.getEmail()
    };

    this.http.post<Pago>(`${this.api}/pagos/crear-preferencia`, body).subscribe({
      next: (pago) => this.resolverPago(orden, pago),
      error: (err) => {
        this.procesando = false;
        this.error = `La orden #${orden.id} se creó, pero no se pudo iniciar el pago: ` +
          this.mensajeError(err);
      }
    });
  }

  private resolverPago(orden: Orden, pago: Pago) {
    if (pago.estadoPago === 'PROCESADO') {
      this.mostrarExito(orden, `Pago con tarjeta aprobado. Orden #${orden.id} pagada por ` +
        `S/ ${Number(orden.total).toFixed(2)}.`);
      return;
    }

    if (pago.modoSimulacion && pago.initPoint) {
      // En modo simulación el initPoint apunta al endpoint interno de confirmación.
      this.http.get<Pago>(pago.initPoint).subscribe({
        next: (confirmado) => {
          if (confirmado.estadoPago === 'PROCESADO') {
            this.mostrarExito(orden, `Pago con tarjeta aprobado. Orden #${orden.id} pagada por ` +
              `S/ ${Number(orden.total).toFixed(2)}.`);
          } else {
            this.mostrarExito(orden, `Orden #${orden.id} creada. El pago quedó en estado ` +
              `${confirmado.estadoPago}.`);
          }
        },
        error: (err) => {
          this.procesando = false;
          this.error = `La orden #${orden.id} se creó, pero el pago no pudo confirmarse: ` +
            this.mensajeError(err);
        }
      });
      return;
    }

    if (pago.initPoint) {
      window.location.href = pago.sandboxInitPoint || pago.initPoint;
      return;
    }

    this.mostrarExito(orden, `Orden #${orden.id} creada. El pago quedó pendiente de confirmación.`);
  }

  private mostrarExito(orden: Orden, mensaje: string) {
    this.procesando = false;
    this.ordenCreada = orden;
    this.mensajeExito = mensaje;
  }

  private validarTarjeta(): string {
    const numero = this.tarjeta.numero.replace(/\s/g, '');
    if (!/^\d{16}$/.test(numero)) {
      return 'Ingresa un número de tarjeta de 16 dígitos.';
    }
    if (this.tarjeta.titular.trim().length < 3) {
      return 'Ingresa el nombre del titular de la tarjeta.';
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(this.tarjeta.vencimiento)) {
      return 'Ingresa el vencimiento en formato MM/AA.';
    }
    const [mes, anio] = this.tarjeta.vencimiento.split('/').map(Number);
    const vencimiento = new Date(2000 + anio, mes, 0, 23, 59, 59);
    if (vencimiento < new Date()) {
      return 'La tarjeta está vencida.';
    }
    if (!/^\d{3,4}$/.test(this.tarjeta.cvv)) {
      return 'Ingresa un CVV de 3 o 4 dígitos.';
    }
    return '';
  }

  formatearNumero(valor: string): string {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 16);
    return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  formatearVencimiento(valor: string): string {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 4);
    if (digitos.length <= 2) {
      return digitos;
    }
    return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  }

  soloDigitos(valor: string, maximo: number): string {
    return (valor || '').replace(/\D/g, '').slice(0, maximo);
  }

  private mensajeError(err: any): string {
    if (err?.status === 401 || err?.status === 403) {
      return 'Tu sesión expiró o no tienes permisos. Vuelve a iniciar sesión.';
    }
    return err?.error?.message || 'No se pudo completar la operación. Intenta nuevamente.';
  }
}
