import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  EMPTY,
  catchError,
  finalize,
  switchMap,
  tap
} from 'rxjs';

import { TicketService } from '../../services/ticket';
import { ComentarioService } from '../../services/comentario';
import { ArchivoService } from '../../services/archivo.service';
import {
  SeguimientoApiResponse
} from '../../models/historial';

import {
  TimelineTicketComponent
} from '../../components/timeline-ticket/timeline-ticket';

import {
  EstadoTicket,
  MovimientoTicketVista,
  TipoMovimiento
} from '../../models/seguimiento-vista';

import {
  ComentariosTicketComponent
} from '../../components/comentarios-ticket/comentarios-ticket';

import {
  ArchivosTicketComponent
} from '../../components/archivos-ticket/archivos-ticket';

import {
  SesionService
} from '../../services/sesion.service';

import {
  SesionApiResponse
} from '../../models/sesion.model';

type PestanaTicket =
  | 'actividad'
  | 'comentarios'
  | 'archivos'
  | 'solucion';

interface PasoTicket {
  estado: EstadoTicket;
  titulo: string;
  descripcion: string;
  icono: string;
}

interface TicketVista {
  codigo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: EstadoTicket;
  solicitante: string;
  area: string;
  tecnico: string;
  fechaCreacion: string;
  tiempoTranscurrido: string;
  porcentajeSla: number;
  objetivoSla: string;
}

