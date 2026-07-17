import { Routes } from '@angular/router';
import { HistorialTicketComponent } from './pages/historial-ticket/historial-ticket';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'tickets/1',
        pathMatch: 'full'
    },
    {
        path: 'tickets/:id',
        component: HistorialTicketComponent
    },
    {
        path: '**',
        redirectTo: 'tickets/1'
    }
];