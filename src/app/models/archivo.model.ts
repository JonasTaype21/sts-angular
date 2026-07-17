export interface ArchivoApi {
    idArchivo: number;
    idTicket: number;
    idUsuario: number;

    nombreArchivo: string;
    tipoArchivo: string | null;

    tamanioBytes: number;
    tamanioLegible: string;

    nombreUsuario: string | null;
    fechaSubida: string | null;
    urlDescarga: string;
}

export interface ArchivosApiResponse {
    exito: boolean;
    mensaje: string;
    archivos: ArchivoApi[];
}

export interface SubirArchivoApiResponse {
    exito: boolean;
    mensaje: string;
    archivo: ArchivoApi | null;
}