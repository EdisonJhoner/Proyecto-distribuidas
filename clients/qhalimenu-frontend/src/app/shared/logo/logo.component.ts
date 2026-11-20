import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a class="brand" routerLink="/" [class.brand--compact]="compacto()" aria-label="QhaliMenu, ir al inicio">
      <span class="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M7 21h34c0 10.5-7.4 18-17 18S7 31.5 7 21Z" fill="currentColor" opacity=".16"/>
          <path d="M7 21h34c0 10.5-7.4 18-17 18S7 31.5 7 21Z" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M14 29c2.6 4.2 6 6.3 10 6.3s7.4-2.1 10-6.3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
          <path d="M24 18c-1.2-6.4 2.6-10.6 9.4-11.4.6 6.9-3.2 11.3-9.4 11.4Z" fill="var(--qm-lime, #b9d48a)" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M24 18c-3.9-.6-6.6-2.6-8.2-5.9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="brand__text">
        <span class="brand__name">Qhali<span>Menu</span></span>
        @if (!compacto()) {
          <span class="brand__tag">Almuerzos saludables</span>
        }
      </span>
    </a>
  `
})
export class LogoComponent {
  readonly compacto = input(false);
}
