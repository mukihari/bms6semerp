import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'teacher-dashboard',
    loadComponent: () => import('./pages/teacher-dashboard/teacher-dashboard.page').then( m => m.TeacherDashboardPage)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
 
  
  {
    path: 'student-dashboard',
    loadComponent: () => import('./student-dashboard/student-dashboard.page').then( m => m.StudentDashboardPage)
  },
  {
    path: 'admin-dashboard',
    loadComponent: () => import('./admin-dashboard/admin-dashboard.page').then( m => m.AdminDashboardPage)
  },

];
