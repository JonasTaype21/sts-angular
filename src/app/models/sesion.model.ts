export type RolUsuario =
    | 'ADMIN'
    | 'TECNICO'
    | 'USUARIO';

export interface SesionApiResponse {
    autenticado: boolean;
    mensaje: string;

    idUsuario: number | null;
    nombres: string | null;
    apellidos: string | null;
    nombreCompleto: string | null;
    correo: string | null;
    rol: RolUsuario | null;
}