interface MovimientoTicket {
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

interface SolucionVista {
  diagnostico: string;
  solucionAplicada: string;
  observaciones: string;
  tecnico: string;
  fecha: string;
}

interface IndicadorVista {
  titulo: string;
  valor: string;
  icono: string;
  clase: string;
}

@Component({
  selector: 'app-historial-ticket',
  standalone: true,
  imports: [
    CommonModule,
    TimelineTicketComponent,
    ComentariosTicketComponent,
    ArchivosTicketComponent
  ],
  templateUrl: './historial-ticket.html',
  styleUrl: './historial-ticket.css'
})
export class HistorialTicketComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly ticketService = inject(TicketService);
  private readonly comentarioService = inject(ComentarioService);
  private readonly archivoService = inject(ArchivoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sesionService = inject(SesionService);

  readonly sesion =
    signal<SesionApiResponse | null>(null);

  readonly cargandoSesion =
    signal(true);

  readonly errorSesion =
    signal('');

  readonly idTicket = signal(0);

  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly respuestaReal =
    signal<SeguimientoApiResponse | null>(null);

  readonly ticket = signal<TicketVista | null>(null);
  readonly historial = signal<MovimientoTicketVista[]>([]);
  readonly solucion = signal<SolucionVista | null>(null);

  /*
   * Los contadores se consultan al cargar cada ticket.
   * También se actualizan cuando los componentes hijos cambian.
   */
  readonly cantidadComentarios = signal(0);
  readonly cantidadArchivos = signal(0);

  readonly pestanaActiva =
    signal<PestanaTicket>('actividad');

  readonly mensajeSistema = signal('');
  readonly mostrarMensaje = signal(false);

  readonly mostrarMensajeConexion = signal(false);

  readonly pasos: PasoTicket[] = [
    {
      estado: 'ABIERTO',
      titulo: 'Registrado',
      descripcion: 'Solicitud creada',
      icono: 'bi-ticket-perforated'
    },
    {
      estado: 'ASIGNADO',
      titulo: 'Asignado',
      descripcion: 'Técnico responsable',
      icono: 'bi-person-check'
    },
    {
      estado: 'EN_PROCESO',
      titulo: 'En proceso',
      descripcion: 'Atención técnica',
      icono: 'bi-tools'
    },
    {
      estado: 'RESUELTO',
      titulo: 'Resuelto',
      descripcion: 'Solución registrada',
      icono: 'bi-check-circle'
    },
    {
      estado: 'CERRADO',
      titulo: 'Cerrado',
      descripcion: 'Validación final',
      icono: 'bi-lock'
    }
  ];

  readonly indiceEstadoActual = computed(() => {
    const ticketActual = this.ticket();

    if (!ticketActual) {
      return -1;
    }

    return this.pasos.findIndex(
      paso => paso.estado === ticketActual.estado
    );
  });

  readonly progresoEstados = computed(() => {
    const indice = this.indiceEstadoActual();

    if (indice < 0) {
      return 0;
    }

    return (
      indice /
      (this.pasos.length - 1)
    ) * 100;
  });

  readonly claseSla = computed(() => {

    const porcentaje =
      this.ticket()?.porcentajeSla ?? 0;

    if (porcentaje <= 50) {
      return 'sla-verde';
    }

    if (porcentaje <= 80) {
      return 'sla-amarillo';
    }

    return 'sla-rojo';

  });

  readonly mensajeSla = computed(() => {

    const porcentaje =
      this.ticket()?.porcentajeSla ?? 0;

    if (porcentaje <= 70) {
      return {
        titulo: 'SLA dentro del objetivo',
        mensaje: 'El ticket se encuentra dentro del tiempo establecido.',
        clase: 'sla-ok'
      };
    }

    if (porcentaje < 100) {
      return {
        titulo: 'SLA próximo a vencer',
        mensaje: 'Queda poco tiempo para cumplir el objetivo.',
        clase: 'sla-warning'
      };
    }

    return {
      titulo: 'SLA vencido',
      mensaje: 'El tiempo objetivo fue superado. Se recomienda atención prioritaria.',
      clase: 'sla-danger'
    };

  });


  readonly indicadores = computed<IndicadorVista[]>(() => {
    const ticketActual = this.ticket();

    return [
      {
        titulo: 'Tiempo transcurrido',
        valor:
          ticketActual?.tiempoTranscurrido ?? '-',
        icono: 'bi-clock-history',
        clase: 'azul'
      },
      {
        titulo: 'Movimientos',
        valor: String(this.historial().length),
        icono: 'bi-activity',
        clase: 'morado'
      },
      {
        titulo: 'Comentarios',
        valor: String(this.cantidadComentarios()),
        icono: 'bi-chat-left-text',
        clase: 'verde'
      },
      {
        titulo: 'Archivos',
        valor: String(this.cantidadArchivos()),
        icono: 'bi-paperclip',
        clase: 'naranja'
      }
    ];
  });

  readonly nombreUsuario = computed(() => {
    return (
      this.sesion()?.nombreCompleto ||
      this.ticket()?.solicitante ||
      'Usuario STS'
    );
  });

  readonly inicialesUsuario = computed(() => {
    return this.obtenerIniciales(
      this.nombreUsuario()
    );
  });

  ngOnInit(): void {
    this.cargarSesion();
    this.route.paramMap


      .pipe(
        tap(params => {
          const id =
            Number(params.get('id')) || 1;

          this.idTicket.set(id);
          this.prepararCarga();
        }),

        switchMap(() =>
          this.ticketService
            .obtenerSeguimiento(this.idTicket())
            .pipe(
              catchError(error => {
                this.procesarError(error);
                return EMPTY;
              })
            )
        ),

        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(respuesta => {
        this.aplicarRespuesta(respuesta);
      });
  }

  private prepararCarga(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.respuestaReal.set(null);

    this.ticket.set(null);
    this.historial.set([]);
    this.solucion.set(null);

    this.cantidadComentarios.set(0);
    this.cantidadArchivos.set(0);

    this.cargarCantidadComentarios();
    this.cargarCantidadArchivos();
  }

  private aplicarRespuesta(
    respuesta: SeguimientoApiResponse
  ): void {
    if (!respuesta.exito || !respuesta.ticket) {
      this.errorCarga.set(
        respuesta.mensaje ||
        'No fue posible obtener el seguimiento.'
      );

      this.cargando.set(false);
      return;
    }

    const ticketApi = respuesta.ticket;

    const ticketVista: TicketVista = {
      codigo:
        ticketApi.codigoTicket ||
        'Sin código',

      titulo:
        ticketApi.titulo ||
        'Sin título',

      descripcion:
        ticketApi.descripcion ||
        'Sin descripción registrada',

      categoria:
        ticketApi.nombreCategoria ||
        'Sin categoría',

      prioridad:
        ticketApi.prioridad ||
        'Sin prioridad',

      estado:
        this.normalizarEstado(ticketApi.estado),

      solicitante:
        ticketApi.usuarioReporta ||
        'Sin usuario',

      area:
        ticketApi.areaUsuario ||
        'Área no registrada',

      tecnico:
        ticketApi.tecnicoAsignado ||
        'Sin técnico asignado',

      fechaCreacion:
        ticketApi.fechaCreacion ||
        '-',

      tiempoTranscurrido:
        this.calcularTiempoTranscurrido(
          ticketApi.fechaCreacion,
          ticketApi.fechaCierre
        ),

      porcentajeSla:
        this.calcularPorcentajeSla(
          ticketApi.fechaCreacion,
          ticketApi.fechaCierre
        ),

      objetivoSla:
        '4 horas'
    };

    const historialVista =
      (respuesta.historial ?? []).map(
        (item, indice): MovimientoTicket => {
          const estadoNuevo =
            this.normalizarEstado(
              item.estadoNuevo
            );

          return {
            id:
              item.idHistorial ||
              indice + 1,

            accion:
              item.accion ||
              'Movimiento registrado',

            comentario:
              item.comentario ||
              'Sin comentario adicional.',

            responsable:
              item.nombreUsuario ||
              'Sistema',

            fecha:
              item.fechaAccion ||
              '-',

            estadoAnterior:
              item.estadoAnterior,

            estadoNuevo,

            icono:
              this.obtenerIconoMovimiento(
                estadoNuevo
              ),

            tipo:
              this.obtenerTipoMovimiento(
                estadoNuevo
              )
          };
        }
      );

    let solucionVista: SolucionVista | null = null;

    if (respuesta.solucion) {
      solucionVista = {
        diagnostico:
          respuesta.solucion.diagnostico ||
          'Sin diagnóstico registrado',

        solucionAplicada:
          respuesta.solucion.solucionAplicada ||
          'Sin solución aplicada registrada',

        observaciones:
          respuesta.solucion.observaciones ||
          'Sin observaciones registradas',

        tecnico:
          respuesta.solucion.nombreTecnico ||
          ticketApi.tecnicoAsignado ||
          'Técnico',

        fecha:
          respuesta.solucion.fechaSolucion ||
          '-'
      };
    }

    /*
     * Las señales actualizan automáticamente
     * la plantilla incluso al recargar el navegador.
     */
    this.respuestaReal.set(respuesta);
    this.ticket.set(ticketVista);
    this.historial.set(historialVista);
    this.solucion.set(solucionVista);

    this.cargando.set(false);

    this.mostrarMensajeConexion.set(true);

    setTimeout(() => {
      this.mostrarMensajeConexion.set(false);
    }, 2500);
  }

  private procesarError(error: unknown): void {
    console.error(
      'Error al consultar el seguimiento:',
      error
    );

    this.cargando.set(false);

    const errorHttp =
      error as {
        status?: number;
      };

    if (errorHttp.status === 0) {
      this.errorCarga.set(
        'No se pudo conectar con Java. Verifica GlassFish, MySQL y la dirección de la API.'
      );
      return;
    }

    if (errorHttp.status === 404) {
      this.errorCarga.set(
        'No se encontró el ticket solicitado.'
      );
      return;
    }

    this.errorCarga.set(
      'Ocurrió un error al consultar el seguimiento.'
    );
  }

  cambiarPestana(
    pestana: PestanaTicket
  ): void {
    this.pestanaActiva.set(pestana);

    setTimeout(() => {
      document
        .getElementById('centroTrabajo')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    });
  }

  actualizarCantidadComentarios(
    cantidad: number
  ): void {
    this.cantidadComentarios.set(cantidad);
  }
  actualizarCantidadArchivos(
    cantidad: number
  ): void {
    this.cantidadArchivos.set(cantidad);
  }

  estaCompletado(indice: number): boolean {
    return indice < this.indiceEstadoActual();
  }

  estaActivo(indice: number): boolean {
    return indice === this.indiceEstadoActual();
  }

  estaPendiente(indice: number): boolean {
    return indice > this.indiceEstadoActual();
  }

  volverAlSistema(): void {
    const sesion = this.sesion();

    if (!sesion) {
      window.location.href =
        'https://proyecto-sts-backend.onrender.com/login.jsp';
      return;
    }

    switch (sesion.rol) {

      case 'ADMIN':
        window.location.href =
          'https://proyecto-sts-backend.onrender.com/admin/dashboardAdmin.jsp';
        break;

      case 'TECNICO':
        window.location.href =
'https://proyecto-sts-backend.onrender.com/tecnico/dashboardTecnico.jsp?vista=tickets';
        break;

      default:
        window.location.href =
'https://proyecto-sts-backend.onrender.com/usuario/dashboardUsuario.jsp?vista=seguimiento';
        break;
    }

  }

  private normalizarEstado(
    estado: string | null | undefined
  ): EstadoTicket {
    switch (estado) {
      case 'ABIERTO':
      case 'ASIGNADO':
      case 'EN_PROCESO':
      case 'RESUELTO':
      case 'CERRADO':
        return estado;

      default:
        return 'ABIERTO';
    }
  }

  private obtenerIconoMovimiento(
    estado: EstadoTicket
  ): string {
    switch (estado) {
      case 'ABIERTO':
        return 'bi-ticket-perforated';

      case 'ASIGNADO':
        return 'bi-person-check';

      case 'EN_PROCESO':
        return 'bi-tools';

      case 'RESUELTO':
        return 'bi-check-circle';

      case 'CERRADO':
        return 'bi-lock';
    }
  }

  private obtenerTipoMovimiento(
    estado: EstadoTicket
  ): TipoMovimiento {
    switch (estado) {
      case 'ABIERTO':
        return 'creado';

      case 'ASIGNADO':
        return 'asignado';

      case 'EN_PROCESO':
        return 'proceso';

      case 'RESUELTO':
        return 'resuelto';

      case 'CERRADO':
        return 'cerrado';
    }
  }

  private calcularTiempoTranscurrido(
    fechaInicio: string | null,
    fechaFin: string | null
  ): string {
    if (!fechaInicio) {
      return '-';
    }

    const inicio =
      this.convertirFecha(fechaInicio);

    const fin = fechaFin
      ? this.convertirFecha(fechaFin)
      : new Date();

    if (!inicio || !fin) {
      return '-';
    }

    const diferencia =
      fin.getTime() - inicio.getTime();

    if (diferencia < 0) {
      return '-';
    }

    const minutosTotales = Math.floor(
      diferencia / (1000 * 60)
    );

    const horas =
      Math.floor(minutosTotales / 60);

    const minutos =
      minutosTotales % 60;

    return `${horas} h ${minutos} min`;
  }

  private calcularPorcentajeSla(
    fechaInicio: string | null,
    fechaFin: string | null
  ): number {
    if (!fechaInicio) {
      return 0;
    }

    const inicio =
      this.convertirFecha(fechaInicio);

    const fin = fechaFin
      ? this.convertirFecha(fechaFin)
      : new Date();

    if (!inicio || !fin) {
      return 0;
    }

    const diferencia =
      fin.getTime() - inicio.getTime();

    if (diferencia <= 0) {
      return 0;
    }

    const minutosConsumidos =
      diferencia / (1000 * 60);

    const objetivoMinutos =
      4 * 60;

    return Math.min(
      100,
      Math.round(
        (
          minutosConsumidos /
          objetivoMinutos
        ) * 100
      )
    );
  }

  private convertirFecha(
    valor: string
  ): Date | null {

    const partes = valor.match(
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/
    );

    if (!partes) {
      return null;
    }

    const [, dia, mes, anio, hora, minuto] = partes;

    const fecha = new Date(
      Number(anio),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto)
    );

    // Corrige el desfase de 5 horas entre Java/MySQL y el navegador.
    fecha.setHours(fecha.getHours() + 5);

    return fecha;
  }

  private obtenerIniciales(
    nombre: string
  ): string {
    return nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte.charAt(0))
      .join('')
      .toUpperCase() || 'US';
  }

