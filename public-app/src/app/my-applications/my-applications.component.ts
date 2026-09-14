import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InfoMessageComponent } from '../components/info-message/info-message.component';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoMessageComponent],
  templateUrl: './my-applications.component.html',
  styleUrls: ['./my-applications.component.css']
})
export class MyApplicationsComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private router = inject(Router);

  readonly myApplicationsInfoMessage = 'Diğer kullanıcılara ait ilanlara yaptığınız başvuruları burada listeleyebilirsiniz. Mesajınızı güncellemek yayın hakkınızı düşürebilir.';

  applications = signal<any[]>([]);
  isLoading = signal(true);
  bilgiMesaji = signal<{text: string, type: 'error' | 'success'} | null>(null);
  authError = signal<string | null>(null);

  openCardId = signal<number | null>(null);
  selectedApplicationDetail = signal<any | null>(null);
  detailsLoading = signal(false);
  replyMessage = signal('');

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications() {
    this.isLoading.set(true);
    this.bilgiMesaji.set(null);
    this.authError.set(null);
    this.apiService.getMyApplications().subscribe({
      next: (data: any) => {
        if (data && data.basvurular) {
          this.applications.set(data.basvurular);

        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const errorPayload = err.error;
        if (errorPayload?.errorCode === 1001) {
          this.authError.set('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
        } else {
          this.bilgiMesaji.set({ text: errorPayload?.message || 'Başvurular yüklenirken bir hata oluştu.', type: 'error' });
        }
        this.isLoading.set(false);
      }
    });
  }

  getDurumText(durum: number): string {
    const durumlar: { [key: number]: string } = {
        0: 'Reddedilmiş',
        1: 'Onaylı',
        2: 'Ön Onaylı',
    };
    return durumlar[durum] || 'Bilinmiyor';
  }

  sendReply(talipId: number) {
    this.bilgiMesaji.set(null);
    if (this.replyMessage().trim().length === 0) {
      this.bilgiMesaji.set({ text: 'Mesaj boş olamaz.', type: 'error' });
      return;
    }
    this.apiService.gonderMesaj({ talipId: talipId, mesaj: this.replyMessage(), role: 'applicant' }).subscribe({
      next: (response: any) => {

        this.bilgiMesaji.set({ text: 'Mesajınız başarıyla güncellendi.', type: 'success' });
        const currentlyOpen = this.applications().find(app => app.id === this.openCardId());
        if(currentlyOpen) {
            this.getDetails(currentlyOpen, true);
        }
      },
      error: (err: HttpErrorResponse) => {
        const errPayload = err.error;
        this.bilgiMesaji.set({ text: errPayload?.message || 'Mesaj gönderilemedi.', type: 'error' });
        // If the error is "Insufficient Quota", update the authService with the correct quota sent by the server.
        if (errPayload && typeof errPayload.guncelYayinHakki !== 'undefined') {
          this.authService.updateYayinHakki(errPayload.guncelYayinHakki);
        }
      }
    });
  }

  toggleDetails(app: any): void {
      this.bilgiMesaji.set(null);
      if (this.openCardId() === app.id) {
          this.openCardId.set(null);
          this.selectedApplicationDetail.set(null);
      } else {
          this.openCardId.set(app.id);
          this.getDetails(app, false);
      }
  }

  viewIlanDetails(app: any): void {
    const ilanData = { id: app.ilanId, durum: app.ilanDurum };
    this.router.navigate(['/ilan', app.ilanId], { state: { ilanData } });
  }

  getDetails(app: any, keepMessage: boolean): void {
      if (!keepMessage) {
        this.bilgiMesaji.set(null);
      }
      this.detailsLoading.set(true);
      this.selectedApplicationDetail.set(null);
      this.replyMessage.set('');

      const isGettable = app.durum === 1 || app.durum === 2;
      const apiCall = isGettable
          ? this.apiService.getTalepDetayFull(app.id)
          : this.apiService.getTalepDetayKisitli(app.id);

      apiCall.subscribe({
          next: (details) => {
              this.selectedApplicationDetail.set(details);
              if (app.durum !== 0) {
                  this.replyMessage.set(details.talipMsj || '');
              }
              this.detailsLoading.set(false);
          },
          error: (err: HttpErrorResponse) => {
              const errorPayload = err.error;
              let userMessage = err.error?.message || 'Detaylar getirilemedi.';

              switch(errorPayload?.subCode) {
                  case 120303: // Yetki yok
                  case 120304:
                      break;
                  case 400302: // Kayıt bulunamadı
                      userMessage = 'Bu başvuru artık mevcut değil.';
                      this.openCardId.set(null);
                      break;
              }
              this.bilgiMesaji.set({ text: userMessage, type: 'error' });
              this.detailsLoading.set(false);
          }
      });
  }
}
