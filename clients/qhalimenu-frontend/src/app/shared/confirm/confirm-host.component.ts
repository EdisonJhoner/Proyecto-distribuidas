import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-confirm-host',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (confirm.pendiente(); as dialogo) {
      <div class="modal-backdrop" (click)="confirm.resolver(false)">
        <div
          class="confirm"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="dialogo.titulo"
          (click)="$event.stopPropagation()">
          <span class="confirm__icon" [class.confirm__icon--danger]="dialogo.peligro">
            <app-icon [name]="dialogo.peligro ? 'alert' : 'info'" [size]="22" />
          </span>
          <h2>{{ dialogo.titulo }}</h2>
          <p>{{ dialogo.mensaje }}</p>
          <div class="confirm__actions">
            <button type="button" class="btn btn-ghost" (click)="confirm.resolver(false)">
              {{ dialogo.cancelar ?? 'Cancelar' }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger]="dialogo.peligro"
              [class.btn-primary]="!dialogo.peligro"
              (click)="confirm.resolver(true)">
              {{ dialogo.confirmar ?? 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmHostComponent {
  readonly confirm = inject(ConfirmService);
}
