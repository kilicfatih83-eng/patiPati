import { Component, Input, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiStateService } from '../../services/ui-state.service';

@Component({
  selector: 'app-info-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-message.component.html',
  styleUrls: ['./info-message.component.css']
})
export class InfoMessageComponent implements OnInit {
  @Input({ required: true }) messageKey!: string;
  @Input() messageText: string = '';

  uiStateService = inject(UiStateService);
  isDismissed = signal<boolean>(false);

  private storageKey!: string;

  ngOnInit(): void {
    this.storageKey = `info_message_dismissed_${this.messageKey}`;
    this.isDismissed.set(JSON.parse(localStorage.getItem(this.storageKey) ?? 'false'));
  }

  dismiss(): void {
    this.isDismissed.set(true);
    localStorage.setItem(this.storageKey, 'true');
  }

  unDismiss(): void {
    this.isDismissed.set(false);
    localStorage.setItem(this.storageKey, 'false');
  }
}
