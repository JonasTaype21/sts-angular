import { inject, Injectable } from '@angular/core';
import {
    HttpClient,
    HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    ComentariosApiResponse,
    CrearComentarioApiResponse,
    CrearComentarioRequest
} from '../models/comentario';

@Injectable({
    providedIn: 'root'
})
export class ComentarioService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl =
  'https://proyecto-sts-backend.onrender.com/api/seguimiento';

    obtenerComentarios(
        idTicket: number
    ): Observable<ComentariosApiResponse> {

        const parametros = new HttpParams()
            .set('idTicket', idTicket.toString());

        return this.http.get<ComentariosApiResponse>(
            this.apiUrl,
            {
                params: parametros,
                withCredentials: true
            }
        );
    }

    publicarComentario(
        solicitud: CrearComentarioRequest
    ): Observable<CrearComentarioApiResponse> {

        return this.http.post<CrearComentarioApiResponse>(
            this.apiUrl,
            solicitud,
            {
                withCredentials: true
            }
        );
    }

    obtenerCantidadComentarios(
        idTicket: number
    ): Observable<{
        exito: boolean;
        cantidad: number;
    }> {

        const parametros = new HttpParams()
            .set('accion', 'cantidad')
            .set('idTicket', idTicket.toString());

        return this.http.get<{
            exito: boolean;
            cantidad: number;
        }>(
            this.apiUrl,
            {
                params: parametros,
                withCredentials: true
            }
        );
    }
}