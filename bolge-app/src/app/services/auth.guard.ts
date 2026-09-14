import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

if (authService.isLoggedIn()) {
    return true;
  } else {
    // The header will now show a static 'GİRİŞ YAPIN' message.
    // No need to set a dynamic notification.
    return false;
  }
};
