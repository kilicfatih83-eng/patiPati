import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { InfoMessageComponent } from '../components/info-message/info-message.component';

@Component({
  selector: 'app-my-ad-applicants',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoMessageComponent],
  templateUrl: './my-ad-applicants.component.html',
  styleUrls: ['./my-ad-applicants.component.css']
})
export class MyAdApplicantsComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private router = inject(Router);

  readonly myAdApplicantsInfoMessage = 'Size ait ilanlara yapılan başvuruları burada listeleyebilirsiniz. Başvurulara yanıt vermek veya mesajları güncellemek yayın hakkınızı düşürebilir.';

  applicants = signal<any[]>([]);
  isLoading = signal(true);
  bilgiMesaji = signal<{text: string, type: "error" | "success"} | null>(null);
  authError = signal<string | null>(null);

  openCardId = signal<number | null>(null);
  selectedApplicantDetail = signal<any | null>(null);
  detailsLoading = signal(false);
  replyMessage = signal('');

  ngOnInit(): void {
    this.loadApplicants();
  }

  loadApplicants() {
    this.isLoading.set(true);
    this.bilgiMesaji.set(null);
    this.authError.set(null);
    this.apiService.getMyAdsApplicants().subscribe({
      next: (data: any) => {
        if (data && data.talipler) {
          this.applicants.set(data.talipler);

        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const errorPayload = err.error;
        if (errorPayload?.errorCode === 1001) {
            this.authError.set("Oturum süreniz doldu, lütfen tekrar giriş yapın.");
        } else {
            this.bilgiMesaji.set({ text: errorPayload?.message || "Başvurular yüklenirken bir hata oluştu.", type: "error" });
        }
        this.isLoading.set(false);
      },
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
      this.bilgiMesaji.set({ text: "Mesaj boş olamaz.", type: "error" });
      return;
    }
    this.apiService
      .gonderMesaj({ talipId: talipId, mesaj: this.replyMessage(), role: "owner" })
      .subscribe({
        next: (response: any) => {

          this.bilgiMesaji.set({ text: "Yanıtınız başarıyla gönderildi/güncellendi.", type: "success" });
          const currentlyOpen = this.applicants().find(
            (app) => app.id === this.openCardId()
          );
          if (currentlyOpen) {
            this.getDetails(currentlyOpen, true); // Keep message showing
          }
        },
        error: (err: HttpErrorResponse) => {
          const errPayload = err.error;
          this.bilgiMesaji.set({ text: errPayload?.message || "Mesaj gönderilemedi.", type: "error" });
          // If the error is "Insufficient Quota", update the authService with the correct quota sent by the server.
          if (errPayload && typeof errPayload.guncelYayinHakki !== 'undefined') {
            this.authService.updateYayinHakki(errPayload.guncelYayinHakki);
          }
        },
      });
  }

  searchForIlan(ilanId: number): void {
    this.router.navigate(["/"], { queryParams: { ilan_id: ilanId } });
  }

  toggleDetails(app: any): void {
    this.bilgiMesaji.set(null);
    if (this.openCardId() === app.id) {
      this.openCardId.set(null);
      this.selectedApplicantDetail.set(null);
    } else {
      this.openCardId.set(app.id);
      this.getDetails(app, false);
    }
  }

  getDetails(app: any, keepMessage: boolean): void {
    if (!keepMessage) {
        this.bilgiMesaji.set(null);
    }
    this.detailsLoading.set(true);
    this.selectedApplicantDetail.set(null);
    this.replyMessage.set('');

    const isGettable = app.ilanDurum === 1; // Sadece onaylı ilanın başvuruları görülebilir.
    const apiCall = isGettable
        ? this.apiService.getTalepDetayFull(app.id)
        : this.apiService.getTalepDetayKisitli(app.id);

    apiCall.subscribe({
      next: (details) => {
        this.selectedApplicantDetail.set(details);
        if (app.durum !== 0) {
          this.replyMessage.set(details.sahipMsj || '');
        }
        this.detailsLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const errorPayload = err.error;
        let userMessage = errorPayload?.message || 'Bilinmeyen bir hata oluştu.';

        switch(errorPayload?.subCode) {
            case 120303: // Bu başvurunun detayını görme yetkisi yok
            case 120304:
                // Özel bir şey yapmaya gerek yok, sadece mesajı göster.
                break;
            case 400302: // Başvuru kaydı bulunamadı
                userMessage = 'Bu başvuru artık mevcut değil.';
                this.openCardId.set(null); // Detay kartını kapat
                break;
        }

        this.bilgiMesaji.set({ text: userMessage, type: 'error' });
        this.detailsLoading.set(false);
      },
    });
  }
}
