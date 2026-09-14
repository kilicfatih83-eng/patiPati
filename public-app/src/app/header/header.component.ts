import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { UiStateService } from '../services/ui-state.service'; // Import

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
uiStateService = inject(UiStateService); // Inject
  private apiService = inject(ApiService);

  // Expose signals to the template
  currentUser = this.authService.currentUser;
  yayinHakki = this.authService.yayinHakki;
  notification = this.authService.notification;
showInfoMessages = this.uiStateService.showInfoMessages;
  headerStatusMessage = this.authService.headerStatusMessage;

  // Expose methods to the template
  clearNotification = this.authService.clearNotification.bind(this.authService);

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.authService.logout();
    // this.router.navigate(["/"]); // Kullanıcı isteği üzerine yönlendirme kaldırıldı.
  }

guncelle(): void {
    this.apiService.getMyYayinHakki().subscribe((res: any) => {
      this.authService.updateYayinHakki(res.yayinHakki);
    });
  }

  toggleInfoHelp(): void {
    this.uiStateService.toggleInfoMessages();
  }

}
