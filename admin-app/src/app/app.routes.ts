import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'yon',
        loadComponent: () => import('./yon-list/yon-list.component').then(m => m.YonListComponent)
    },
    {
        path: 'kullanicilar',
        loadComponent: () => import('./kullanici-list/kullanici-list.component').then(m => m.KullaniciListComponent)
    },
    {
        path: '',
        redirectTo: 'yon',
        pathMatch: 'full'
    }
];