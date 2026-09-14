import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  private static readonly INFO_MESSAGES_VISIBLE_KEY = 'app_info_messages_visible';

  // Sinyal, başlangıç değerini localStorage'dan veya varsayılan olarak 'true'dan alır.
  showInfoMessages = signal<boolean>(
    JSON.parse(localStorage.getItem(UiStateService.INFO_MESSAGES_VISIBLE_KEY) ?? 'true')
  );

  constructor() {
    // Bu effect, sinyal her değiştiğinde yeni değeri localStorage'a yazar.
    effect(() => {
      localStorage.setItem(UiStateService.INFO_MESSAGES_VISIBLE_KEY, JSON.stringify(this.showInfoMessages()));
    });
  }

  // Global durumu açıp kapatmak için bir metod.
  toggleInfoMessages(): void {
    this.showInfoMessages.update(current => !current);
  }
}
