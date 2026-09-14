import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

import { InfoMessageComponent } from '../components/info-message/info-message.component'; // Import

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoMessageComponent], // Add to imports
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isim = '';
loginInfoMessage = "Lütfen giriş yapınız. Kaydınız yoksa, SMS ile kolayca oluşturabilirsiniz. Detaylar için \"Site Kullanımı\" sayfasını ziyaret ediniz.";
  sifre = '';
  errorMessage = signal('');

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    if (!this.isim || !this.sifre) {
      this.errorMessage.set('İsim ve şifre alanları zorunludur.');
      return;
    }
    this.errorMessage.set(''); // Clear previous error on new attempt
    this.apiService.login(this.isim, this.sifre).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.authService.setLoginData(response);
        this.router.navigate(['/vitrin']);
      },
      error: (error) => {
        console.error('Login failed', error);
        // Use the specific error message from the server if available
        const message = error.error?.message || 'Giriş başarısız, bilinmeyen bir hata oluştu.';
        this.errorMessage.set(message);
      }
    });
  }
}