  private notificar(
    mensaje: string
  ): void {
    this.mensajeSistema.set(mensaje);
    this.mostrarMensaje.set(true);

    setTimeout(() => {
      this.mostrarMensaje.set(false);
    }, 2800);
  }

  private cargarCantidadComentarios(): void {
    const id = this.idTicket();

    if (id <= 0) {
      this.cantidadComentarios.set(0);
      return;
    }

    this.comentarioService
      .obtenerComentarios(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          const comentarios =
            respuesta.comentarios ?? [];

          this.cantidadComentarios.set(
            comentarios.length
          );
        },

        error: error => {
          console.error(
            'Error al contar comentarios:',
            error
          );

          this.cantidadComentarios.set(0);
        }
      });
  }

  private cargarCantidadArchivos(): void {
    const id = this.idTicket();

    if (id <= 0) {
      this.cantidadArchivos.set(0);
      return;
    }

    this.archivoService
      .obtenerArchivos(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {
          const archivos =
            respuesta.archivos ?? [];

          this.cantidadArchivos.set(
            archivos.length
          );
        },

        error: error => {
          console.error(
            'Error al contar archivos:',
            error
          );

          this.cantidadArchivos.set(0);
        }
      });
  }

  private cargarSesion(): void {

    this.cargandoSesion.set(true);
    this.errorSesion.set('');

    this.sesionService
      .obtenerSesion()
      .pipe(
        finalize(() => {
          this.cargandoSesion.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: respuesta => {

          if (!respuesta.autenticado) {
            this.errorSesion.set(
              respuesta.mensaje ||
              'No existe una sesión activa.'
            );

            return;
          }

          this.sesion.set(respuesta);
        },

        error: error => {

          console.error(
            'Error al consultar sesión:',
            error
          );

          if (error?.status === 401) {
            this.errorSesion.set(
              'Tu sesión ha expirado. Inicia sesión nuevamente en STS.'
            );
          } else {
            this.errorSesion.set(
              'No fue posible consultar la sesión del usuario.'
            );
          }
        }
      });
  }


  obtenerNombreRol(
    rol: string | null | undefined
  ): string {

    switch (rol) {
      case 'ADMIN':
        return 'Administrador';

      case 'TECNICO':
        return 'Técnico';

      case 'USUARIO':
        return 'Usuario';

      default:
        return 'Sesión STS';
    }
  }

}