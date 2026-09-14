import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { ApiService } from "../services/api.service";
import { AuthService } from "../services/auth.service";
import { Router } from "@angular/router";
import { IlanStateService } from "../services/ilan-state.service";
import { InfoMessageComponent } from "../components/info-message/info-message.component";

@Component({
  selector: "app-my-ads",
  standalone: true,
  imports: [CommonModule, InfoMessageComponent],
  template: `
    <app-info-message messageKey="myAdsPage" [messageText]="myAdsInfoMessage"></app-info-message>
    <div class="container">
      <h2>İlanlarım</h2>
      @if (authError()) {
        <div class="hata-mesaji">{{ authError() }}</div>
      } @else if (isLoading()) {
        <p>Yükleniyor...</p>
      } @else {
        @if (ads().length > 0) {
          <ul class="ilan-list">
            @for (ad of ads(); track ad.id) {
              <li class="ilan-item" [class.rejected]="ad.durum === 0" (click)="viewDetails(ad)">
                <a>{{ ad.baslik }}</a>
                <span>(Durum: {{ getDurumText(ad.durum) }})</span>
              </li>
            }
          </ul>
        } @else {
          <p>Hiç ilanınız bulunmuyor.</p>
        }
      }
    </div>
  `,
  styles: [`
    .container { padding: 20px; }
    .ilan-list { list-style: none; padding: 0; }
    .ilan-item { background: #f4f4f4; padding: 10px; margin-bottom: 10px; border-radius: 5px; cursor: pointer; }
    .ilan-item a { font-weight: bold; text-decoration: none; color: #333; }
    .ilan-item span { margin-left: 10px; color: #777; }
    .ilan-item.rejected { background-color: #ffebee; border: 1px solid #e57373; }
    .ilan-item.rejected a { text-decoration: line-through; }
    .giris-uyari { text-align: center; padding: 40px; }
    .hata-mesaji { color: #721c24; font-weight: bold; padding: 10px; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; margin: 10px 0; text-align: center; }
  `]
})
export class MyAdsComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private router = inject(Router);
  private ilanStateService = inject(IlanStateService);

  readonly myAdsInfoMessage = 'Sisteme verdiğiniz tüm ilanları ve onay/önonay durumlarını bu sayfadan takip edebilirsiniz. Detayları görmek için bir ilana tıklayın.';

  ads = signal<any[]>([]);
  isLoading = signal(true);
  authError = signal<string | null>(null);

  ngOnInit(): void {
    // Giriş kontrolü burada kaldırıldı, template'de hata mesajı gösterilecek.
    this.isLoading.set(true);
    this.apiService.getMyAds().subscribe({
      next: (data: any) => {
        if (data && data.ilanlar) {
          this.ads.set(data.ilanlar);
          this.ilanStateService.setMyAds(data.ilanlar); // İlanları state'e kaydet
        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          this.authError.set('İlanlarınızı görüntülerken bir yetki sorunu oluştu. Lütfen tekrar giriş yapın.');
          this.authService.logout(); // Token'ı temizle
        } else {
          // Diğer sunucu veya ağ hataları için genel bir mesaj
          this.authError.set('İlanlar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        }
        this.isLoading.set(false);
      }
    });
  }

  getDurumText(durum: number): string {
    const durumlar: { [key: number]: string } = {
        0: "Reddedilmiş",
        1: "Onaylı",
        2: "Ön Onaylı",
    };
    return durumlar[durum] || "Bilinmiyor";
  }

  viewDetails(ad: any): void {
    // isOwnerView flag'i ekleyerek detay sayfasına yönlendir
    this.router.navigate(["/ilan", ad.id], { state: { ilanData: ad, isOwnerView: true } });
  }
}