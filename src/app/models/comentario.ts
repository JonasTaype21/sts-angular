export interface ComentarioApi {
    idComentario: number;
    idTicket: number;
    idUsuario: number;

    nombreUsuario: string | null;
    rol: string | null;

    comentario: string;
    fechaComentario: string | null;
}

export interface ComentariosApiResponse {
    exito: boolean;
    mensaje: string;
    comentarios: ComentarioApi[];
}

export interface CrearComentarioRequest {
    idTicket: number;
    comentario: string;
}

export interface CrearComentarioApiResponse {
    exito: boolean;
    mensaje: string;
    comentario: ComentarioApi | null;
}         