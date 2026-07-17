import {
    inject,
    Injectable,
    signal
} from '@angular/core';

import {
    HttpClient
} from '@angular/common/http';

import {
    Observable,
    tap
} from 'rxjs';

import {
    SesionApiResponse
} from '../models/sesion.model';

@Injectable({
    providedIn: 'root'
})
export class SesionService {

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
'https://proyecto-sts-backend.onrender.com/api/sesion';

    readonly sesion =
        signal<SesionApiResponse | null>(null);

    readonly cargando =
        signal(false);

    readonly error =
        signal('');

    obtenerSesion():
        Observable<SesionApiResponse> {

        this.cargando.set(true);
        this.error.set('');

        return this.http
            .get<SesionApiResponse>(
                this.apiUrl,
                {
                    withCredentials: true
                }
            )
            .pipe(
                tap({
                    next: respuesta => {
                        this.sesion.set(respuesta);
                        this.cargando.set(false);
                    },

                    error: error => {
                        this.sesion.set(null);
                        this.cargando.set(false);

                        if (error?.status === 401) {
                            this.error.set(
                                'La sesión ha expirado.'
                            );
                        } else {
                            this.error.set(
                                'No fue posible consultar la sesión.'
                            );
                        }
                    }
                })
            );
    }

    esAdministrador(): boolean {
        return this.sesion()?.rol === 'ADMIN';
    }

    esTecnico(): boolean {
        return this.sesion()?.rol === 'TECNICO';
    }

    esUsuario(): boolean {
        return this.sesion()?.rol === 'USUARIO';
    }
}