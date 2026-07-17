import { inject, Injectable } from '@angular/core';
import {
    HttpClient,
    HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    ArchivosApiResponse,
    SubirArchivoApiResponse
} from '../models/archivo.model';

@Injectable({
    providedIn: 'root'
})
export class ArchivoService {

    private readonly http = inject(HttpClient);

    private readonly apiUrl =
'https://proyecto-sts-backend.onrender.com/api/sesion';

    obtenerArchivos(
        idTicket: number
    ): Observable<ArchivosApiResponse> {

        const parametros = new HttpParams()
            .set('idTicket', idTicket.toString());

        return this.http.get<ArchivosApiResponse>(
            this.apiUrl,
            {
                params: parametros,
                withCredentials: true
            }
        );
    }

    subirArchivo(
        idTicket: number,
        archivo: File
    ): Observable<SubirArchivoApiResponse> {

        const formulario = new FormData();

        formulario.append(
            'idTicket',
            idTicket.toString()
        );

        formulario.append(
            'archivo',
            archivo,
            archivo.name
        );

        return this.http.post<SubirArchivoApiResponse>(
            this.apiUrl,
            formulario,
            {
                withCredentials: true
            }
        );
    }

    descargarArchivo(
        idArchivo: number
    ): Observable<Blob> {

        const parametros = new HttpParams()
            .set('accion', 'descargar')
            .set('idArchivo', idArchivo.toString());

        return this.http.get(
            this.apiUrl,
            {
                params: parametros,
                withCredentials: true,
                responseType: 'blob'
            }
        );
    }
}