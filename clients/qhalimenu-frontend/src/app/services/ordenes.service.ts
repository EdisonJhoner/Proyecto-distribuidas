import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CierreDiaResponse,
  Orden,
  OrdenRequest
} from '../models/orden.models';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/ordenes`;

  listar(): Observable<Orden[]> {
    return this.http.get<Orden[]>(this.base).pipe(map(ordenes => ordenes ?? []));
  }

  misOrdenes(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.base}/mis-ordenes`).pipe(map(ordenes => ordenes ?? []));
  }

  obtener(id: number): Observable<Orden> {
    return this.http.get<Orden>(`${this.base}/${id}`);
  }

  obtenerPorCodigo(codigo: string): Observable<Orden> {
    return this.http.get<Orden>(`${this.base}/codigo/${encodeURIComponent(codigo)}`);
  }

  crear(request: OrdenRequest): Observable<Orden> {
    return this.http.post<Orden>(this.base, request);
  }

  pendientesRecojo(): Observable<Orden[]> {
    return this.http.get<Orden[]>(`${this.base}/pendientes-recojo`).pipe(map(ordenes => ordenes ?? []));
  }

  entregar(codigo: string): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/entregar`, { codigo });
  }

  cancelar(id: number): Observable<Orden> {
    return this.http.post<Orden>(`${this.base}/${id}/cancelar`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  cierreDia(): Observable<CierreDiaResponse> {
    return this.http.post<CierreDiaResponse>(`${this.base}/cierre-dia`, {});
  }
}
