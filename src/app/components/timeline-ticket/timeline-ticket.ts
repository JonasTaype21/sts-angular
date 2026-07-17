import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';

import {
  MovimientoTicketVista
} from '../../models/seguimiento-vista';

@Component({
  selector: 'app-timeline-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline-ticket.html',
  styleUrl: './timeline-ticket.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelineTicketComponent {

  @Input({ required: true })
  movimientos: MovimientoTicketVista[] = [];

  trackMovimiento(
    _indice: number,
    movimiento: MovimientoTicketVista
  ): number {
    return movimiento.id;
  }
}