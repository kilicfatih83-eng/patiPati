import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';

  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  login(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Kullanıcı adı ve şifre zorunludur.';
      return;
    }

    this.apiService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.router.navigate(['/ilanlar']);
      },
      error: (err) => {
        console.error('Login failed', err);
        this.errorMessage = err.error?.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      }
    });
  }
}
