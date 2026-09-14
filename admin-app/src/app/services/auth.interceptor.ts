import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Per ekosistemv2.txt & public-app reference, only silently logout.
      if (error.error && error.error.errorCode === 1001) {
        authService.removeToken(); // Silently remove token and user state.
      }
      return throwError(() => error);
    })
  );
};