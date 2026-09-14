import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authToken = this.authService.getToken();
    let authReq = req;
    if (authToken) {
      authReq = req.clone({ headers: req.headers.set('Authorization', `Bearer ${authToken}`) });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.error && error.error.errorCode === 1001) {
          // Only automatically logout if the token has expired.
          this.authService.logout();
        }
        // For all other errors, just pass them through to be handled by the component.
        return throwError(() => error);
      })
    );
  }
}
