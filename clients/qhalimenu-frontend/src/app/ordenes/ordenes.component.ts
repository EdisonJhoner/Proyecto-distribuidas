import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-ordenes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Mis Órdenes</h2>
    <table border="1" cellpadding="10">
      <thead>
        <tr>
          <th>ID</th>
          <th>Estado</th>
          <th>Total</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let orden of ordenes">
          <td>{{ orden.id }}</td>
          <td>{{ orden.estado }}</td>
          <td>S/ {{ orden.total }}</td>
          <td>{{ orden.fechaCreacion }}</td>
        </tr>
      </tbody>
    </table>
  `
})
export class OrdenesComponent implements OnInit {
  ordenes: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarOrdenes();
    setInterval(() => this.cargarOrdenes(), 5000);
  }

  cargarOrdenes() {
    this.http.get<any[]>('http://localhost:18080/api/v1/ordenes').subscribe(data => {
      this.ordenes = data;
    });
  }
}
