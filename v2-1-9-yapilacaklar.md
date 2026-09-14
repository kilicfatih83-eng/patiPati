# Eylem Planı ve Çalışma Prensipleri

## BÖLÜM 1: `.topWarn` Bilgilendirme Sisteminin Çalışma Mantığı

Bu bölüm, koddan önce, yeni `.topWarn` sisteminin davranışını ve kullanıcı deneyimini adım adım açıklar.

### **Temel Kavramlar**

1.  **Global Anahtar (Header Butonu):** Sitenin en üstündeki menüde ("Header"da) bir "Yardımcı Bilgileri Aç/Kapat" butonu bulunur. Bu buton, tüm `.topWarn` sisteminin ana şalteridir.
    *   **Eğer bu buton "Kapalı" konumdaysa,** hiçbir sayfada, ne `.topWarn` bilgi kutusunun kendisi, ne de onun yerine geçebilecek küçük yardım ikonu (?) görünür. Her şey tamamen gizlenir.
    *   **Eğer bu buton "Açık" konumdaysa,** sistem, her bir component'in kendi yerel durumunu kontrol etmeye başlar.

2.  **Lokal Durum (Her Component'in Kendi Hafızası):** Her component (Login sayfası, İlan Detay sayfası vb.), kendi `.topWarn` bilgi kutusunun kullanıcı tarafından kapatılıp kapatılmadığını hatırlar. Bu hafıza, siz başka sayfalara gidip geri dönseniz bile silinmez.

3.  **İki Görünüm Şekli:** Global anahtar "Açık" olduğunda, bir `.topWarn` kutusu iki şekilde görünebilir:
    *   **Tam Görünüm:** Sayfanın üst kısmını kaplayan, içinde bilgilendirme metni ve sağında bir "X" (kapatma) butonu bulunan standart kutu.
    *   **İkon Görünümü:** Sayfada çok az yer kaplayan, üzerinde "?" işareti bulunan, tıklanabilir küçük bir yardım ikonu.

### **Kullanıcı Etkileşim Senaryoları**

**Senaryo 1: İlk Ziyaret**
1.  Kullanıcı siteyi ilk kez açar.
2.  Header'daki **Global Anahtar** varsayılan olarak **"Açık"** konumdadır.
3.  Kullanıcı Login sayfasına girer.
4.  Login sayfasının `.topWarn` kutusu, **Tam Görünüm** şeklinde ekranda belirir. İçinde "Lütfen giriş yapınız..." yazar ve sağında "X" butonu vardır.

**Senaryo 2: Kullanıcı "X" Butonuna Tıklar**
1.  Kullanıcı, Login sayfasındaki `.topWarn` kutusunun sağındaki **"X" butonuna tıklar.**
2.  Anında, o sayfadaki **Tam Görünüm** kaybolur.
3.  Onun yerine, sayfanın köşesinde **İkon Görünümü** (küçük "?" ikonu) belirir.
4.  Sistem, "Login sayfasının uyarısı kullanıcı tarafından kapatıldı" bilgisini hafızasına alır.

**Senaryo 3: Sayfalar Arası Gezinti**
1.  Kullanıcı, Login sayfasındaki uyarısını **İkon Görünümü**'ne çevirmiştir.
2.  Kullanıcı, İlan Detay sayfasına gider. Bu sayfanın uyarısı daha önce hiç kapatılmadığı için, İlan Detay sayfasının `.topWarn`'u **Tam Görünüm** şeklinde görünür.
3.  Kullanıcı tekrar Login sayfasına geri döner.
4.  Sistem, "Login sayfasının uyarısı kapatılmıştı" bilgisini hafızasından okur ve Login sayfasındaki uyarıyı yine **İkon Görünümü**'nde gösterir. Tam metin kutusu geri gelmez.

**Senaryo 4: Kullanıcı Yardım İkonuna "?" Tıklar**
1.  Kullanıcı, Login sayfasındadır ve uyarı **İkon Görünümü**'ndedir.
2.  Kullanıcı bu **"?" ikonuna tıklar.**
3.  Anında, **İkon Görünümü** kaybolur ve yerine tekrar **Tam Görünüm** (metin kutusu ve "X" butonu) gelir.
4.  Sistem, hafızasındaki "Login sayfasının uyarısı kapatıldı" bilgisini siler.

**Senaryo 5: Kullanıcı Global Anahtarı Kapatır**
1.  Login sayfasında uyarı **Tam Görünüm**'de, İlan Detay sayfasında ise **İkon Görünümü**'ndedir.
2.  Kullanıcı, Header'daki **"Yardımcı Bilgileri Kapat" butonuna tıklar.**
3.  Anında, hem Login sayfasındaki **Tam Görünüm**, hem de İlan Detay sayfasındaki **İkon Görünümü** kaybolur. Ekranda `.topWarn` ile ilgili hiçbir şey kalmaz.
4.  Sistem, hangi uyarının lokal olarak kapatıldığını hafızasında tutmaya devam eder, sadece hiçbirini göstermez.

**Senaryo 6: Kullanıcı Global Anahtarı Tekrar Açar**
1.  Kullanıcı, bir önceki senaryodan sonra Header'daki **"Yardımcı Bilgileri Aç" butonuna tıklar.**
2.  Sistem, hafızasını kontrol eder:
    *   Login sayfasının uyarısı "kapatılmamıştı", bu yüzden **Tam Görünüm** geri gelir.
    *   İlan Detay sayfasının uyarısı "kapatılmıştı", bu yüzden **İkon Görünümü** geri gelir.

Bu sistem, kullanıcının tercihlerine saygı duyan, hem genel hem de özel kontrol sunan, esnek bir yapı sağlar.

---

# Plan: `.topWarn` Bilgilendirme Sisteminin Yeniden Yapılandırılması

## BÖLÜM 1: `.topWarn` Sisteminin Çalışma Mantığı (Kodsuz Açıklama)

1.  **Global Anahtar (Header Butonu):** Menüdeki "Yardımcı Bilgileri Aç/Kapat" butonu, tüm sistemin ana şalteridir. Kapalıysa, hiçbir sayfada ne uyarı ne de ikon görünür.

2.  **Lokal Hafıza (Component Başına):** Her component, kendi bilgi kutusunun kullanıcı tarafından "X" ile kapatılıp kapatılmadığını hatırlar. Bu hafıza, sayfa gezintileri arasında silinmez.

3.  **İki Görünüm:** Global anahtar açıksa, uyarı ya tam metin kutusu olarak ya da küçük bir "?" ikonu olarak görünür.

### Kullanıcı Senaryoları:

- **İlk Ziyaret:** Global anahtar açıktır, tüm uyarılar tam metin olarak görünür.
- **"X"e Basma:** O anki uyarı, tam metinden "?" ikonuna dönüşür. Sistem bu durumu o component için hafızaya alır.
- **Sayfa Değiştirme:** Kullanıcı geri döndüğünde, daha önce kapattığı uyarıyı yine "?" ikonu olarak, diğerlerini ise tam metin olarak görür.
- **"?"ye Basma:** İkon, tekrar tam metin uyarısına dönüşür. Hafızadaki "kapatıldı" bilgisi silinir.
- **Global Kapatma:** Header'daki buton, hem tam metin kutularını hem de "?" ikonlarını gizler.
- **Global Açma:** Header'daki buton, her uyarının hafızadaki son durumuna (tam metin veya ikon) geri dönmesini sağlar.

---

## BÖLÜM 2: Teknik Uygulama Adımları

### Adım 1: `UiStateService`'in Oluşturulması

- **Dosya:** `public-app/src/app/services/ui-state.service.ts`
- **Kod:**
  ```typescript
  import { Injectable, signal } from '@angular/core';

  @Injectable({ providedIn: 'root' })
  export class UiStateService {
    public showInfoMessages = signal(true);
    private dismissedWarnings = signal(new Set<string>());

    toggleInfoMessages(): void { this.showInfoMessages.update(v => !v); }
    isWarningDismissed(id: string): boolean { return this.dismissedWarnings().has(id); }
    dismissWarning(id: string): void { this.dismissedWarnings.update(s => { s.add(id); return new Set(s); }); }
    unDismissWarning(id: string): void { this.dismissedWarnings.update(s => { s.delete(id); return new Set(s); }); }
  }
  ```

### Adım 2: Component'lerde Kullanım Şablonu

- **TypeScript (`login.component.ts` vb.):**
  ```typescript
  public uiStateService = inject(UiStateService);
  private readonly componentId = 'login-warn'; // Her component için benzersiz!
  isDismissed = computed(() => this.uiStateService.isWarningDismissed(this.componentId));
  dismiss(): void { this.uiStateService.dismissWarning(this.componentId); }
  unDismiss(): void { this.uiStateService.unDismissWarning(this.componentId); }
  ```

- **HTML (`login.component.html` vb.):**
  ```html
  @if (uiStateService.showInfoMessages()) {
    @if (!isDismissed()) {
      <div class="topWarn">
        <span>...Bilgi Metni...</span>
        <button class="close-btn" (click)="dismiss()">X</button>
      </div>
    } @else {
      <div class="mini-warn-icon" (click)="unDismiss()" title="Yardım metnini tekrar göster">
        <span>?</span>
      </div>
    }
  }
  ```
# Plan: Diğer Geliştirmeler ve Hata Düzeltmeleri

## BÖLÜM 1: Akıllı, Sayfaya Bağımlı `NotificationService`

**Amaç:** API'den dönen dinamik başarı ve hata mesajlarını yönetecek merkezi bir sistem kurmak.

### Adım 1: `NotificationService`'in Oluşturulması

- **Dosya:** `public-app/src/app/services/notification.service.ts`
- **Kod:**
  ```typescript
  import { Injectable, signal, inject } from '@angular/core';
  import { Router, NavigationStart } from '@angular/router';
  import { filter } from 'rxjs/operators';

  export interface AppNotification { id: number; message: string; type: 'success' | 'error'; subCode?: number; }
  const SUBCODE_MAP: { [pos: number]: number } = {};

  @Injectable({ providedIn: 'root' })
  export class NotificationService {
    private router = inject(Router);
    notifications = signal<AppNotification[]>([]);

    constructor() {
      this.router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe(() => this.notifications.set([]));
    }

    showError(err: { message: string, subCode?: number }): void {
      const newNotif: AppNotification = { id: Date.now(), ...err, type: 'error' };
      this.notifications.update(curr => [newNotif, ...curr].slice(0, 3));
    }

    showSuccess(succ: { message: string, subCode?: number }): void {
      const posCode = succ.subCode;
      if (!posCode) return;
      const negCode = SUBCODE_MAP[posCode];
      if (!negCode) return;

      this.notifications.update(curr => {
        const index = curr.findIndex(n => n.subCode === negCode && n.type === 'error');
        if (index !== -1) {
          const newNotif: AppNotification = { id: Date.now(), ...succ, type: 'success' };
          curr[index] = newNotif;
          return [...curr];
        }
        return curr;
      });
    }

    remove(id: number): void { this.notifications.update(curr => curr.filter(n => n.id !== id)); }
  }
  ```

### Adım 2: `NotificationsComponent` ve Entegrasyon

- Bir `app-notifications` component'i oluşturulacak ve `app.component.html` içine sadece bir kez eklenecektir.

---

## BÖLÜM 2: Mevcut Hataların Çözülmesi

### Hata 1: Bölgeler'in Çekilememesi

- **Eylem:** `server.js` içine `/api/bolgeler` rotası eklenecektir.
- **Kod (`server.js`):**
  ```javascript
  else if (pathname === '/api/bolgeler' && req.method === 'GET') {
    handleGetBolgeler(req, res);
  }
  ```

### Hata 2: "İlan Yükleniyor..." Ekranında Takılı Kalma

- **Eylem:** `ilan-detay.component.ts`, `isLoading` sinyali ve yeni `NotificationService`'i kullanacak şekilde refactor edilecektir.
- **Kod (Örnek `ilan-detay.component.ts`):**
  ```typescript
  isLoading = signal(true);

  ngOnInit(): void {
    this.isLoading.set(true);
    apiCall.subscribe({
      next: (data) => {
        this.ilan.set(data);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.notificationService.showError(err.error);
        this.isLoading.set(false);
      }
    });
  }
  ```
