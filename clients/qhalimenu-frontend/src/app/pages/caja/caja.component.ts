import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Orden } from '../../models/orden.models';
import { ConfirmService } from '../../services/confirm.service';
import { OrdenesService } from '../../services/ordenes.service';
import { PagosService } from '../../services/pagos.service';
import { ToastService } from '../../services/toast.service';
import { mensajeHttp } from '../../shared/api-error';
import { EstadoBadgeComponent } from '../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  etiquetaEstadoOrden,
  etiquetaMetodoPago,
  fechaCorta,
  horaCorta,
  unidadesDeOrden
} from '../../shared/utils';

interface DetectorQr {
  detect(fuente: CanvasImageSource): Promise<Array<{ rawValue?: string }>>;
}

type VentanaConBarcode = Window & {
  BarcodeDetector?: new (opciones: { formats: string[] }) => DetectorQr;
};

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.css'
})
export class CajaComponent implements OnInit, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  private readonly ordenes = inject(OrdenesService);
  private readonly pagos = inject(PagosService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly codigo = signal('');
  readonly orden = signal<Orden | null>(null);
  readonly pendientes = signal<Orden[]>([]);
  readonly buscando = signal(false);
  readonly cargandoPendientes = signal(true);
  readonly actuando = signal<'entregar' | 'cancelar' | null>(null);
  readonly cobrando = signal(false);
  readonly error = signal('');
  readonly avisoCamara = signal('');
  readonly escaneando = signal(false);

  readonly totalPendientes = computed(() => this.pendientes().length);
  readonly montoPendiente = computed(() =>
    this.pendientes().reduce((total, orden) => total + Number(orden.total || 0), 0));
  readonly puedeEntregar = computed(() => this.orden()?.estado === 'PAGADA');
  readonly esEfectivoPendiente = computed(() => {
    const orden = this.orden();
    return orden?.estado === 'PENDIENTE_PAGO'
      && String(orden.metodoPago).toUpperCase() === 'EFECTIVO';
  });
  readonly puedeCancelar = computed(() => {
    const estado = this.orden()?.estado;
    return estado === 'PAGADA' || estado === 'PENDIENTE_PAGO';
  });

  private stream?: MediaStream;
  private detector?: DetectorQr;
  private animacion = 0;
  private leyendo = false;
  private ultimoScan = 0;
  private temporizador?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.cargarPendientes();
    // La cola debe actualizarse aunque la pantalla ya estuviera abierta cuando
    // el cliente creó la reserva o cuando Kafka confirmó un pago.
    this.temporizador = setInterval(() => this.cargarPendientes(true), 10000);
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
    }
    this.cerrarCamara();
  }

  cargarPendientes(silencioso = false): void {
    if (!silencioso) {
      this.cargandoPendientes.set(true);
    }
    this.ordenes.pendientesRecojo().subscribe({
      next: pendientes => {
        this.pendientes.set(pendientes);
        this.cargandoPendientes.set(false);
      },
      error: () => {
        if (!silencioso) {
          this.pendientes.set([]);
        }
        this.cargandoPendientes.set(false);
      }
    });
  }

  cambiarCodigo(evento: Event): void {
    this.codigo.set((evento.target as HTMLInputElement).value);
  }

  usar(item: Orden): void {
    this.codigo.set(item.codigoRecojo ?? '');
    this.orden.set(item);
    this.error.set('');
  }

  buscar(): void {
    const codigo = this.normalizar(this.codigo());
    if (!codigo) {
      this.error.set('Escribe o escanea el código de recojo de la boleta.');
      return;
    }
    this.buscando.set(true);
    this.error.set('');
    this.ordenes.obtenerPorCodigo(codigo).subscribe({
      next: orden => {
        this.orden.set(orden);
        this.codigo.set(orden.codigoRecojo ?? codigo);
        this.buscando.set(false);
        if (orden.estado === 'PENDIENTE_PAGO') {
          this.toast.warning('Pago pendiente', 'Cobra el efectivo aquí antes de entregar la reserva.');
        }
      },
      error: error => {
        this.orden.set(null);
        this.buscando.set(false);
        this.error.set(mensajeHttp(error, 'No se encontró una orden con ese código de recojo.'));
      }
    });
  }

  async cobrarEfectivo(): Promise<void> {
    const orden = this.orden();
    if (!orden || this.cobrando()) {
      return;
    }
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Cobrar en efectivo?',
      mensaje: `Confirma que recibiste S/ ${Number(orden.total).toFixed(2)} por la orden #${orden.id}. La reserva pasará a pagada y podrás entregarla.`,
      confirmar: 'Sí, cobrar',
      cancelar: 'Volver'
    });
    if (!confirmado) {
      return;
    }

    this.cobrando.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.pagos.confirmarEfectivo(orden.id));
      const actualizada = await this.esperarOrdenPagada(orden.id);
      if (actualizada) {
        this.orden.set(actualizada);
        this.toast.success('Cobro registrado', `Orden #${orden.id} pagada en efectivo. Ya puedes entregarla.`);
      } else {
        this.toast.info('Cobro registrado', 'La orden se actualizará en unos segundos. Actualiza la cola.');
      }
      this.cargarPendientes();
    } catch (error) {
      this.error.set(mensajeHttp(error, 'No se pudo registrar el cobro en efectivo.'));
    } finally {
      this.cobrando.set(false);
    }
  }

  private async esperarOrdenPagada(ordenId: number): Promise<Orden | null> {
    for (let intento = 0; intento < 12; intento += 1) {
      await new Promise<void>(resolver => setTimeout(resolver, 500));
      try {
        const actual = await firstValueFrom(this.ordenes.obtener(ordenId));
        if (actual.estado === 'PAGADA' || actual.estado === 'ENTREGADA') {
          return actual;
        }
      } catch {
        // El evento Kafka puede tardar; se reintenta sin interrumpir el cobro.
      }
    }
    return null;
  }

  async entregar(): Promise<void> {
    const orden = this.orden();
    if (!orden?.codigoRecojo || this.actuando()) {
      return;
    }
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Entregar esta reserva?',
      mensaje: `Se marcará la orden #${orden.id} como entregada. El código ${orden.codigoRecojo} quedará usado.`,
      confirmar: 'Sí, entregar',
      cancelar: 'Revisar'
    });
    if (!confirmado) {
      return;
    }

    this.actuando.set('entregar');
    this.ordenes.entregar(orden.codigoRecojo).subscribe({
      next: actualizada => {
        this.orden.set(actualizada);
        this.actuando.set(null);
        this.toast.success('Reserva entregada', `Orden #${actualizada.id} completada.`);
        this.cargarPendientes();
      },
      error: error => {
        this.actuando.set(null);
        this.error.set(mensajeHttp(error, 'No se pudo marcar la reserva como entregada.'));
      }
    });
  }

  async cancelar(): Promise<void> {
    const orden = this.orden();
    if (!orden || this.actuando()) {
      return;
    }
    const confirmado = await this.confirm.confirmar({
      titulo: '¿Cancelar esta reserva?',
      mensaje: `La orden #${orden.id} se cancelará y el stock de sus platos volverá al catálogo. Esta acción no se puede deshacer.`,
      confirmar: 'Sí, cancelar',
      cancelar: 'Volver',
      peligro: true
    });
    if (!confirmado) {
      return;
    }

    this.actuando.set('cancelar');
    this.ordenes.cancelar(orden.id).subscribe({
      next: actualizada => {
        this.orden.set(actualizada);
        this.actuando.set(null);
        this.toast.info('Reserva cancelada', 'El stock fue devuelto al catálogo.');
        this.cargarPendientes();
      },
      error: error => {
        this.actuando.set(null);
        this.error.set(mensajeHttp(error, 'No se pudo cancelar la reserva.'));
      }
    });
  }

  async alternarCamara(): Promise<void> {
    if (this.escaneando()) {
      this.cerrarCamara();
      return;
    }
    this.avisoCamara.set('');
    const win = window as VentanaConBarcode;
    if (!win.BarcodeDetector) {
      this.avisoCamara.set('Este navegador no puede leer códigos QR. Escribe el código manualmente.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.avisoCamara.set('La cámara no está disponible en este contexto. Escribe el código manualmente.');
      return;
    }

    try {
      this.detector = new win.BarcodeDetector({ formats: ['qr_code'] });
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      this.escaneando.set(true);
      setTimeout(() => this.arrancarVideo(), 60);
    } catch {
      this.avisoCamara.set('No se pudo abrir la cámara. Permite el acceso o escribe el código.');
      this.cerrarCamara();
    }
  }

  etiqueta(estado: string): string {
    return etiquetaEstadoOrden(estado);
  }

  clase(estado: string): string {
    return claseEstadoOrden(estado);
  }

  metodo(metodo: string): string {
    return etiquetaMetodoPago(metodo);
  }

  unidades(orden: Orden): number {
    return unidadesDeOrden(orden);
  }

  fecha(orden: Orden): string {
    return `${fechaCorta(orden.fechaPago || orden.fechaCreacion)} · ${horaCorta(orden.fechaPago || orden.fechaCreacion)}`;
  }

  private arrancarVideo(): void {
    const video = this.video?.nativeElement;
    if (!video || !this.stream) {
      return;
    }
    video.srcObject = this.stream;
    void video.play().catch(() => undefined);
    this.leerFrame();
  }

  private leerFrame(): void {
    if (!this.escaneando() || !this.detector) {
      return;
    }
    const ahora = Date.now();
    const video = this.video?.nativeElement;
    if (!this.leyendo && video && video.readyState >= 2 && ahora - this.ultimoScan > 250) {
      this.leyendo = true;
      this.ultimoScan = ahora;
      this.detector.detect(video).then(codigos => {
        this.leyendo = false;
        const valor = codigos.find(item => item.rawValue)?.rawValue;
        if (valor) {
          const extraido = this.extraerCodigo(valor);
          if (extraido) {
            this.codigo.set(extraido);
            this.cerrarCamara();
            this.buscar();
          }
        }
      }).catch(() => {
        this.leyendo = false;
      });
    }
    this.animacion = requestAnimationFrame(() => this.leerFrame());
  }

  private extraerCodigo(valor: string): string {
    const texto = (valor || '').trim().toUpperCase();
    const coincidencia = texto.match(/QM[A-Z0-9]{4,}/);
    return coincidencia ? coincidencia[0].slice(0, 20) : texto.replace(/[^A-Z0-9]/g, '').slice(0, 20);
  }

  private normalizar(valor: string): string {
    return (valor || '').trim().toUpperCase();
  }

  private cerrarCamara(): void {
    this.escaneando.set(false);
    if (this.animacion) {
      cancelAnimationFrame(this.animacion);
      this.animacion = 0;
    }
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.detector = undefined;
    this.leyendo = false;
  }
}
