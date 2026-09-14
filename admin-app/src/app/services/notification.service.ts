import { Injectable, signal } from '@angular/core';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  notification = signal<Notification | null>(null);

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.notification.set({ message, type });
  }

  clear() {
    this.notification.set(null);
  }
}
