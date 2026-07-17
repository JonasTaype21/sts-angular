import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SeguimientoApiResponse } from '../models/historial';

@Injectable({
    providedIn: 'root'
})
export class TicketService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl =
  'https://proyecto-sts-backend.onrender.com/api/seguimiento';

    obtenerSeguimiento(idTicket: number): Observable<SeguimientoApiResponse> {

        const parametros = new HttpParams()
            .set('idTicket', idTicket.toString());

        return this.http.get<SeguimientoApiResponse>(
            this.apiUrl,
            {
                params: parametros
            }
        );
    }
}