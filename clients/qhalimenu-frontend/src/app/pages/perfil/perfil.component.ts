import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Orden } from '../../models/orden.models';
import { KeycloakService } from '../../services/keycloak.service';
import { OrdenesService } from '../../services/ordenes.service';
import { EstadoBadgeComponent } from '../../shared/estado-badge/estado-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';
import {
  claseEstadoOrden,
  etiquetaEstadoOrden,
  fechaCorta,
  horaCorta
} from '../../shared/utils';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent, EstadoBadgeComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  readonly keycloak = inject(KeycloakService);
  private readonly ordenesService = inject(OrdenesService);

  readonly ordenes = signal<Orden[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly sub = computed(() => this.keycloak.perfil()?.sub ?? '');
  readonly subCorto = computed(() => {
    const sub = this.sub();
    return sub.length > 12 ? `…${sub.slice(-12)}` : sub || '—';
  });

  readonly totalReservas = computed(() => this.ordenes().length);
  readonly pagadas = computed(() =>
    this.ordenes().filter(orden => orden.estado === 'PAGADA' || orden.estado === 'ENTREGADA').length);
  readonly entregadas = computed(() =>
    this.ordenes().filter(orden => orden.estado === 'ENTREGADA').length);
  readonly gastado = computed(() =>
    this.ordenes()
      .filter(orden => orden.estado === 'PAGADA' || orden.estado === 'ENTREGADA')
      .reduce((total, orden) => total + Number(orden.total || 0), 0));

  readonly recientes = computed(() =>
    [...this.ordenes()]
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
      .slice(0, 4));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.ordenesService.misOrdenes().subscribe({
      next: ordenes => {
        this.ordenes.set(ordenes);
        this.cargando.set(false);
      },
      error: () => {
        this.ordenes.set([]);
        this.cargando.set(false);
        this.error.set('No pudimos cargar tus reservas. El servicio de órdenes no respondió.');
      }
    });
  }

  etiqueta(estado: string): string {
    return etiquetaEstadoOrden(estado);
  }

  clase(estado: string): string {
    return claseEstadoOrden(estado);
  }

  fecha(orden: Orden): string {
    return `${fechaCorta(orden.fechaCreacion)} · ${horaCorta(orden.fechaCreacion)}`;
  }
}
