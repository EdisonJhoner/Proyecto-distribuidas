import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pago, PagoRequest } from '../models/pago.models';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/pagos`;

  listar(): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.base).pipe(map(pagos => pagos ?? []));
  }

  listarPorOrden(ordenId: number): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.base}/orden/${ordenId}`).pipe(map(pagos => pagos ?? []));
  }

  crearPreferencia(request: PagoRequest): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/crear-preferencia`, request);
  }

  /** Retorno del checkout real de Mercado Pago (endpoint permitido sin JWT en el gateway). */
  feedback(preferenceId: string, collectionStatus?: string | null, status?: string | null): Observable<Pago> {
    const params: Record<string, string> = { preference_id: preferenceId };
    if (collectionStatus) params['collection_status'] = collectionStatus;
    if (status) params['status'] = status;
    return this.http.get<Pago>(`${this.base}/feedback`, { params });
  }

  confirmarEfectivo(ordenId: number): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/orden/${ordenId}/confirmar-efectivo`, {});
  }

  confirmarPago(id: number): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/${id}/confirmar`, {});
  }
}
