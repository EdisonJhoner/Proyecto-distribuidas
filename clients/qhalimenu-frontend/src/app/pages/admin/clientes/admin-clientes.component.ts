import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Cliente, ClienteRequest } from '../../../models/cliente.models';
import { ClientesService } from '../../../services/clientes.service';
import { ConfirmService } from '../../../services/confirm.service';
import { ToastService } from '../../../services/toast.service';
import { mensajeHttp } from '../../../shared/api-error';
import { IconComponent } from '../../../shared/icon/icon.component';

interface FormularioCliente {
  numeroDocumento: string;
  nombres: string;
  celular: string;
}

@Component({
  selector: 'app-admin-clientes',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './admin-clientes.component.html',
  styleUrl: './admin-clientes.component.css'
})
export class AdminClientesComponent implements OnInit {
  private readonly clientesService = inject(ClientesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly clientes = signal<Cliente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly busqueda = signal('');

  readonly modalAbierto = signal(false);
  readonly editando = signal<Cliente | null>(null);
  readonly form = signal<FormularioCliente>({ numeroDocumento: '', nombres: '', celular: '' });
  readonly guardando = signal(false);
  readonly eliminando = signal<number | null>(null);
  readonly errorForm = signal('');

  readonly filtrados = computed(() => {
    const termino = this.normalizar(this.busqueda().trim());
    const lista = [...this.clientes()].sort((a, b) => a.nombres.localeCompare(b.nombres));
    if (!termino) return lista;
    return lista.filter(cliente =>
      this.normalizar(`${cliente.nombres} ${cliente.numeroDocumento} ${cliente.celular}`).includes(termino));
  });

  readonly total = computed(() => this.clientes().length);
  readonly conDni = computed(() =>
    this.clientes().filter(cliente => /^\d{8}$/.test(cliente.numeroDocumento)).length);
  readonly otrosDocumentos = computed(() => this.total() - this.conDni());

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.clientesService.listar().subscribe({
      next: clientes => {
        this.clientes.set(clientes);
        this.cargando.set(false);
      },
      error: error => {
        this.clientes.set([]);
        this.cargando.set(false);
        this.error.set(mensajeHttp(error, 'No se pudo cargar el directorio de clientes.'));
      }
    });
  }

  buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  abrirNuevo(): void {
    this.editando.set(null);
    this.form.set({ numeroDocumento: '', nombres: '', celular: '' });
    this.errorForm.set('');
    this.modalAbierto.set(true);
  }

  editar(cliente: Cliente): void {
    this.editando.set(cliente);
    this.form.set({
      numeroDocumento: cliente.numeroDocumento,
      nombres: cliente.nombres,
      celular: cliente.celular
    });
    this.errorForm.set('');
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    if (this.guardando()) return;
    this.modalAbierto.set(false);
    this.errorForm.set('');
  }

  cambiarTexto(campo: keyof FormularioCliente, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.form.update(actual => ({ ...actual, [campo]: valor }));
  }

  guardar(): void {
    if (this.guardando()) return;
    const form = this.form();
    this.errorForm.set('');

    if (!form.numeroDocumento.trim()) {
      this.errorForm.set('El número de documento es obligatorio.');
      return;
    }
    if (form.numeroDocumento.trim().length < 6) {
      this.errorForm.set('El documento debe tener al menos 6 caracteres.');
      return;
    }
    if (!form.nombres.trim()) {
      this.errorForm.set('Los nombres del cliente son obligatorios.');
      return;
    }
    if (!form.celular.trim()) {
      this.errorForm.set('El celular es obligatorio.');
      return;
    }
    if (!/^[+0-9 ()-]{6,20}$/.test(form.celular.trim())) {
      this.errorForm.set('El celular debe contener entre 6 y 20 caracteres numéricos.');
      return;
    }

    const request: ClienteRequest = {
      numeroDocumento: form.numeroDocumento.trim(),
      nombres: form.nombres.trim(),
      celular: form.celular.trim()
    };

    this.guardando.set(true);
    const editando = this.editando();
    const peticion = editando
      ? this.clientesService.actualizar(editando.id, request)
      : this.clientesService.crear(request);

    peticion.subscribe({
      next: cliente => {
        this.guardando.set(false);
        this.modalAbierto.set(false);
        this.toast.success(editando ? 'Cliente actualizado' : 'Cliente registrado', cliente.nombres);
        this.cargar();
      },
      error: error => {
        this.guardando.set(false);
        this.errorForm.set(mensajeHttp(error, 'No se pudo guardar el cliente.'));
      }
    });
  }

  async eliminar(cliente: Cliente): Promise<void> {
    if (this.eliminando() !== null) return;
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Eliminar el cliente?',
      mensaje: `Se eliminará a "${cliente.nombres}" (${cliente.numeroDocumento}) del directorio. Esta acción no se puede deshacer.`,
      confirmar: 'Sí, eliminar',
      cancelar: 'Conservar',
      peligro: true
    });
    if (!confirmado) return;

    this.eliminando.set(cliente.id);
    this.clientesService.eliminar(cliente.id).subscribe({
      next: () => {
        this.eliminando.set(null);
        this.toast.success('Cliente eliminado', cliente.nombres);
        if (this.editando()?.id === cliente.id) {
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

  iniciales(nombres: string): string {
    const partes = nombres.split(/\s+/).filter(Boolean);
    if (!partes.length) return 'CL';
    return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
  }

  private normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
