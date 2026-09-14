import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // If not logged in, set a message in the header and block navigation
  authService.setHeaderStatusMessage('Bu sayfayı görüntülemek için giriş yapmalısınız.');
  return false;
};
