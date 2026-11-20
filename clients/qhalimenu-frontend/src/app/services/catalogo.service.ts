import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Categoria,
  CategoriaRequest,
  Producto,
  ProductoRequest
} from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/productos`;
  private readonly baseCategorias = `${environment.apiBaseUrl}/categorias`;

  listarProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.base).pipe(map(productos => productos ?? []));
  }

  obtenerProducto(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  crearProducto(request: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.base, request);
  }

  actualizarProducto(id: number, request: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/${id}`, request);
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.baseCategorias).pipe(map(categorias => categorias ?? []));
  }

  crearCategoria(request: CategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseCategorias, request);
  }

  actualizarCategoria(id: number, request: CategoriaRequest): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.baseCategorias}/${id}`, request);
  }

  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseCategorias}/${id}`);
  }
}
