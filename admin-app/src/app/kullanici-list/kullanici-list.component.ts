import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

interface Kullanici {
  id: number;
  isim: string;
  telefon: string;
  mail: string;
  yayinHakki: number;
  durum: number;
  originalDurum?: number;
}

@Component({
  selector: 'app-kullanici-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kullanici-list.component.html',
  styleUrls: ['./kullanici-list.component.css']
})
export class KullaniciListComponent {
  private apiService = inject(ApiService);
  kullanicilar = signal<Kullanici[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Holds the IDs of selected users for bulk actions
  selection = signal(new Set<number>());

  // Holds the status IDs for filtering
  filterSelection = signal(new Set<number>());
  
  // Holds the status IDs for the update operation
  updateStatusSelection: number[] = [];

  selectedCount = computed(() => this.selection().size);
  isAllSelected = computed(() => {
    const allUserIds = this.kullanicilar().map(u => u.id);
    return allUserIds.length > 0 && allUserIds.every(id => this.selection().has(id));
  });

  constructor() {}

  durumMap = new Map<number, string>([
    [0, 'Red'],
    [1, 'Onay'],
    [2, 'İşlemsiz'],
    [3, 'Diğer'],
    [4, 'Diğer'],
    [5, 'Diğer'],
    [6, 'Diğer'],
    [7, 'Diğer'],
    [8, 'Diğer']
  ]);

  statusOptions = Array.from(this.durumMap.entries()).map(([id, text]) => ({ id, text }));

  getKullanicilar(preserveSuccess = false) {
    this.isLoading.set(true);
    this.error.set(null);
    if (!preserveSuccess) {
      this.success.set(null);
    }
    
    const filterParams = Array.from(this.filterSelection());

    this.apiService.getKullanicilar(filterParams).subscribe({
      next: (data) => {
        this.kullanicilar.set(data.map(u => ({ ...u, originalDurum: u.durum })));
        this.isLoading.set(false);
        // Reset selections after fetching data
        this.selection.set(new Set<number>());
        this.updateStatusSelection = [];
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Kullanıcılar getirilirken bir hata oluştu.');
        this.success.set(null);
        console.error('Error fetching kullanicilar', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleSelection(userId: number): void {
    this.selection.update(currentSelection => {
      currentSelection.has(userId) ? currentSelection.delete(userId) : currentSelection.add(userId);
      return new Set(currentSelection);
    });
  }

  toggleSelectAll(): void {
    this.isAllSelected() 
      ? this.selection.set(new Set<number>()) 
      : this.selection.set(new Set(this.kullanicilar().map(u => u.id)));
  }

  toggleFilterSelection(statusId: number): void {
    this.filterSelection.update(currentSelection => {
      currentSelection.has(statusId) ? currentSelection.delete(statusId) : currentSelection.add(statusId);
      return new Set(currentSelection);
    });
  }

  isSelected(userId: number): boolean {
    return this.selection().has(userId);
  }

  getDurumText(durum: number): string {
    return this.durumMap.get(durum) || `Bilinmeyen (${durum})`;
  }

  toggleUpdateStatusSelection(statusId: number): void {
    const index = this.updateStatusSelection.indexOf(statusId);
    if (index > -1) {
      this.updateStatusSelection.splice(index, 1);
    } else {
      this.updateStatusSelection.push(statusId);
    }
  }

  // Applies the first selected status to all selected users
  applyStatusUpdate(): void {
    const selectedIds = this.selection();
    const newStatus = this.updateStatusSelection[0];

    if (selectedIds.size === 0) {
      this.error.set("Lütfen en az bir kullanıcı seçin.");
      this.success.set(null);
      return;
    }
    if (this.updateStatusSelection.length === 0) {
      this.error.set("Lütfen uygulanacak en az bir durum seçin.");
      this.success.set(null);
      return;
    }

    this.kullanicilar.update(users =>
      users.map(user =>
        selectedIds.has(user.id) ? { ...user, durum: newStatus } : user
      )
    );
  }

  saveChanges(): void {
    this.error.set(null);
    this.success.set(null);

    const updates = this.kullanicilar()
      .filter(user => user.durum !== user.originalDurum)
      .map(user => ({ id: user.id, durum: user.durum }));

    if (updates.length === 0) {
      this.error.set("Kaydedilecek bir değişiklik yok.");
      this.success.set(null);
      return;
    }

    this.apiService.updateKullaniciStatus(updates).subscribe({
      next: (res: any) => {
        this.success.set(res?.message || 'Kullanıcı durumları başarıyla kaydedildi.');
        this.error.set(null);
        // Refetch users to confirm changes and get fresh data, preserving the success message
        this.getKullanicilar(true); 
      },
      error: (err) => {
        this.success.set(null);
        this.error.set(`Hata: ${err.error?.message || 'Bilinmeyen sunucu hatası'}`);
        console.error("Error updating user statuses", err);
      }
    });
  }
}
