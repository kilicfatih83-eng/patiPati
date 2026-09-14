import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent {
  authService = inject(AuthService);
  router = inject(Router);

  currentUser = this.authService.currentUser;
  notification = this.authService.notification;
  authError = this.authService.authError;

  clearNotification = this.authService.clearNotification.bind(this.authService);

  login(): void {
    this.authService.authError.set(null); // Clear auth error when navigating to login
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.removeToken();
    // this.router.navigate(["/login"]); // Kullanıcı isteği üzerine yönlendirme kaldırıldı.
  }
}
