import { Routes } from '@angular/router';


export const routes: Routes = [
    {
        path: 'vitrin',
        loadComponent: () => import('./vitrin/vitrin.component').then(m => m.VitrinComponent)
    },
    {
        path: 'login',
        loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'ilan/yeni',
        loadComponent: () => import('./ilan-form/ilan-form.component').then(m => m.IlanFormComponent)
    },
    {
        path: 'ilan/:id',
        loadComponent: () => import('./ilan-detay/ilan-detay.component').then(m => m.IlanDetayComponent)
    },
    {
        path: 'ilan/:id/talip-ol',
        loadComponent: () => import('./talip-form/talip-form.component').then(m => m.TalipFormComponent)
    },
    {
        path: 'site-kullanim',
        loadComponent: () => import('./site-kullanim/site-kullanim.component').then(m => m.SiteKullanimComponent)
    },
    {
        path: 'my-applications',
        loadComponent: () => import('./my-applications/my-applications.component').then(m => m.MyApplicationsComponent)
    },
    {
        path: 'my-ads-applicants',
        loadComponent: () => import('./my-ad-applicants/my-ad-applicants.component').then(m => m.MyAdApplicantsComponent)
    },
    {
        path: 'my-ads',
        loadComponent: () => import('./my-ads/my-ads.component').then(m => m.MyAdsComponent)
    },
    {
        path: '',
        redirectTo: '/vitrin',
        pathMatch: 'full'
    }
];