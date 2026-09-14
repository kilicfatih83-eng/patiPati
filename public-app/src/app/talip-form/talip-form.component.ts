import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { InfoMessageComponent } from '../components/info-message/info-message.component';

@Component({
  selector: 'app-talip-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InfoMessageComponent],
  templateUrl: './talip-form.component.html',
  styleUrls: ['./talip-form.component.css']
})
export class TalipFormComponent implements OnInit {
  ilanId: string | null = null;
  ilan = signal<any | null>(null);
  talipMsj: string = '';
  bilgiMesaji = signal<{text: string, type: 'error' | 'success'} | null>(null);

  readonly talipFormInfoMessage = 'Bir ilana talip olma ve başvuru mesajı gönderme formundasınız. Başvuru yaptığınızda yayın hakkınız düşecektir.';

  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private router = inject(Router);
  authService = inject(AuthService);

  isOwner = computed(() => {
    const i = this.ilan();
    const user = this.authService.currentUser();
    if (i && user && i.kullaniciId === user.id) {
      return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.bilgiMesaji.set(null);
    if (this.authService.isLoggedIn()) {
      this.ilanId = this.route.snapshot.paramMap.get('id');
      if (this.ilanId) {
        this.apiService.getIlanDetayFull(this.ilanId).subscribe({
          next: (data) => {
            this.ilan.set(data);
            if (this.isOwner()) {
              this.bilgiMesaji.set({ text: 'Kendi ilanınıza cevap yazamazsınız / başvuramazsınız.', type: 'error' });
            }
          },
          error: (err) => {
            this.bilgiMesaji.set({ text: err.error?.message || 'İlan bilgileri getirilemedi.', type: 'error' });
          }
        });
      }
    }
  }

  submitApplication(): void {
    this.bilgiMesaji.set(null);
    if (this.isOwner()) {
      this.bilgiMesaji.set({ text: 'Kendi ilanınıza cevap yazamazsınız / başvuramazsınız.', type: 'error' });
      return;
    }

    if (!this.ilanId || !this.talipMsj) {
      this.bilgiMesaji.set({ text: 'Mesaj alanı boş bırakılamaz.', type: 'error' });
      return;
    }

    this.apiService.talipOl(this.ilanId, { talipMsj: this.talipMsj }).subscribe({
      next: (response) => {
        this.bilgiMesaji.set({ text: 'Başvurunuz başarıyla gönderildi! İlan sayfasına yönlendiriliyorsunuz...', type: 'success' });
        setTimeout(() => this.router.navigate(['/ilan', this.ilanId]), 2000);
      },
      error: (error: any) => {
        const errPayload = error.error;
        let msg = errPayload?.message || 'Başvuru gönderilemedi.';
        if (errPayload?.subCode === 400201) {
          msg = 'Kendi ilanınıza başvuramazsınız / cevap yazamazsınız.';
        }
        this.bilgiMesaji.set({ text: msg, type: 'error' });
        // Eğer hata "Yetersiz Hak" ise ve sunucu güncel hakkı gönderdiyse, AuthService'i güncelle.
        if (errPayload && typeof errPayload.guncelYayinHakki !== 'undefined') {
          this.authService.updateYayinHakki(errPayload.guncelYayinHakki);
        }
      }
    });
  }
}
