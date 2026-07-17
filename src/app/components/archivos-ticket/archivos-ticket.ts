import { CommonModule } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import { finalize } from 'rxjs';

import {
  ArchivoApi
} from '../../models/archivo.model';

import {
  ArchivoService
} from '../../services/archivo.service';

@Component({
  selector: 'app-archivos-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archivos-ticket.html',
  styleUrl: './archivos-ticket.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchivosTicketComponent implements OnInit {

  private readonly archivoService =
    inject(ArchivoService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly idTicket = input.required<number>();

  readonly cantidadCambiada = output<number>();

  @ViewChild('inputArchivo')
  inputArchivo?: ElementRef<HTMLInputElement>;

  readonly archivos = signal<ArchivoApi[]>([]);

  readonly archivoSeleccionado =
    signal<File | null>(null);

  readonly cargando = signal(true);
  readonly subiendo = signal(false);

  readonly idDescargando =
    signal<number | null>(null);

  readonly errorCarga = signal('');
  readonly errorSubida = signal('');
  readonly mensajeExito = signal('');

  readonly tamanioMaximoBytes =
    10 * 1024 * 1024;

  readonly extensionesPermitidas = [
    'pdf',
    'png',
    'jpg',
    'jpeg'
  ];

  readonly archivoValido = computed(() => {
    const archivo =
      this.archivoSeleccionado();

    return (
      archivo !== null &&
      archivo.size > 0 &&
      archivo.size <= this.tamanioMaximoBytes &&
      !this.subiendo()
    );
  });

  readonly nombreArchivoSeleccionado =
    computed(() => {

      const archivo =
        this.archivoSeleccionado();

      return archivo
        ? archivo.name
        : 'Ningún archivo seleccionado';
    });

  readonly tamanioSeleccionado =
    computed(() => {

      const archivo =
        this.archivoSeleccionado();

      return archivo
        ? this.convertirTamanio(archivo.size)
        : '';
    });

  ngOnInit(): void {
    this.cargarArchivos();
  }

  cargarArchivos(): void {

    const id = this.idTicket();

    if (!id || id <= 0) {

      this.errorCarga.set(
        'No se recibió un identificador de ticket válido.'
      );

      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set('');

    this.archivoService
      .obtenerArchivos(id)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: respuesta => {

          if (!respuesta.exito) {

            this.errorCarga.set(
              respuesta.mensaje ||
              'No fue posible cargar los archivos.'
            );

            return;
          }

          const lista =
            respuesta.archivos ?? [];

          this.archivos.set(lista);
          this.notificarCantidad();
        },

        error: error => {

          console.error(
            'Error al consultar archivos:',
            error
          );

          this.errorCarga.set(
            this.obtenerMensajeError(
              error,
              'No fue posible cargar los archivos.'
            )
          );
        }
      });
  }

  abrirSelector(): void {
    this.inputArchivo
      ?.nativeElement
      .click();
  }

  seleccionarArchivo(
    evento: Event
  ): void {

    this.errorSubida.set('');
    this.mensajeExito.set('');

    const input =
      evento.target as HTMLInputElement;

    const archivo =
      input.files?.[0] ?? null;

    if (!archivo) {
      this.archivoSeleccionado.set(null);
      return;
    }

    const extension =
      this.obtenerExtension(
        archivo.name
      );

    if (
      !this.extensionesPermitidas
        .includes(extension)
    ) {

      this.errorSubida.set(
        'Solo se permiten archivos PDF, PNG, JPG y JPEG.'
      );

      this.limpiarSeleccion();
      return;
    }

    if (archivo.size <= 0) {

      this.errorSubida.set(
        'El archivo seleccionado está vacío.'
      );

      this.limpiarSeleccion();
      return;
    }

    if (
      archivo.size >
      this.tamanioMaximoBytes
    ) {

      this.errorSubida.set(
        'El archivo no puede superar los 10 MB.'
      );

      this.limpiarSeleccion();
      return;
    }

    this.archivoSeleccionado.set(
      archivo
    );
  }

  eliminarSeleccion(): void {
    this.limpiarSeleccion();
    this.errorSubida.set('');
    this.mensajeExito.set('');
  }

  subirArchivo(): void {

    const archivo =
      this.archivoSeleccionado();

    if (!archivo) {

      this.errorSubida.set(
        'Selecciona un archivo antes de adjuntarlo.'
      );

      return;
    }

    if (!this.archivoValido()) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set('');
    this.mensajeExito.set('');

    this.archivoService
      .subirArchivo(
        this.idTicket(),
        archivo
      )
      .pipe(
        finalize(() => {
          this.subiendo.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: respuesta => {

          if (
            !respuesta.exito ||
            !respuesta.archivo
          ) {

            this.errorSubida.set(
              respuesta.mensaje ||
              'No fue posible adjuntar el archivo.'
            );

            return;
          }

          this.archivos.update(
            lista => [
              respuesta.archivo!,
              ...lista
            ]
          );

          this.mensajeExito.set(
            respuesta.mensaje ||
            'Archivo adjuntado correctamente.'
          );

          this.limpiarSeleccion();
          this.notificarCantidad();

          setTimeout(() => {
            this.mensajeExito.set('');
          }, 3500);
        },

        error: error => {

          console.error(
            'Error al subir archivo:',
            error
          );

          this.errorSubida.set(
            this.obtenerMensajeError(
              error,
              'No fue posible adjuntar el archivo.'
            )
          );
        }
      });
  }

  descargarArchivo(
    archivo: ArchivoApi
  ): void {

    if (
      this.idDescargando() !== null
    ) {
      return;
    }

    this.idDescargando.set(
      archivo.idArchivo
    );

    this.archivoService
      .descargarArchivo(
        archivo.idArchivo
      )
      .pipe(
        finalize(() => {
          this.idDescargando.set(null);
        }),

        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe({

        next: contenido => {

          const urlTemporal =
            window.URL.createObjectURL(
              contenido
            );

          const enlace =
            document.createElement('a');

          enlace.href = urlTemporal;
          enlace.download =
            archivo.nombreArchivo;

          document.body.appendChild(
            enlace
          );

          enlace.click();
          enlace.remove();

          window.URL.revokeObjectURL(
            urlTemporal
          );
        },

        error: error => {

          console.error(
            'Error al descargar archivo:',
            error
          );

          this.errorCarga.set(
            this.obtenerMensajeError(
              error,
              'No fue posible descargar el archivo.'
            )
          );
        }
      });
  }

  obtenerIcono(
    archivo: ArchivoApi
  ): string {

    const tipo =
      archivo.tipoArchivo
        ?.toLowerCase() ?? '';

    const extension =
      this.obtenerExtension(
        archivo.nombreArchivo
      );

    if (
      tipo.includes('pdf') ||
      extension === 'pdf'
    ) {
      return 'bi-file-earmark-pdf';
    }

    if (
      tipo.includes('image') ||
      ['png', 'jpg', 'jpeg']
        .includes(extension)
    ) {
      return 'bi-file-earmark-image';
    }

    return 'bi-file-earmark';
  }

  obtenerClaseTipo(
    archivo: ArchivoApi
  ): string {

    const extension =
      this.obtenerExtension(
        archivo.nombreArchivo
      );

    if (extension === 'pdf') {
      return 'tipo-pdf';
    }

    if (
      ['png', 'jpg', 'jpeg']
        .includes(extension)
    ) {
      return 'tipo-imagen';
    }

    return 'tipo-general';
  }

  obtenerIniciales(
    nombre: string | null
  ): string {

    if (!nombre?.trim()) {
      return 'US';
    }

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        parte =>
          parte.charAt(0)
      )
      .join('')
      .toUpperCase();
  }

  private limpiarSeleccion(): void {

    this.archivoSeleccionado.set(
      null
    );

    if (this.inputArchivo) {
      this.inputArchivo
        .nativeElement
        .value = '';
    }
  }

  private notificarCantidad(): void {

    this.cantidadCambiada.emit(
      this.archivos().length
    );
  }

  private obtenerExtension(
    nombre: string
  ): string {

    const partes =
      nombre.toLowerCase().split('.');

    return partes.length > 1
      ? partes.pop() ?? ''
      : '';
  }

  private convertirTamanio(
    bytes: number
  ): string {

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;

    return `${mb.toFixed(1)} MB`;
  }

  private obtenerMensajeError(
    error: {
      status?: number;
      error?: {
        mensaje?: string;
      };
    },
    mensajePredeterminado: string
  ): string {

    if (error?.error?.mensaje) {
      return error.error.mensaje;
    }

    if (error?.status === 0) {
      return (
        'No se pudo conectar con Java. ' +
        'Verifica que GlassFish esté ejecutándose.'
      );
    }

    if (error?.status === 401) {
      return (
        'Tu sesión ha expirado. ' +
        'Inicia sesión nuevamente en STS.'
      );
    }

    if (error?.status === 413) {
      return (
        'El archivo supera el tamaño máximo permitido de 10 MB.'
      );
    }

    if (error?.status === 415) {
      return (
        'El formato del archivo no está permitido.'
      );
    }

    if (error?.status === 404) {
      return (
        'No se encontró el servicio o el archivo solicitado.'
      );
    }

    return mensajePredeterminado;
  }
}