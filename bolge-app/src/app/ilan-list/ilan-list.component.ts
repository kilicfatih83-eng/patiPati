import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

interface IlanUI {
  id: number;
  kullaniciId: number;
  bolgeId: number;
  hayvanTuru: string;
  ilanTuru: string;
  baslik: string;
  aciklama: string;
  hayvanIsim: string;
  fotoLink1: string;
  fotoLink2: string;
  fotoLink3: string;
  formVerileri: any;
  durum: number;
  selected?: boolean;
  originalDurum?: number;
}

@Component({
  selector: 'app-ilan-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ilan-list.component.html',
  styleUrls: ['./ilan-list.component.css']
})
export class IlanListComponent {
  private apiService = inject(ApiService);

  ilanlar = signal<IlanUI[]>([]);
  isLoading = signal(false);
  selectedIlan = signal<IlanUI | null>(null);
  siraInfo = signal('');
  error = signal<string | null>(null);
  failedIds = signal(new Set<number>());

  filters = {
    limit: 50,
    page: 1,
    turler: {
      kedi: false,
      kopek: false,
      kus: false
    }
  };

  durumlar = [
    { id: 0, text: 'Red', checked: false },
    { id: 1, text: 'Onay', checked: true },
    { id: 2, text: 'İşlemsiz', checked: true },
    { id: 3, text: 'Diğer', checked: false },
    { id: 4, text: 'Diğer', checked: false },
    { id: 5, text: 'Diğer', checked: false },
    { id: 6, text: 'Diğer', checked: false },
    { id: 7, text: 'Diğer', checked: false },
    { id: 8, text: 'Diğer', checked: false }
  ];

  totalCount = signal(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.filters.limit));

  getIlanlar() {
    this.isLoading.set(true);
    this.error.set(null);
    this.siraInfo.set('');

    const activeTurFilters = Object.keys(this.filters.turler).filter(key => this.filters.turler[key as keyof typeof this.filters.turler]);
    const activeDurumFilters = this.durumlar.filter(d => d.checked).map(d => d.id);

    const params: any = {
      ...this.filters,
      tur: activeTurFilters.join(','),
      durum: activeDurumFilters.join(',')
    };
    delete params.turler;

    this.apiService.getIlanlar(params).subscribe({
      next: (response: any) => {
        const newIlanlar = response.ilanlar.map((ilan: any) => ({ 
            ...ilan, 
            selected: false, 
            originalDurum: ilan.durum,
            formVerileri: this.parseFormVerileri(ilan.formVerileri)
        }));
        this.ilanlar.set(newIlanlar);
        this.totalCount.set(response.total);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.error.set(`İlanlar getirilirken bir hata oluştu: ${err.error?.message || 'Bilinmeyen sunucu hatası'}`);
        console.error('Error fetching ilanlar', err);
        this.isLoading.set(false);
      }
    });
  }

  changePage(direction: 'prev' | 'next') {
    if (direction === 'prev' && this.filters.page > 1) {
      this.filters.page--;
    } else if (direction === 'next' && this.filters.page < this.totalPages()) {
      this.filters.page++;
    }
    this.getIlanlar();
  }

  bulkUpdateStatus(newStatus: number) {
    const selectedIlans = this.ilanlar().filter(i => i.selected);
    if (selectedIlans.length === 0) {
      this.error.set("Lütfen işlem yapmak için en az bir ilan seçin.");
      return;
    }

    this.ilanlar.update(ilans =>
      ilans.map(ilan =>
        ilan.selected ? { ...ilan, durum: newStatus } : ilan
      )
    );

    // Değişiklikleri hemen kaydet
    this.kaydet();
  }

  kaydet() {
    const updates = this.ilanlar()
      .filter(ilan => ilan.durum !== ilan.originalDurum)
      .map(ilan => ({ id: ilan.id, durum: ilan.durum }));

    if (updates.length === 0) {
      this.error.set("Kaydedilecek bir değişiklik yok.");
      return;
    }

    this.apiService.updateIlanDurum(updates).subscribe({
      next: () => {
        this.error.set("Değişiklikler başarıyla kaydedildi.");
        // On success, clear failed IDs and refresh the list.
        this.failedIds.set(new Set());
        this.getIlanlar();
      },
      error: (err: HttpErrorResponse) => {
        this.failedIds.set(new Set());

        if (err.error && Array.isArray(err.error.failures)) {
            const hatalıIdListesi = new Set<number>();
            for (const failure of err.error.failures) {
                hatalıIdListesi.add(failure.update.id); // Assuming the failure object contains the update payload
            }
            this.failedIds.set(hatalıIdListesi);
            this.error.set(err.error.message || `${hatalıIdListesi.size} adet ilan güncellenemedi.`);
        } else if (err.error && err.error.message) {
            this.error.set(err.error.message);
        } else {
            this.error.set("Bilinmeyen bir hata oluştu.");
        }
      }
    });
  }

  openModal(ilan: IlanUI) {
    this.selectedIlan.set(ilan);
  }

  closeModal() {
    this.selectedIlan.set(null);
  }

  hizliDurumGuncelle(yeniDurum: number) {
    const currentIlan = this.selectedIlan();
    if (!currentIlan) return;

    this.ilanlar.update(ilans => 
      ilans.map(ilan => 
        ilan.id === currentIlan.id ? { ...ilan, durum: yeniDurum } : ilan
      )
    );

    this.closeModal();
  }

  getDurumText(durum: number): string {
    if (durum === 0) return 'Red';
    if (durum === 1) return 'Onay';
    if (durum === 2) return 'İşlemsiz';
    if (durum >= 3 && durum <= 8) return 'Diğer';
    return `Bilinmeyen (${durum})`;
  }

  parseFormVerileri(data: string): any {
    try {
      if (typeof data === 'object' && data !== null) {
        return data;
      }
      return JSON.parse(data);
    } catch (e) {
      return {};
    }
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.ilanlar.update(ilans => ilans.map(i => ({ ...i, selected: checked })) );
  }

  showSira() {
    const selected = this.ilanlar().find(i => i.selected);
    if (!selected) {
      this.siraInfo.set('Lütfen bir satır seçin.');
      return;
    }
    
    const index = this.ilanlar().findIndex(i => i.id === selected.id);
    const position = (this.filters.page - 1) * this.filters.limit + index + 1;
    this.siraInfo.set(`${position} / ${this.totalCount()}`);
  }

  resimHazirla() {
    const selectedIlans = this.ilanlar().filter(i => i.selected);
    if (selectedIlans.length === 0) {
      this.error.set("Lütfen resimlerini hazırlamak için ilanları seçin.");
      return;
    }

    console.log("Resimler önbelleğe alınıyor...");
    let loadedCount = 0;
    const totalImages = selectedIlans.reduce((count, ilan) => {
        if (ilan.fotoLink1) count++;
        if (ilan.fotoLink2) count++;
        if (ilan.fotoLink3) count++;
        return count;
    }, 0);

    if (totalImages === 0) {
        this.error.set("Seçili ilanlarda gösterilecek resim bulunamadı.");
        return;
    }

    selectedIlans.forEach(ilan => {
      const images = [ilan.fotoLink1, ilan.fotoLink2, ilan.fotoLink3].filter(Boolean);
      images.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    // Success, do nothing or set a success message
                }
            };
            img.onerror = () => {
                loadedCount++;
                 if (loadedCount === totalImages) {
                    this.error.set(`${selectedIlans.length} ilanın resimleri önbelleğe alındı, ancak bazıları yüklenemedi.`);
                }
            }
        });
    });
  }
}
