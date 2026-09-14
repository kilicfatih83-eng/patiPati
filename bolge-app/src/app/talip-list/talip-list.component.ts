import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

interface TalipUI {
  id: number;
  ilanId: number;
  talipId: number;
  talipMsj: string;
  sahipMsj: string;
  basvuruTarihi: string;
  durum: number;
  bolgeId: number;
  hayvanTuru: string;
  selected?: boolean;
  originalDurum?: number;
}

@Component({
  selector: 'app-talip-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './talip-list.component.html',
  styleUrls: ['./talip-list.component.css']
})
export class TalipListComponent {
  private apiService = inject(ApiService);

  bilgiMesaji = signal<string | null>(null);

  talipler = signal<TalipUI[]>([]);
  isLoading = signal(false);
  selectedTalip = signal<TalipUI | null>(null);
  selectedIlan = signal<any | null>(null);

  filters = {
    limit: 50,
    page: 1,
    turler: {
      kedi: false,
      kopek: false,
      kus: false
    }
  };

  totalCount = signal(0);
  totalPages = computed(() => Math.ceil(this.totalCount() / this.filters.limit));

  durumMap = new Map<number, string>([
    [0, 'Red'],
    [1, 'Onay'],
    [2, 'İşlemsiz/Ön Onay'],
    [4, 'Diğer'],
    [5, 'Diğer'],
    [6, 'Diğer'],
    [7, 'Diğer'],
    [8, 'Diğer']
  ]);

  // For filter checkboxes
  durumlarFiltre = Array.from(this.durumMap.entries()).map(([id, text]) => ({
    id,
    text,
    checked: id === 2, // Default to checking 'İşlemsiz'
  }));

  // For modal action buttons - simplified as per feedback
  modalHizliGuncelleButtons = Array.from(this.durumMap.entries()).map(([id, text]) => ({ id, text }));

  // For bulk update buttons
  bulkUpdateButtons = Array.from(this.durumMap.entries()).map(([id, text]) => ({ id, text }));

  getTalipler() {
    this.isLoading.set(true);
    this.bilgiMesaji.set(null);
    const activeTurFilters = Object.keys(this.filters.turler).filter(key => this.filters.turler[key as keyof typeof this.filters.turler]);
    const activeDurumFilters = this.durumlarFiltre.filter(d => d.checked).map(d => d.id);

    const params: any = {
      page: this.filters.page,
      limit: this.filters.limit,
      tur: activeTurFilters.join(','),
      durum: activeDurumFilters.join(',')
    };

    this.apiService.getTalipler(params).subscribe({
      next: (response: any) => {
        try {
          const rawList = Array.isArray(response) ? response : (response?.talipler || []);
          const newTalipler = rawList.map((talip: any) => ({ 
              ...talip, 
              selected: false, 
              originalDurum: talip.durum
          }));
          this.talipler.set(newTalipler);
          this.totalCount.set(response?.total !== undefined ? response.total : rawList.length);
        } catch (parseError: any) {
          console.error('Error parsing talipler response', parseError);
          this.bilgiMesaji.set("Talepler işlenirken bir hata oluştu.");
        } finally {
          this.isLoading.set(false);
        }
      },
      error: (err: any) => {
        console.error('Error fetching talipler', err);
        this.bilgiMesaji.set("Talepler getirilirken bir hata oluştu: " + (err.error?.message || 'Bilinmeyen hata'));
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
    this.getTalipler();
  }

  bulkUpdateStatus(newStatus: number) {
    const selectedTalipler = this.talipler().filter(t => t.selected);
    if (selectedTalipler.length === 0) {
      this.bilgiMesaji.set("Lütfen işlem yapmak için en az bir talep seçin.");
      return;
    }
    this.talipler.update(talipler =>
      talipler.map(talip =>
        talip.selected ? { ...talip, durum: newStatus } : talip
      )
    );
  }

  getDurumText(durum: number): string {
    return this.durumMap.get(durum) || `Bilinmeyen (${durum})`;
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.talipler.update(talipler => talipler.map(t => ({ ...t, selected: checked })) );
  }

  openTalipModal(talip: TalipUI) {
    this.selectedTalip.set(talip);
  }

  closeModal() {
    this.selectedTalip.set(null);
  }

  hizliDurumGuncelle(newStatus: number) {
    const currentTalip = this.selectedTalip();
    if (!currentTalip) return;

    this.talipler.update(talipler =>
      talipler.map(t =>
        t.id === currentTalip.id ? { ...t, durum: newStatus } : t
      )
    );

    this.closeModal();
  }

  kaydet() {
    const updates = this.talipler()
      .filter(talip => talip.durum !== talip.originalDurum)
      .map(talip => ({ id: talip.id, durum: talip.durum }));

    if (updates.length === 0) {
      this.bilgiMesaji.set("Kaydedilecek bir değişiklik yok.");
      return;
    }

    this.apiService.updateTalipDurum(updates).subscribe({
      next: () => {
        this.bilgiMesaji.set("Değişiklikler başarıyla kaydedildi.");
        this.getTalipler();
      },
      error: (err: any) => {
        this.bilgiMesaji.set("Hata: " + err.error?.message);
      }
    });
  }

  // Correct implementation for the ad detail modal
  openIlanModal(ilanId: number) {
    this.apiService.getIlanDetayForBolge(ilanId).subscribe({
      next: (response) => {
        const ilan = {
          ...response,
          formVerileri: this.parseFormVerileri(response.formVerileri)
        }
        this.selectedIlan.set(ilan);
      },
      error: (err) => {
        this.bilgiMesaji.set("İlan detayı getirilirken bir hata oluştu: " + (err.error?.message || 'Bilinmeyen hata'));
        console.error("Ilan Modal Error:", err);
      }
    })
  }

  closeIlanModal() {
    this.selectedIlan.set(null);
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
}
