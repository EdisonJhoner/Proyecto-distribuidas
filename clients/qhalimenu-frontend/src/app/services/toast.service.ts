import { Injectable, computed, signal } from '@angular/core';

export type TipoToast = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  detalle?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private siguienteId = 1;

  readonly toasts = this.toastsSignal.asReadonly();
  readonly hayToasts = computed(() => this.toastsSignal().length > 0);

  success(titulo: string, detalle?: string): void {
    this.mostrar('success', titulo, detalle);
  }

  error(titulo: string, detalle?: string): void {
    this.mostrar('error', titulo, detalle);
  }

  info(titulo: string, detalle?: string): void {
    this.mostrar('info', titulo, detalle);
  }

  warning(titulo: string, detalle?: string): void {
    this.mostrar('warning', titulo, detalle);
  }

  cerrar(id: number): void {
    this.toastsSignal.update(lista => lista.filter(toast => toast.id !== id));
  }

  private mostrar(tipo: TipoToast, titulo: string, detalle?: string): void {
    const toast: Toast = { id: this.siguienteId++, tipo, titulo, detalle };
    this.toastsSignal.update(lista => [...lista.slice(-3), toast]);
    setTimeout(() => this.cerrar(toast.id), tipo === 'error' ? 6500 : 4500);
  }
}
