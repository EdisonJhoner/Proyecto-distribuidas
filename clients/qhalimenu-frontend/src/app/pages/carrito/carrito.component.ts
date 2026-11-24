import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Orden } from '../../models/orden.models';
import { CarritoService, ItemCarrito } from '../../services/carrito.service';
import { CatalogoService } from '../../services/catalogo.service';
import { KeycloakService } from '../../services/keycloak.service';
import { OrdenesService } from '../../services/ordenes.service';
import { PagoFlujoService, MetodoPagoUI } from '../../services/pago-flujo.service';
import { ToastService } from '../../services/toast.service';
import { mensajeHttp } from '../../shared/api-error';
import { IconComponent } from '../../shared/icon/icon.component';
import { IconName } from '../../shared/icon/icon.component';
import { imagenProducto } from '../../shared/utils';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent implements OnInit {
  readonly carrito = inject(CarritoService);
  private readonly catalogo = inject(CatalogoService);
  private readonly ordenes = inject(OrdenesService);
  private readonly pagoFlujo = inject(PagoFlujoService);
  private readonly keycloak = inject(KeycloakService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly metodo = signal<MetodoPagoUI>('MERCADOPAGO');
  readonly tipoComprobante = signal('BOLETA');
  readonly nombreCliente = signal('');
  readonly procesando = signal(false);
  readonly validando = signal(true);
  readonly error = signal('');
  readonly aviso = signal('');

  readonly metodos: { valor: MetodoPagoUI; etiqueta: string; detalle: string; icono: IconName }[] = [
    {
      valor: 'MERCADOPAGO',
      etiqueta: 'Mercado Pago',
      detalle: 'Tarjeta o Yape en la página de pago',
      icono: 'card'
    },
    { valor: 'EFECTIVO', etiqueta: 'Efectivo', detalle: 'Pagas al recoger', icono: 'cash' }
  ];

  readonly esEfectivo = computed(() => this.metodo() === 'EFECTIVO');

  ngOnInit(): void {
    this.nombreCliente.set(this.keycloak.getNombre());
    this.sincronizar();
  }

  private sincronizar(): void {
    this.validando.set(true);
    this.catalogo.listarProductos().subscribe({
      next: productos => {
        const antes = this.carrito.totalUnidades();
        this.carrito.sincronizarCatalogo(productos.map(producto => ({
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          stock: producto.stock,
          categoria: producto.categoria?.nombre,
          imagen: imagenProducto(producto)
        })));
        const despues = this.carrito.totalUnidades();
        if (antes !== despues) {
          this.aviso.set('Actualizamos tu carrito con el stock y los precios vigentes del catálogo.');
        }
        this.validando.set(false);
      },
      error: () => {
        this.validando.set(false);
        this.aviso.set('No se pudo verificar el stock en línea. El servidor validará la disponibilidad al confirmar.');
      }
    });
  }

  mas(item: ItemCarrito): void {
    this.carrito.cambiarCantidad(item.id, item.cantidad + 1);
  }

  menos(item: ItemCarrito): void {
    this.carrito.cambiarCantidad(item.id, item.cantidad - 1);
  }

  cambiar(item: ItemCarrito, evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.carrito.cambiarCantidad(item.id, valor);
  }

  quitar(item: ItemCarrito): void {
    this.carrito.quitar(item.id);
  }

  elegirMetodo(metodo: MetodoPagoUI): void {
    this.metodo.set(metodo);
  }

  cambiarComprobante(evento: Event): void {
    this.tipoComprobante.set((evento.target as HTMLSelectElement).value);
  }

  cambiarNombre(evento: Event): void {
    this.nombreCliente.set((evento.target as HTMLInputElement).value);
  }

  alFallarImagen(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    img.src = 'img/mesa.jpg';
  }

  async pagar(): Promise<void> {
    if (this.procesando()) return;
    this.error.set('');

    const items = this.carrito.items();
    if (items.length === 0) {
      this.error.set('Tu carrito está vacío.');
      return;
    }
    if (!this.nombreCliente().trim()) {
      this.error.set('Escribe el nombre de quien recogerá el pedido.');
      return;
    }

    // Se abre en el gesto del clic: si se abriera después de los awaits, el
    // navegador lo trataría como popup bloqueado.
    const ventanaPago = this.metodo() === 'MERCADOPAGO'
      ? window.open('', '_blank', 'popup,width=1100,height=800')
      : null;

    this.procesando.set(true);
    let orden: Orden;
    try {
      orden = await firstValueFrom(this.ordenes.crear({
        tipoComprobante: this.tipoComprobante(),
        metodoPago: this.metodo(),
        momentoPago: 'ANTICIPADO',
        nombreCliente: this.nombreCliente().trim(),
        detalles: items.map(item => ({ idProducto: item.id, cantidad: item.cantidad }))
      }));
    } catch (error) {
      if (ventanaPago && !ventanaPago.closed) {
        ventanaPago.location.href = `${window.location.origin}/?pagoError=1`;
      }
      this.procesando.set(false);
      this.error.set(mensajeHttp(error, 'No se pudo crear la reserva. Revisa el stock e inténtalo otra vez.'));
      return;
    }

    // La orden ya reservó stock: el carrito local debe vaciarse aunque el pago falle.
    this.carrito.vaciar();

    try {
      const resultado = await this.pagoFlujo.pagar(orden, this.metodo(), ventanaPago);
      if (resultado.estado === 'REDIRIGIDO') {
        this.toast.info('Pago en otra ventana', resultado.mensaje);
        return;
      }
      if (resultado.estado === 'PAGADA') {
        this.toast.success('¡Pago confirmado!', 'Tu reserva está lista para recoger.');
      } else {
        this.toast.info('Reserva registrada', resultado.mensaje);
      }
      await this.router.navigate(['/boleta', orden.id], { queryParams: { nuevo: 1 } });
    } catch (error) {
      if (ventanaPago && !ventanaPago.closed) {
        ventanaPago.location.href = `${window.location.origin}/boleta/${orden.id}?pagoError=1`;
        ventanaPago.focus();
      }
      this.toast.error('Reserva creada, pago pendiente', mensajeHttp(error));
      await this.router.navigate(['/boleta', orden.id], { queryParams: { pagoError: 1 } });
    } finally {
      this.procesando.set(false);
    }
  }
}
