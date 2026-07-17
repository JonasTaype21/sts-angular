export type EstadoTicket =
    | 'ABIERTO'
    | 'ASIGNADO'
    | 'EN_PROCESO'
    | 'RESUELTO'
    | 'CERRADO';

export type TipoMovimiento =
    | 'creado'
    | 'asignado'
    | 'proceso'
    | 'resuelto'
    | 'cerrado';

export interface MovimientoTicketVista {
    id: number;
    accion: string;
    comentario: string;
    responsable: string;
    fecha: string;
    estadoAnterior: string | null;
    estadoNuevo: EstadoTicket;
    icono: string;
    tipo: TipoMovimiento;
}