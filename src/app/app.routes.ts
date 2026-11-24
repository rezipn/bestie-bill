import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'upload', loadComponent: () => import('./pages/upload/upload').then(m => m.Upload) },
  { path: 'result', loadComponent: () => import('./pages/result/result').then(m => m.Result) },
];