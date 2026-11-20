import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Producto } from '../../models/catalogo.models';
import { CarritoService } from '../../services/carrito.service';
import { KeycloakService } from '../../services/keycloak.service';
import { ToastService } from '../../services/toast.service';
import { cortar, imagenProducto } from '../utils';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-producto-card',
  standalone: true,
  imports: [RouterLink, IconComponent, DecimalPipe],
  templateUrl: './producto-card.component.html',
  styleUrl: './producto-card.component.css'
})
export class ProductoCardComponent {
  readonly producto = input.required<Producto>();
  readonly indice = input(0);

  private readonly carrito = inject(CarritoService);
  private readonly keycloak = inject(KeycloakService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly imagen = computed(() => imagenProducto(this.producto()));
  readonly descripcion = computed(() => cortar(this.producto().descripcion, 96));
  readonly sinStock = computed(() => (this.producto().stock ?? 0) <= 0);
  readonly stockBajo = computed(() => {
    const stock = this.producto().stock ?? 0;
    return stock > 0 && stock <= 8;
  });
  readonly enCarrito = computed(() => this.carrito.cantidadDe(this.producto().id));

  agregar(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
    const producto = this.producto();
    if (this.sinStock()) {
      return;
    }
    if (!this.keycloak.isLoggedIn()) {
      this.toast.info('Inicia sesión para reservar', 'Tu carrito se conservará al volver.');
      this.keycloak.login(this.router.url);
      return;
    }
    this.carrito.agregar({
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      stock: producto.stock,
      categoria: producto.categoria?.nombre,
      imagen: this.imagen()
    });
    this.toast.success('Agregado al carrito', producto.nombre);
  }

  alFallarImagen(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    if (!img.src.endsWith('img/mesa.jpg')) {
      img.src = 'img/mesa.jpg';
    }
  }
}
