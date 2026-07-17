import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ComentarioApi } from '../../models/comentario';
import { ComentarioService } from '../../services/comentario';

@Component({
  selector: 'app-comentarios-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comentarios-ticket.html',
  styleUrl: './comentarios-ticket.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComentariosTicketComponent implements OnInit {

  private readonly comentarioService =
    inject(ComentarioService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly idTicket = input.required<number>();

  readonly ticketCerrado = input(false);

  readonly cantidadCambiada = output<number>();

  readonly comentarios = signal<ComentarioApi[]>([]);

  readonly textoComentario = signal('');

  readonly cargando = signal(true);
  readonly publicando = signal(false);

  readonly errorCarga = signal('');
  readonly errorPublicacion = signal('');
  readonly mensajeExito = signal('');

  readonly limiteCaracteres = 500;

  readonly caracteresRestantes = computed(() => {
    return this.limiteCaracteres -
      this.textoComentario().length;
  });

  readonly formularioValido = computed(() => {
    const texto = this.textoComentario().trim();

    return (
      texto.length > 0 &&
      texto.length <= this.limiteCaracteres &&
      !this.publicando()
    );
  });

  ngOnInit(): void {
    this.cargarComentarios();
  }

  cargarComentarios(): void {
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

    this.comentarioService
      .obtenerComentarios(id)
      .pipe(
        finalize(() => {
          this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {

          if (!respuesta.exito) {
            this.errorCarga.set(
              respuesta.mensaje ||
              'No fue posible cargar los comentarios.'
            );
            return;
          }

          const lista = respuesta.comentarios ?? [];

          this.comentarios.set(lista);
          this.notificarCantidad();
        },

        error: error => {
          console.error(
            'Error al consultar comentarios:',
            error
          );

          this.errorCarga.set(
            this.obtenerMensajeError(
              error,
              'No fue posible cargar los comentarios.'
            )
          );
        }
      });
  }

  actualizarTexto(evento: Event): void {
    const elemento =
      evento.target as HTMLTextAreaElement;

    let valor = elemento.value;

    if (valor.length > this.limiteCaracteres) {
      valor = valor.substring(
        0,
        this.limiteCaracteres
      );

      elemento.value = valor;
    }

    this.textoComentario.set(valor);
    this.errorPublicacion.set('');
    this.mensajeExito.set('');
  }

  publicarComentario(): void {
    if (this.ticketCerrado()) {
      this.errorPublicacion.set(
        'Este ticket ya fue cerrado y no admite nuevos comentarios.'
      );
      return;
    }
    const texto =
      this.textoComentario().trim();

    if (!texto) {
      this.errorPublicacion.set(
        'Escribe un comentario antes de publicarlo.'
      );
      return;
    }

    if (texto.length > this.limiteCaracteres) {
      this.errorPublicacion.set(
        `El comentario no puede superar los ${this.limiteCaracteres} caracteres.`
      );
      return;
    }

    if (this.publicando()) {
      return;
    }

    this.publicando.set(true);
    this.errorPublicacion.set('');
    this.mensajeExito.set('');

    this.comentarioService
      .publicarComentario({
        idTicket: this.idTicket(),
        comentario: texto
      })
      .pipe(
        finalize(() => {
          this.publicando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: respuesta => {

          if (
            !respuesta.exito ||
            !respuesta.comentario
          ) {
            this.errorPublicacion.set(
              respuesta.mensaje ||
              'No fue posible publicar el comentario.'
            );
            return;
          }

          this.comentarios.update(lista => [
            ...lista,
            respuesta.comentario!
          ]);

          this.textoComentario.set('');

          this.mensajeExito.set(
            respuesta.mensaje ||
            'Comentario publicado correctamente.'
          );

          this.notificarCantidad();

          setTimeout(() => {
            this.mensajeExito.set('');
          }, 3500);
        },

        error: error => {
          console.error(
            'Error al publicar comentario:',
            error
          );

          this.errorPublicacion.set(
            this.obtenerMensajeError(
              error,
              'No fue posible publicar el comentario.'
            )
          );
        }
      });
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
      .map(parte => parte.charAt(0))
      .join('')
      .toUpperCase();
  }

  private notificarCantidad(): void {
    this.cantidadCambiada.emit(
      this.comentarios().length
    );
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
        'Tu sesión de Java no está activa. ' +
        'Inicia sesión nuevamente en el sistema STS.'
      );
    }

    if (error?.status === 404) {
      return 'No se encontró el servicio de comentarios.';
    }

    return mensajePredeterminado;
  }
}