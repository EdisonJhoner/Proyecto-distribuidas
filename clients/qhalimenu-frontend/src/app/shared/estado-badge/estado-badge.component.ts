import { Component, input } from '@angular/core';

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  template: `
    <span class="status-badge" [class]="'status-badge ' + clase()">
      <span class="status-badge__dot" aria-hidden="true"></span>
      {{ etiqueta() }}
    </span>
  `
})
export class EstadoBadgeComponent {
  readonly etiqueta = input.required<string>();
  readonly clase = input('is-neutral');
}
