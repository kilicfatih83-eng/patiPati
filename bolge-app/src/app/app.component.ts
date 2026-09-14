/*
* CLINE UYARISI: BU DOSYA KULLANIMDA DEĞİL GİBİ GÖRÜNÜYOR.
* Projenin ana giriş dosyası (main.ts), bu component yerine `app.ts` dosyasındaki `App` component'ini kullanıyor.
* Bu dosya, karışıklığı önlemek için gelecekte silinebilir veya arşivlenebilir.
*/
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'bolge-app';
}
