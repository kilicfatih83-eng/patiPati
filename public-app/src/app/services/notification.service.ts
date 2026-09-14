import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface AppNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
  subCode?: number;
}

// Taken from v2-1-9-yapilacaklar-ek.md
const SUBCODE_MAP: { [pozitifSubCode: number]: number | number[] } = {
  // Senaryo: Oturum süresi dolar, kullanıcı tekrar giriş yapar.
  200101: 100101, // Giriş Başarılı -> "Oturum Süreniz Doldu" hatasını temizler.

  // Senaryo: Bakiye yetmez, kullanıcı bakiye yükler.
  // Bakiye Yüklendi -> Tüm potansiyel "Yetersiz Yayın Hakkı" hatalarını temizler.
  200105: [ 400101, 400102, 400103 ],

  // Senaryo: Kullanıcı bakiye yükledikten sonra spesifik eylemi tekrar denerse,
  // sadece o eyleme ait "Yetersiz Bakiye" hatasını temizle.
  200301: 400101, // İlan Oluşturma Başarılı -> İlan için "Yetersiz Bakiye" hatasını temizler.
  200302: 400102  // Başvuru Başarılı -> Başvuru için "Yetersiz Bakiye" hatasını temizler.
};


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private router = inject(Router);
  notifications = signal<AppNotification[]>([]);
  private maxNotifications = 5; // En fazla 5 bildirim göster

  constructor() {
    // Sayfa değiştiğinde tüm bildirimleri temizle
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart)
    ).subscribe(() => {
      this.notifications.set([]);
    });
  }

  showError(err: { message: string, subCode?: number }): void {
    if (!err.message) return; // Boş mesajları gösterme

    const newNotif: AppNotification = { id: Date.now(), ...err, type: 'error' };

    this.notifications.update(currentNotifs => {
      // Eğer aynı subCode ile zaten bir hata varsa, yenisini ekleme
      if (err.subCode && currentNotifs.some(n => n.subCode === err.subCode && n.type === 'error')) {
        return currentNotifs;
      }
      // Yeni hatayı en başa ekle ve limiti uygula
      return [newNotif, ...currentNotifs].slice(0, this.maxNotifications);
    });
  }

  showSuccess(succ: { message: string, subCode?: number }): void {
    if (!succ.message) return; // Boş mesajları gösterme

    const newNotif: AppNotification = { id: Date.now(), ...succ, type: 'success' };
    const positiveCode = succ.subCode;

    // Eğer bu bir "akıllı" başarı mesajı değilse, sadece göster
    if (!positiveCode || !SUBCODE_MAP[positiveCode]) {
      this.notifications.update(curr => [newNotif, ...curr].slice(0, this.maxNotifications));
      return;
    }

    const codesToClear = SUBCODE_MAP[positiveCode];
    const negativeCodes = Array.isArray(codesToClear) ? codesToClear : [codesToClear];

    this.notifications.update(currentNotifs => {
      // İlgili hata mesajını bul ve onu başarı mesajına dönüştür
      let wasReplaced = false;
      let updatedNotifs = currentNotifs.map(n => {
        if (n.type === 'error' && n.subCode && negativeCodes.includes(n.subCode)) {
          wasReplaced = true;
          return newNotif; // Hata mesajını yeni başarı mesajıyla değiştir
        }
        return n;
      });

      // Eğer bir değiştirme olmadıysa ve hala yer varsa, yeni başarı mesajını ekle
      if (!wasReplaced) {
        updatedNotifs = [newNotif, ...updatedNotifs];
      }

      // Yinelenenleri kaldır (birden fazla hata tek başarıyla temizlendiğinde olabilir)
      const uniqueNotifs = updatedNotifs.filter((n, index, self) =>
        index === self.findIndex((t) => t.id === n.id)
      );

      return uniqueNotifs.slice(0, this.maxNotifications);
    });
  }

  remove(id: number): void {
    this.notifications.update(currentNotifs => currentNotifs.filter(n => n.id !== id));
  }
}
