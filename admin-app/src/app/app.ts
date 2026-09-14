import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
})
export class App {
  protected readonly title = signal('admin-app');
  authService = inject(AuthService);
  router = inject(Router);

  currentUser = this.authService.currentUser;

  logout(): void {
    this.authService.removeToken();
    this.router.navigate(['/login']);
  }
}
