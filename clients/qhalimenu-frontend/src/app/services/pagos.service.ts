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

  confirmarSimulacion(preferenceId: string): Observable<Pago> {
    return this.http.get<Pago>(`${this.base}/simulacion/${encodeURIComponent(preferenceId)}`);
  }

  confirmarBilletera(ordenId: number): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/orden/${ordenId}/confirmar-billetera`, {});
  }

  confirmarPago(id: number): Observable<Pago> {
    return this.http.post<Pago>(`${this.base}/${id}/confirmar`, {});
  }
}
