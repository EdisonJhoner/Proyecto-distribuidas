import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Categoria, CategoriaRequest, Producto } from '../../../models/catalogo.models';
import { CatalogoService } from '../../../services/catalogo.service';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import { mensajeHttp } from '../../../shared/api-error';
import { IconComponent } from '../../../shared/icon/icon.component';

interface FormularioCategoria {
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-admin-categorias',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './admin-categorias.component.html',
  styleUrl: './admin-categorias.component.css'
})
export class AdminCategoriasComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly categorias = signal<Categoria[]>([]);
  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly busqueda = signal('');

  readonly modalAbierto = signal(false);
  readonly editando = signal<Categoria | null>(null);
  readonly form = signal<FormularioCategoria>({ nombre: '', descripcion: '' });
  readonly guardando = signal(false);
  readonly eliminando = signal<number | null>(null);
  readonly errorForm = signal('');

  readonly conteoProductos = computed(() => {
    const mapa = new Map<number, number>();
    for (const producto of this.productos()) {
      const id = producto.categoria?.id;
      if (!id) continue;
      mapa.set(id, (mapa.get(id) ?? 0) + 1);
    }
    return mapa;
  });

  readonly filtradas = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    if (!termino) return this.categorias();
    return this.categorias().filter(categoria =>
      this.normalizar(`${categoria.nombre} ${categoria.descripcion ?? ''}`).includes(termino));
  });

  readonly total = computed(() => this.categorias().length);
  readonly conProductos = computed(() =>
    this.categorias().filter(categoria => (this.conteoProductos().get(categoria.id) ?? 0) > 0).length);
  readonly vacias = computed(() => this.total() - this.conProductos());

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      categorias: this.catalogo.listarCategorias(),
      productos: this.catalogo.listarProductos().pipe(catchError(() => of([] as Producto[])))
    }).subscribe({
      next: resultado => {
        this.categorias.set(resultado.categorias);
        this.productos.set(resultado.productos);
        this.cargando.set(false);
      },
      error: error => {
        this.categorias.set([]);
        this.cargando.set(false);
        this.error.set(mensajeHttp(error, 'No se pudieron cargar las categorías.'));
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.set({ nombre: '', descripcion: '' });
    this.errorForm.set('');
    this.modalAbierto.set(true);
  }

  editar(categoria: Categoria): void {
    this.editando.set(categoria);
    this.form.set({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' });
    this.errorForm.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  cambiarTexto(campo: 'nombre' | 'descripcion', evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.form.update(actual => ({ ...actual, [campo]: valor }));
  }

  guardar(): void {
    if (this.guardando()) return;
    const form = this.form();
    this.errorForm.set('');

    if (!form.nombre.trim()) {
      this.errorForm.set('El nombre de la categoría es obligatorio.');
      return;
    }

    const request: CategoriaRequest = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim()
    };

    this.guardando.set(true);
    const editando = this.editando();
    const peticion = editando
      ? this.catalogo.actualizarCategoria(editando.id, request)
      : this.catalogo.crearCategoria(request);

    peticion.subscribe({
      next: categoria => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.toast.success(editando ? 'Categoría actualizada' : 'Categoría creada', categoria.nombre);
        this.cargar();
      },
      error: error => {
        this.guardando.set(false);
        this.errorForm.set(mensajeHttp(error, 'No se pudo guardar la categoría.'));
      }
    });
  }

  async eliminar(categoria: Categoria): Promise<void> {
    if (this.eliminando() !== null) return;
    const productos = this.conteoProductos().get(categoria.id) ?? 0;
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Eliminar la categoría?',
      mensaje: productos > 0
        ? `"${categoria.nombre}" tiene ${productos} producto(s) asociado(s). El servidor podría rechazar la eliminación mientras existan productos en ella.`
        : `"${categoria.nombre}" se eliminará del catálogo.`,
      confirmar: 'Sí, eliminar',
      cancelar: 'Conservar',
      peligro: true
    });
    if (!confirmado) return;

    this.eliminando.set(categoria.id);
    this.catalogo.eliminarCategoria(categoria.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.success('Categoría eliminada', categoria.nombre);
        this.cargar();
      },
      error: error => {
        this.eliminando.set(null);
        this.toast.error('No se pudo eliminar la categoría', mensajeHttp(error));
      }
    });
  }

  totalProductos(categoria: Categoria): number {
    return this.conteoProductos().get(categoria.id) ?? 0;
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
