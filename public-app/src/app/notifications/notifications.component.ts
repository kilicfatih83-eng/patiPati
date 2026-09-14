import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { AppNotification } from '../services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      @for (notif of notificationService.notifications(); track notif.id) {
        <div [class]="'notification-toast ' + notif.type" (click)="remove(notif.id)">
          <span class="message">{{ notif.message }}</span>
          <button class="close-btn">&times;</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .notification-toast {
      min-width: 250px;
      max-width: 400px;
      padding: 15px;
      border-radius: 8px;
      color: #fff;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: opacity 0.3s ease;
    }
    .notification-toast:hover {
      opacity: 0.8;
    }
    .notification-toast.success {
      background-color: #28a745;
    }
    .notification-toast.error {
      background-color: #dc3545;
    }
    .close-btn {
      background: none;
      border: none;
      color: #fff;
      font-size: 1.5rem;
      font-weight: bold;
      margin-left: 15px;
      padding: 0 5px;
      cursor: pointer;
    }
  `]
})
export class NotificationsComponent {
  notificationService = inject(NotificationService);

  remove(id: number) {
    this.notificationService.remove(id);
  }
}
