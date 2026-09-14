import { Routes } from '@angular/router';


export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'ilanlar',
        loadComponent: () => import('./ilan-list/ilan-list.component').then(m => m.IlanListComponent)
    },
    {
        path: 'talipler',
        loadComponent: () => import('./talip-list/talip-list.component').then(m => m.TalipListComponent)
    },
    {
        path: '',
        redirectTo: 'ilanlar',
        pathMatch: 'full'
    }
];
