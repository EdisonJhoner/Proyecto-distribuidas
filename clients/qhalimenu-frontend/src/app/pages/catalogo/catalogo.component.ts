import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Producto } from '../../models/catalogo.models';
import { CatalogoService } from '../../services/catalogo.service';
import { CarritoService } from '../../services/carrito.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ProductoCardComponent } from '../../shared/producto-card/producto-card.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { imagenProducto } from '../../shared/utils';

type OrdenCatalogo = 'relevancia' | 'precio-asc' | 'precio-desc' | 'nombre';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [RouterLink, ProductoCardComponent, IconComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  readonly carrito = inject(CarritoService);
  readonly keycloak = inject(KeycloakService);

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly busqueda = signal('');
  readonly categoriaId = signal<number | 'todas'>('todas');
  readonly orden = signal<OrdenCatalogo>('relevancia');

  readonly activos = computed(() =>
    this.productos().filter(producto => producto.activo !== false)
  );

  readonly categorias = computed(() => {
    const mapa = new Map<number, { id: number; nombre: string; total: number }>();
    for (const producto of this.activos()) {
      const categoria = producto.categoria;
      if (!categoria) continue;
      const actual = mapa.get(categoria.id);
      mapa.set(categoria.id, {
        id: categoria.id,
        nombre: categoria.nombre,
        total: (actual?.total ?? 0) + 1
      });
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly filtrados = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    const categoria = this.categoriaId();
    const lista = this.activos().filter(producto => {
      const coincideCategoria = categoria === 'todas' || producto.categoria?.id === categoria;
      if (!coincideCategoria) return false;
      if (!termino) return true;
      const texto = this.normalizar(`${producto.nombre} ${producto.descripcion ?? ''} ${producto.categoria?.nombre ?? ''}`);
      return texto.includes(termino);
    });

    switch (this.orden()) {
      case 'precio-asc':
        return [...lista].sort((a, b) => Number(a.precio) - Number(b.precio));
      case 'precio-desc':
        return [...lista].sort((a, b) => Number(b.precio) - Number(a.precio));
      case 'nombre':
        return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre));
      default:
        return [...lista].sort((a, b) => {
          const ordenCategoria = this.ordenSugerido(a) - this.ordenSugerido(b);
          return ordenCategoria !== 0 ? ordenCategoria : a.nombre.localeCompare(b.nombre);
        });
    }
  });

  readonly totalDisponibles = computed(() => this.activos().filter(p => (p.stock ?? 0) > 0).length);
  readonly hayFiltro = computed(() => this.busqueda().trim().length > 0 || this.categoriaId() !== 'todas');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.catalogo.listarProductos().subscribe({
      next: productos => {
        this.productos.set(productos);
        this.carrito.sincronizarCatalogo(productos.map(producto => ({
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          stock: producto.stock,
          categoria: producto.categoria?.nombre,
          imagen: imagenProducto(producto)
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.cargando.set(false);
        this.error.set('No se pudo cargar el catálogo. Verifica que el API Gateway esté en ejecución.');
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  filtrarCategoria(id: number | 'todas'): void {
    this.categoriaId.set(id);
  }

  cambiarOrden(evento: Event): void {
    this.orden.set((evento.target as HTMLSelectElement).value as OrdenCatalogo);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.categoriaId.set('todas');
    this.orden.set('relevancia');
  }

  /** Orden sugerido del menú: desayunos, almuerzos, postres y bebidas. */
  private ordenSugerido(producto: Producto): number {
    const nombre = (producto.categoria?.nombre ?? '').toLowerCase();
    const indice = ['desayunos', 'almuerzos', 'postres', 'bebidas'].indexOf(nombre);
    return indice === -1 ? 99 : indice;
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
