export interface HistorialApi {
    idHistorial: number;
    idTicket: number;
    idUsuario: number | null;

    nombreUsuario: string | null;
    estadoAnterior: string | null;
    estadoNuevo: string;

    accion: string;
    comentario: string | null;
    fechaAccion: string | null;
}

export interface SolucionApi {
    idSolucion: number;
    idTicket: number;
    idTecnico: number | null;

    nombreTecnico: string | null;
    diagnostico: string | null;
    solucionAplicada: string | null;
    observaciones: string | null;
    fechaSolucion: string | null;
}

export interface SeguimientoApiResponse {
    exito: boolean;
    mensaje: string;
    ticket: import('./ticket').TicketApi | null;
    historial: HistorialApi[];
    solucion: SolucionApi | null;
}