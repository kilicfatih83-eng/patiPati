import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "./services/auth.service";
import { Observable, tap, catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // The logic for setting a global header message is removed as per the new architecture.

  if (token) {
    req = req.clone({
      headers: req.headers.set("Authorization", `Bearer ${token}`),
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // As per the plan, the interceptor now ONLY handles session expiration.
      // It logs the user out silently and passes all other errors to the component.
      if (error.error && error.error.errorCode === 1001) { // 1001: Oturum Süresi Doldu
        authService.logout(); // Silently log out.
      }

      // Pass all errors (including the session expired one) to the component for local handling.
      return throwError(() => error);
    })
  );
};
