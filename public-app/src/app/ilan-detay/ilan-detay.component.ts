import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { ApiService } from "../services/api.service";
import { IlanStateService } from "../services/ilan-state.service";
import { AuthService } from "../services/auth.service";
import { HttpErrorResponse } from "@angular/common/http";
import { InfoMessageComponent } from "../components/info-message/info-message.component";

@Component({
  selector: "app-ilan-detay",
  standalone: true,
  imports: [CommonModule, InfoMessageComponent],
  templateUrl: "./ilan-detay.component.html",
  styleUrls: ["./ilan-detay.component.css"]
})
export class IlanDetayComponent implements OnInit {
  ilan = signal<any | null>(null);
  error = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isOwnerViewSignal = signal<boolean>(false);

  readonly ilanDetayInfoMessage = 'İlan detaylarını görüntülüyorsunuz. Onaylanmamış veya sahibi olmadığınız ilanların bazı detayları gizlenebilir.';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private location = inject(Location);
  private ilanStateService = inject(IlanStateService);
  authService = inject(AuthService);

  isModalOpen = signal(false);
  modalImageUrl = signal('');

  openImageModal(imageUrl: string): void {
    this.modalImageUrl.set(imageUrl);
    this.isModalOpen.set(true);
  }

  closeImageModal(): void {
    this.isModalOpen.set(false);
    this.modalImageUrl.set('');
  }

  isOwner = computed(() => {
    const curIlan = this.ilan();
    const user = this.authService.currentUser();
    if (this.isOwnerViewSignal()) return true;
    if (curIlan && user && curIlan.kullaniciId === user.id) return true;
    return false;
  });

  formVerileri = computed(() => {
    const currentIlan = this.ilan();
    if (!currentIlan || !currentIlan.formVerileri) return [];
    try {
      const parsedData = typeof currentIlan.formVerileri === 'string' 
        ? JSON.parse(currentIlan.formVerileri) 
        : currentIlan.formVerileri;
      return Object.entries(parsedData).map(([key, value]) => ({ key, value }));
    } catch (e) { return []; }
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.error.set("İlan ID bulunamadı.");
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);

    // Angular'da router state'i ngOnInit içinde history.state üzerinden güvenle okunur
    const state = history.state;
    const isOwnerView = state?.["isOwnerView"] === true;
    this.isOwnerViewSignal.set(isOwnerView);

    let ilanDataFromState = state?.["ilanData"];

    // Sayfa yenilendiyse state servisine bak
    if (!ilanDataFromState) {
      ilanDataFromState = this.ilanStateService.findAdById(Number(id));
    }

    let apiCall;

    if (isOwnerView) {
      const durum = ilanDataFromState?.durum;
      if (durum === 1) {
        apiCall = this.apiService.getMyAdDetayFull(id); // Sahibi olduğu ONAYLI ilan
      } else {
        apiCall = this.apiService.getMyAdDetayKisitli(id); // Sahibi olduğu ONAYLI OLMAYAN (önonaylı vb.) ilan
      }
    } else {
      apiCall = this.apiService.getIlanDetayFull(id); // Herkese açık VİTRİN görünümü
    }

    apiCall.subscribe({
      next: (data: any) => {
        this.ilan.set(data);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        const errorPayload = err.error;
        let userMessage = errorPayload?.message || 'Bilinmeyen bir hata oluştu.';

        switch(errorPayload?.subCode) {
            case 120305: // Sahibi olmadığı ilanın kısıtlı detayını istedi
            case 400303: // İlan ID'si DB'de bulunamadı veya henüz onaylanmamış
                // Eğer kullanıcı kendi önonaylı ilanına vitrinden bakmaya çalıştıysa veya oturumu varsa kısıtlı detayı deneyelim
                if (this.authService.isLoggedIn() && !isOwnerView) {
                  this.apiService.getMyAdDetayKisitli(id).subscribe({
                    next: (fallbackData: any) => {
                      this.isOwnerViewSignal.set(true);
                      this.ilan.set(fallbackData);
                    },
                    error: () => {
                      this.error.set(userMessage);
                    }
                  });
                  return;
                }
                this.error.set(userMessage);
                return;
        }
        this.error.set(userMessage);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  goToTalipOl(): void {
    if (this.isOwner()) {
      this.error.set("Kendi ilanınıza başvuramazsınız / cevap yazamazsınız.");
      return;
    }
    if (this.ilan()) {
      this.router.navigate(["/ilan", this.ilan()!.id, "talip-ol"]);
    }
  }

  share(): void {
    navigator.clipboard.writeText(window.location.href).then(() => alert("İlan linki panoya kopyalandı!"));
  }
}