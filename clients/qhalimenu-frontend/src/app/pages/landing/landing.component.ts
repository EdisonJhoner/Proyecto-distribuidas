import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ProductoCardComponent } from '../../shared/producto-card/producto-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { imagenHero } from '../../shared/utils';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, DecimalPipe, ProductoCardComponent, IconComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  readonly keycloak = inject(KeycloakService);

  readonly hero = imagenHero();
  readonly cargando = signal(true);
  readonly error = signal(false);
  readonly productos = signal<Producto[]>([]);

  readonly disponibles = computed(() =>
    this.productos().filter(producto => producto.activo !== false && (producto.stock ?? 0) > 0)
  );
  /**
   * Muestra una selección real y variada del menú: el plato más reciente de
   * almuerzos, desayunos y postres. Si faltara alguna categoría, se completa
   * con el resto de productos disponibles.
   */
  readonly destacados = computed(() => {
    const disponibles = this.disponibles();
    const seleccion: Producto[] = [];
    for (const nombreCategoria of ['almuerzos', 'desayunos', 'postres', 'bebidas']) {
      const candidato = [...disponibles]
        .reverse()
        .find(producto => (producto.categoria?.nombre ?? '').toLowerCase() === nombreCategoria);
      if (candidato) seleccion.push(candidato);
      if (seleccion.length === 3) break;
    }
    if (seleccion.length < 3) {
      for (const producto of disponibles) {
        if (!seleccion.includes(producto)) seleccion.push(producto);
        if (seleccion.length === 3) break;
      }
    }
    return seleccion;
  });
  readonly totalCategorias = computed(() => {
    const ids = new Set(this.disponibles().map(producto => producto.categoria?.id).filter(Boolean));
    return ids.size;
  });
  readonly precioDesde = computed(() => {
    const precios = this.disponibles()
      .map(producto => Number(producto.precio))
      .filter(precio => Number.isFinite(precio) && precio > 0);
    return precios.length ? Math.min(...precios) : 0;
  });
  readonly pasos = [
    {
      icono: 'utensils' as const,
      titulo: 'Elige tu menú',
      texto: 'Explora los platos disponibles del día y arma tu pedido con stock real.'
    },
    {
      icono: 'card' as const,
      titulo: 'Reserva y paga',
      texto: 'Tarjeta, Yape, Plin o efectivo en caja. Todo bajo autenticación segura.'
    },
    {
      icono: 'qr' as const,
      titulo: 'Recoge con tu QR',
      texto: 'Presenta tu boleta digital en caja y retira tu almuerzo sin filas.'
    }
  ];
  readonly beneficios = [
    { icono: 'leaf' as const, titulo: 'Comida real', texto: 'Platos preparados del día, con opciones frescas y porciones equilibradas.' },
    { icono: 'clock' as const, titulo: 'Sin esperas', texto: 'Reserva antes de tu receso y recoge a la hora que elijas.' },
    { icono: 'shield' as const, titulo: 'Pago protegido', texto: 'Sesión con Keycloak, tokens renovados y confirmación de cada pago.' },
    { icono: 'chart' as const, titulo: 'Stock en vivo', texto: 'La disponibilidad del catálogo se actualiza con cada pedido confirmado.' }
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.catalogo.listarProductos().subscribe({
      next: productos => {
        this.productos.set(productos);
        this.cargando.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.cargando.set(false);
        this.error.set(true);
      }
    });
  }

  alFallarImagen(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    img.src = 'img/mesa.jpg';
  }
}
