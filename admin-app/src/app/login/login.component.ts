import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isim = '';
  sifre = '';
  errorMessage = '';

  constructor(
    private apiService: ApiService, 
    private router: Router, 
    private authService: AuthService
  ) { }

  login(): void {
    if (!this.isim || !this.sifre) {
      this.errorMessage = 'İsim ve şifre alanları zorunludur.';
      return;
    }
    this.apiService.login(this.isim, this.sifre).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.authService.setToken(response.token);
        this.router.navigate(['/yon']);
      },
      error: (error) => {
        console.error('Login failed', error);
        this.errorMessage = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';
      }
    });
  }
}
