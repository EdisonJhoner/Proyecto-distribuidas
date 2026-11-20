import { Injectable, signal } from '@angular/core';

export interface ConfirmacionOpciones {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  cancelar?: string;
  peligro?: boolean;
}

export interface ConfirmacionPendiente extends ConfirmacionOpciones {
  resolver: (valor: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly pendiente = signal<ConfirmacionPendiente | null>(null);

  confirmar(opciones: ConfirmacionOpciones): Promise<boolean> {
    return new Promise<boolean>(resolver => {
      this.pendiente.set({ ...opciones, resolver });
    });
  }

  resolver(valor: boolean): void {
    const actual = this.pendiente();
    this.pendiente.set(null);
    actual?.resolver(valor);
  }
}
