import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { deepEqual } from '../utils/deep-equal';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-yon-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './yon-list.component.html',
  styleUrls: ['./yon-list.component.css']
})
export class YonListComponent {
  originalYoneticiList = signal<any[]>([]);
  displayYoneticiList = signal<any[]>([]);
  newRows = signal<any[]>([]);
  updatedIds = signal(new Set<number>());
  deletedIds = signal(new Set<number>());
  bolgeler = signal<any[]>([]);
  selectedCount = computed(() => this.displayYoneticiList().filter(y => y.selected).length);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  private apiService = inject(ApiService);

  getBolgeler(): void {
    this.apiService.getBolgeler().subscribe(data => {
      this.bolgeler.set(data);
    });
  }

  getir(): void {
    this.error.set(null);
    this.success.set(null);
    this.apiService.getYon().subscribe({
      next: data => {
        const uiData = data.map(d => ({ ...d, selected: false }));
        this.originalYoneticiList.set(JSON.parse(JSON.stringify(uiData)));
        this.displayYoneticiList.set(JSON.parse(JSON.stringify(uiData)));
        this.newRows.set([]);
        this.updatedIds.set(new Set<number>());
        this.deletedIds.set(new Set<number>());
      },
      error: err => {
        this.error.set(err.error?.message || 'Yöneticiler getirilemedi.');
        this.success.set(null);
        console.error('Error fetching yoneticiler', err);
      }
    });
  }

  yeniSatirEkle(): void {
    this.newRows.update(rows => [...rows, { isim: '', sifre: '', telefon: '', mail: '', kus: 0, kedi: 0, kopek: 0, adm: 0, bolgeId: null, engelli: 0, selected: false }]);
  }

  deleteRow(id: number): void {
    this.displayYoneticiList.update(list => list.filter(item => item.id !== id));
    this.deletedIds.update(ids => ids.add(id));
  }

  kaydet(): void {
    this.error.set(null);
    this.success.set(null);

    const originalMap = new Map(this.originalYoneticiList().map(item => [item.id, item]));
    const updates = this.displayYoneticiList()
      .filter(currentItem => {
        if (!this.updatedIds().has(currentItem.id)) return false;
        const originalItem = originalMap.get(currentItem.id);
        return !deepEqual(currentItem, originalItem);
      });

    const inserts = this.newRows();
    const deletes = Array.from(this.deletedIds());

    if (updates.length === 0 && inserts.length === 0 && deletes.length === 0) {
      this.error.set('Kaydedilecek bir değişiklik yok.');
      this.success.set(null);
      return;
    }

    this.apiService.saveChanges({ updates, inserts, deletes }).subscribe({
      next: (response) => {
        this.success.set('Değişiklikler başarıyla kaydedildi.');
        this.error.set(null);

        if (response.failures && response.failures.length > 0) {
          console.log("Failures:", response.failures);
          this.error.set(`Bazı kayıtlar kaydedilemedi: ${response.failures.map((f: any) => f.error || f.message).join(", ")}`);
          this.success.set(null);
        }
        this.newRows.set([]);
        this.updatedIds.set(new Set<number>());
        this.deletedIds.set(new Set<number>());
        this.getir();
      },
      error: (err: HttpErrorResponse) => {
        this.success.set(null);
        if (err.error && err.error.message) {
            this.error.set(err.error.message);
        } else {
            this.error.set("Kaydetme sırasında beklenmedik bir sunucu hatası oluştu.");
        }
        console.error('Save failed', err);
      }
    });
  }

  handleModelChange(id: number): void {
    this.updatedIds.update(ids => ids.add(id));
  }
  
  isRowDisabled(yonetici: any): boolean {
    return false;
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.displayYoneticiList.update(yoneticiler => 
      yoneticiler.map(y => 
        this.isRowDisabled(y) ? y : { ...y, selected: checked }
      )
    );
    this.onRowSelect();
  }

  onRowSelect(): void {
    this.displayYoneticiList().forEach(yonetici => {
      if (yonetici.selected) {
        this.updatedIds.update(ids => ids.add(yonetici.id));
      }
    });
  }
}
