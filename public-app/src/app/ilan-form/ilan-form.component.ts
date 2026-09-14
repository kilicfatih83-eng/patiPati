import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { InfoMessageComponent } from '../components/info-message/info-message.component';

@Component({
  selector: 'app-ilan-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InfoMessageComponent],
  templateUrl: './ilan-form.component.html',
  styleUrls: ['./ilan-form.component.css']
})
export class IlanFormComponent implements OnInit {
  bolgeler = signal<any[]>([]);
  ilanModel: any = {
    ilanTuru: 'sahiplendirme',
    hayvanTuru: 'kedi',
    topluLink: '',
    fotoLink1: '',
    fotoLink2: '',
    fotoLink3: '',
    formVerileri: {}
  };
  
  bilgiMesaji = signal<{text: string, type: 'error' | 'success'} | null>(null);
  readonly ilanFormInfoMessage = 'Yeni bir ilan oluşturma formundasınız. Lütfen tüm gerekli alanları eksiksiz doldurun. Yayın hakkınızın düşeceğini unutmayın.';
  authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);

  constructor() {}

  ngOnInit(): void {
    this.bilgiMesaji.set(null);
    if (this.authService.isLoggedIn()) {
      this.apiService.getBolgeler().subscribe({
        next: (data) => {
          this.bolgeler.set(data);
        },
        error: (err) => {
          this.bilgiMesaji.set({ text: err.error?.message || 'Bölgeler yüklenemedi.', type: 'error' });
        }
      });
    }
  }

  createIlan(): void {
    this.bilgiMesaji.set(null);
    this.apiService.createIlan(this.ilanModel).subscribe({
      next: (response) => {
        this.bilgiMesaji.set({ text: 'İlan başarıyla oluşturuldu! Vitrine yönlendiriliyorsunuz...', type: 'success' });
        setTimeout(() => this.router.navigate(['/vitrin']), 2000);
      },
      error: (error) => {
        this.bilgiMesaji.set({ text: error.error?.message || 'İlan oluşturulamadı.', type: 'error' });
        // Eğer hata "Yetersiz Hak" ise ve sunucu güncel hakkı gönderdiyse, AuthService'i güncelle.
        if (error.error && typeof error.error.guncelYayinHakki !== 'undefined') {
          this.authService.updateYayinHakki(error.error.guncelYayinHakki);
        }

      }
    });
  }

  openImageUploader(): void {
    window.open("assets/image-uploader.html", "ImageUploader", "width=600,height=500");
  }

  distributeLinks(): void {
    const pastedText = this.ilanModel.topluLink;
    if (pastedText) {
      const links = pastedText.split(/[\n\s]+/).filter((link: string) => link.trim().length > 0);
      if (links.length > 0) this.ilanModel.fotoLink1 = links[0];
      if (links.length > 1) this.ilanModel.fotoLink2 = links[1];
      if (links.length > 2) this.ilanModel.fotoLink3 = links[2];
      this.ilanModel.topluLink = '';
    }
  }

  onMusaitlikHelperChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    if (selectedValue) {
      this.ilanModel.formVerileri.musaitlikMetni = selectedValue;
    }
  }
}
