import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.toasts(); track toast.id) {
        <article class="toast" [class]="'toast toast--' + toast.tipo" role="status">
          <span class="toast__icon"><app-icon [name]="icono(toast.tipo)" [size]="18" /></span>
          <div class="toast__body">
            <strong>{{ toast.titulo }}</strong>
            @if (toast.detalle) {
              <p>{{ toast.detalle }}</p>
            }
          </div>
          <button type="button" class="toast__close" (click)="toasts.cerrar(toast.id)" aria-label="Cerrar notificación">
            <app-icon name="close" [size]="15" />
          </button>
        </article>
      }
    </div>
  `
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);

  icono(tipo: string): IconName {
    switch (tipo) {
      case 'success': return 'check';
      case 'error': return 'alert';
      case 'warning': return 'alert';
      default: return 'info';
    }
  }
}
