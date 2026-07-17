export interface TicketApi {
    idTicket: number;
    codigoTicket: string;

    idUsuario: number | null;
    idTecnico: number | null;
    idCategoria: number | null;

    usuarioReporta: string | null;
    tecnicoAsignado: string | null;
    nombreCategoria: string | null;

    areaUsuario: string | null;

    titulo: string;
    descripcion: string;
    prioridad: string;
    estado: string;

    fechaCreacion: string | null;
    fechaAsignacion: string | null;
    fechaInicioAtencion: string | null;
    fechaResolucion: string | null;
    fechaCierre: string | null;
}