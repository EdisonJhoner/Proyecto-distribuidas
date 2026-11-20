import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import {
  Categoria,
  Producto,
  ProductoRequest
} from '../../../models/catalogo.models';
import { CatalogoService } from '../../../services/catalogo.service';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import { mensajeHttp } from '../../../shared/api-error';
import { IconComponent } from '../../../shared/icon/icon.component';
import { cortar } from '../../../shared/utils';

interface FormularioProducto {
  nombre: string;
  descripcion: string;
  precio: number | null;
  stock: number | null;
  categoriaId: number | null;
  activo: boolean;
}

type FiltroEstado = 'todos' | 'activos' | 'inactivos' | 'agotados';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [DecimalPipe, IconComponent],
  templateUrl: './admin-productos.component.html',
  styleUrl: './admin-productos.component.css'
})
export class AdminProductosComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly productos = signal<Producto[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly busqueda = signal('');
  readonly categoriaFiltro = signal<number | 'todas'>('todas');
  readonly estadoFiltro = signal<FiltroEstado>('todos');

  readonly modalAbierto = signal(false);
  readonly editando = signal<Producto | null>(null);
  readonly form = signal<FormularioProducto>(this.formVacio());
  readonly guardando = signal(false);
  readonly eliminando = signal<number | null>(null);
  readonly errorForm = signal('');

  readonly total = computed(() => this.productos().length);
  readonly activos = computed(() => this.productos().filter(producto => producto.activo !== false).length);
  readonly inactivos = computed(() => this.productos().filter(producto => producto.activo === false).length);
  readonly agotados = computed(() =>
    this.productos().filter(producto => producto.activo !== false && (producto.stock ?? 0) <= 0).length);

  readonly filtrados = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    const categoria = this.categoriaFiltro();
    const estado = this.estadoFiltro();
    return this.productos().filter(producto => {
      if (categoria !== 'todas' && producto.categoria?.id !== categoria) return false;
      if (estado === 'activos' && producto.activo === false) return false;
      if (estado === 'inactivos' && producto.activo !== false) return false;
      if (estado === 'agotados' && ((producto.stock ?? 0) > 0 || producto.activo === false)) return false;
      if (!termino) return true;
      const texto = this.normalizar(`${producto.nombre} ${producto.descripcion ?? ''} ${producto.categoria?.nombre ?? ''}`);
      return texto.includes(termino);
    });
  });

  readonly hayFiltro = computed(() =>
    this.busqueda().trim().length > 0
    || this.categoriaFiltro() !== 'todas'
    || this.estadoFiltro() !== 'todos');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      productos: this.catalogo.listarProductos(),
      categorias: this.catalogo.listarCategorias().pipe(catchError(() => of([] as Categoria[])))
    }).subscribe({
      next: resultado => {
        this.productos.set(resultado.productos);
        this.categorias.set(resultado.categorias);
        this.cargando.set(false);
      },
      error: error => {
        this.productos.set([]);
        this.cargando.set(false);
        this.error.set(mensajeHttp(error, 'No se pudo cargar el catálogo.'));
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  filtrarCategoria(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.categoriaFiltro.set(valor === 'todas' ? 'todas' : Number(valor));
  }

  filtrarEstado(evento: Event): void {
    this.estadoFiltro.set((evento.target as HTMLSelectElement).value as FiltroEstado);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.categoriaFiltro.set('todas');
    this.estadoFiltro.set('todos');
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.errorForm.set('');
    this.form.set(this.formVacio());
    this.modalAbierto.set(true);
  }

  editar(producto: Producto): void {
    this.editando.set(producto);
    this.errorForm.set('');
    this.form.set({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? '',
      precio: Number(producto.precio),
      stock: producto.stock ?? 0,
      categoriaId: producto.categoria?.id ?? this.categorias()[0]?.id ?? null,
      activo: producto.activo !== false
    });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  cambiarTexto(campo: 'nombre' | 'descripcion', evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.form.update(actual => ({ ...actual, [campo]: valor }));
  }

  cambiarNumero(campo: 'precio' | 'stock', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    const numero = valor === '' ? null : Number(valor);
    this.form.update(actual => ({ ...actual, [campo]: Number.isFinite(numero) ? numero : null }));
  }

  cambiarCategoria(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.form.update(actual => ({ ...actual, categoriaId: valor ? Number(valor) : null }));
  }

  cambiarActivo(evento: Event): void {
    const activo = (evento.target as HTMLInputElement).checked;
    this.form.update(actual => ({ ...actual, activo }));
  }

  guardar(): void {
    if (this.guardando()) return;
    const form = this.form();
    this.errorForm.set('');

    if (!form.nombre.trim()) {
      this.errorForm.set('El nombre del producto es obligatorio.');
      return;
    }
    if (form.precio === null || form.precio <= 0) {
      this.errorForm.set('El precio debe ser mayor que cero.');
      return;
    }
    if (form.stock === null || form.stock < 0) {
      this.errorForm.set('El stock no puede ser negativo.');
      return;
    }
    if (!form.categoriaId) {
      this.errorForm.set('Selecciona una categoría.');
      return;
    }

    const request: ProductoRequest = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio),
      stock: Math.floor(form.stock),
      categoriaId: form.categoriaId,
      activo: form.activo
    };

    this.guardando.set(true);
    const editando = this.editando();
    const peticion = editando
      ? this.catalogo.actualizarProducto(editando.id, request)
      : this.catalogo.crearProducto(request);

    peticion.subscribe({
      next: producto => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.toast.success(
          editando ? 'Producto actualizado' : 'Producto creado',
          `${producto.nombre} quedó ${producto.activo === false ? 'oculto' : 'visible'} en el catálogo.`
        );
        this.cargar();
      },
      error: error => {
        this.guardando.set(false);
        this.errorForm.set(mensajeHttp(error, 'No se pudo guardar el producto.'));
      }
    });
  }

  async eliminar(producto: Producto): Promise<void> {
    if (this.eliminando() !== null) return;
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Eliminar el producto?',
      mensaje: `"${producto.nombre}" se eliminará del catálogo. Esta acción no se puede deshacer.`,
      confirmar: 'Sí, eliminar',
      cancelar: 'Conservar',
      peligro: true
    });
    if (!confirmado) return;

    this.eliminando.set(producto.id);
    this.catalogo.eliminarProducto(producto.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.success('Producto eliminado', producto.nombre);
        if (this.editando()?.id === producto.id) {
          this.cerrarModal();
        }
        this.cargar();
      },
      error: error => {
        this.eliminando.set(null);
        this.toast.error('No se pudo eliminar', mensajeHttp(error));
      }
    });
  }

  descripcionCorta(producto: Producto): string {
    return cortar(producto.descripcion, 70) || 'Sin descripción registrada.';
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private formVacio(): FormularioProducto {
    return {
      nombre: '',
      descripcion: '',
      precio: null,
      stock: 50,
      categoriaId: this.categorias()[0]?.id ?? null,
      activo: true
    };
  }
}
