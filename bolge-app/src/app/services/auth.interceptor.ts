import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
      // For all other errors, just pass them through to be handled by the component.
      return throwError(() => error);
    })
  );
};
