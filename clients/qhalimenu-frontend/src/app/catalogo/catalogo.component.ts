import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Catálogo de Productos</h2>
    <div *ngFor="let producto of productos" style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
      <h3>{{ producto.nombre }}</h3>
      <p>{{ producto.descripcion }}</p>
      <p><strong>S/ {{ producto.precio }}</strong></p>
      <button (click)="crearOrden(producto)">Ordenar</button>
    </div>
  `
})
export class CatalogoComponent implements OnInit {
  productos: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>('http://localhost:18080/api/v1/productos').subscribe(data => {
      this.productos = data;
    });
  }

  crearOrden(producto: any) {
    const orden = {
      tipoComprobante: 'BOLETA',
      metodoPago: 'YAPE_PLIN',
      momentoPago: 'ANTICIPADO',
      detalles: [{
        idProducto: producto.id,
        cantidad: 1
      }]
    };
    this.http.post('http://localhost:18080/api/v1/ordenes', orden).subscribe({
      next: (res) => {
        alert('Orden creada correctamente');
      },
      error: (err) => {
        alert('Error al crear orden. Debes iniciar sesión.');
      }
    });
  }
}
