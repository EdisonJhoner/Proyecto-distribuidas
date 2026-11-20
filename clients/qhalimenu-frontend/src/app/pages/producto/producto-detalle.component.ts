import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Producto } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';
import { CarritoService } from '../../services/carrito.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ToastService } from '../../services/toast.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { ProductoCardComponent } from '../../shared/producto-card/producto-card.component';
import { imagenProducto } from '../../shared/utils';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, ProductoCardComponent],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.css'
})
export class ProductoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogo = inject(CatalogoService);
  private readonly carrito = inject(CarritoService);
  private readonly toast = inject(ToastService);
  readonly keycloak = inject(KeycloakService);

  readonly producto = signal<Producto | null>(null);
  readonly relacionados = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly cantidad = signal(1);

  readonly imagen = computed(() => imagenProducto(this.producto()));
  readonly sinStock = computed(() => (this.producto()?.stock ?? 0) <= 0);
  readonly enCarrito = computed(() => {
    const producto = this.producto();
    return producto ? this.carrito.cantidadDe(producto.id) : 0;
  });
  readonly maximo = computed(() => Math.max(1, Math.min(99, this.producto()?.stock ?? 1)));

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id) || id <= 0) {
        this.error.set('El identificador del producto no es válido.');
        this.cargando.set(false);
        return;
      }
      this.cargar(id);
    });
  }

  cargar(id: number): void {
    this.cargando.set(true);
    this.error.set('');
    this.cantidad.set(1);

    this.catalogo.obtenerProducto(id).subscribe({
      next: producto => {
        if (producto.activo === false) {
          this.error.set('Este plato ya no está disponible en el catálogo.');
          this.cargando.set(false);
          return;
        }
        this.producto.set(producto);
        this.cargando.set(false);
        this.cargarRelacionados(producto);
      },
      error: () => {
        this.error.set('No encontramos este plato o el servicio de catálogo no está disponible.');
        this.producto.set(null);
        this.cargando.set(false);
      }
    });
  }

  private cargarRelacionados(actual: Producto): void {
    this.catalogo.listarProductos().subscribe({
      next: productos => {
        const mismaCategoria = productos.filter(producto =>
          producto.id !== actual.id
          && producto.activo !== false
          && (producto.stock ?? 0) > 0
          && producto.categoria?.id === actual.categoria?.id
        );
        const relleno = productos.filter(producto =>
          producto.id !== actual.id
          && producto.activo !== false
          && (producto.stock ?? 0) > 0
          && !mismaCategoria.some(item => item.id === producto.id)
        );
        this.relacionados.set([...mismaCategoria, ...relleno].slice(0, 3));
      },
      error: () => this.relacionados.set([])
    });
  }

  cambiarCantidad(delta: number): void {
    this.cantidad.update(valor => Math.min(this.maximo(), Math.max(1, valor + delta)));
  }

  fijarCantidad(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    const cantidad = Number.isFinite(valor) ? Math.floor(valor) : 1;
    this.cantidad.set(Math.min(this.maximo(), Math.max(1, cantidad)));
  }

  agregar(): void {
    const producto = this.producto();
    if (!producto || this.sinStock()) {
      return;
    }
    if (!this.keycloak.autenticado()) {
      this.toast.info('Inicia sesión para reservar', 'Volverás a este plato después de ingresar.');
      this.keycloak.login(this.router.url);
      return;
    }
    const cantidad = Math.min(this.cantidad(), this.maximo());
    this.carrito.agregar({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria?.nombre,
      imagen: this.imagen()
    }, cantidad);
    this.toast.success('Agregado al carrito', `${cantidad} × ${producto.nombre}`);
  }

  alFallarImagen(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    img.src = 'img/mesa.jpg';
  }
}
