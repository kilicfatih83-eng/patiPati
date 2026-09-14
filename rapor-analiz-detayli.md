# EKOSİSTEM, .TOPWARN, NOTIFICATIONSERVICE, ADM YETKİLERİ VE İLAN DETAY KÖK NEDEN RAPORU
**Tarih:** 11.09.2026  
**Referans Belgeler:** `ekosistemv2.txt`, `v2-1-9-yapilacaklar.md`, `v2-1-9-yapilacaklar-ek.md`, `v2-30-08-yapilacaklar.md`  
**Durum:** Yalnızca Kod ve Belge Taraması Yapıldı — KOD DEĞİŞİKLİĞİ YAPILMADI, BEKLEMEDE.

---

## 1. ADM BÖLGELERİ GETİR ÇALIŞMIYOR (500 INTERNAL SERVER ERROR)

### Tespit ve Kök Neden
`admin-app` içindeki `yon-list.component.ts:32` üzerinde "Bölgeleri Getir" butonuna tıklandığında `GET http://localhost:3001/api/bolgeler` isteği 500 hatası almaktadır.

- **Kod Kanıtı (`server/server.js` Satır 32-40):**
  ```javascript
  function handleGetBolgeler(req, res) {
    db.all("SELECT * FROM bolgeTablo ORDER BY ad", [], (err, rows) => {
      if (err) {
        return sendError(res, 500, 5000, 500016, "Bölgeler getirilirken bir veritabanı hatası oluştu.");
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    });
  }
  ```
- **Veritabanı Şeması Kanıtı (`server/database.js` Satır 86-90):**
  ```sql
  CREATE TABLE IF NOT EXISTS bolgeTablo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isim TEXT NOT NULL UNIQUE
  );
  ```
- **Sonuç:** `bolgeTablo` tablosunda sütun adı `isim`'dir, `ad` diye bir sütun yoktur! SQLite `no such column: ad` hatası vermekte ve `sendError` ile HTTP 500 dönmektedir.
- **Frontend Durumu (`admin-app/src/app/yon-list/yon-list.component.html` Satır 16):**
  Frontend zaten `{{ bolge.id }} - {{ bolge.isim }}` şeklinde `isim` beklemektedir.
- **Çözüm:** `server.js` içinde `ORDER BY ad` ifadesi `ORDER BY isim` olarak güncellenecektir.

---

## 2. ADM YETKİ KURALLARI (SERVER-SIDE KONTROL & SUBCODE PLANI)

### Kullanıcının Belirttiği Değişmez İş Kuralları
1. Frontend satırlarında (`yon-list.component.html`) `adm` ve `engelli` inputları KESİNLİKLE kilitlenmeyecek/gizlenmeyecektir; arayüz serbest bırakılacaktır (Single Responsibility & Sunucu Odaklı Yetkilendirme).
2. Bir admin kendinden başka bir admini DEĞİŞTİREMEZ.
3. Bir admin, admin olmayan kullanıcıları güncelleyebilir ama onları ASLA ADMIN YAPAMAZ (`adm: 1` yapamaz).
4. `adm` özelliği doğuştandır; API üzerinden DEĞİŞTİRİLEMEZ, SİLİNEMEZ, ENGELLENEMEZ. Sadece doğrudan veritabanından verilir.
5. Bir admin yalnızca kendi diğer özelliklerini (şifre, telefon, mail vb.) değiştirebilir. Kendi `adm` ve `engelli` alanını dahi API'den değiştiremez.
6. Sunucu bir kural ihlali yakaladığında, kullanıcıya açıkça:
   *"... Adm kullanıcı değiştirmeye çalıştıysanız düzeltin."* mesajını ve spesifik `subCode`'unu dönmelidir.

### Mevcut Kod Durumu (`server/server.js` - `handleSaveChanges`)
- **Silme (`deletes`):** Satır 232'de `loggedInUser.id !== id` kontrolü var. Giriş yapan admin kendi kendini silebiliyor! Admin kaydı API'den ASLA silinemez.
- **Güncelleme (`updates`):** Satır 247-287 arasında HİÇBİR adm kontrolü yoktur! Başka bir admin güncellenebilmekte, admin olmayan biri `adm: 1` yapılabilmekte, admin kullanıcılar `engelli: 1` yapılabilmektedir.
- **Ekleme (`inserts`):** Satır 289-312 arasında `insert.adm` değeri serbestçe kabul edilmektedir. Yeni eklenen hiç kimse adm yapılamaz.

### Yeni SubCode ve Hata Yönetimi Planı
| Eylem / İhlal | HTTP Kodu | ErrorCode | Yeni SubCode | Dönecek Mesaj |
| :--- | :--- | :--- | :--- | :--- |
| Başka bir admini güncellemeye çalışma | 403 | 1202 | `120202` | "Bir admin başka bir adminin bilgilerini değiştiremez. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin." |
| Bir kullanıcıyı admin yapmaya veya adminliği kaldırmaya çalışma | 403 | 1202 | `120203` | "Admin yetkisi doğuştandır, değiştirilemez veya sonradan verilemez. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin." |
| Bir admini engellemeye çalışma (`engelli=1`) | 403 | 1202 | `120204` | "Admin kullanıcılar engellenemez. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin." |
| Bir admini silmeye çalışma | 400 | 1202 | `120205` | "Admin kullanıcılar silinemez. Adm kullanıcı silmeye çalıştıysanız düzeltin." |

---

## 3. BİLGİLENDİRME, BİLDİRİM VE HATA YÖNETİM SİSTEMLERİNİN KESİN AYRIMI

Yazılarda geçen ve birbirine karıştırılmaması gereken 4 bağımsız mekanizma:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. .topWarn REHBER/YARDIM SİSTEMİ (UiStateService + InfoMessageComponent)                    │
│    - Sayfa rehberliği sunar (statik içerik).                                                │
│    - Header "Yardımı Kapat/Aç" butonu ile global açılıp kapanır.                            │
│    - Sağdaki 'X' ile kapanır, '?' ikonuna dönüşür (sayfa bazlı localStorage'da hatırlanır).  │
│    - API işlemleriyle ve dinamik başarı/hata dönüşümleriyle HİÇBİR İLGİSİ YOKTUR.           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. AKILLI BİLDİRİM SİSTEMİ (NotificationService + SUBCODE_MAP)                               │
│    - API işlemlerinin DINAMIK sonuçlarını (başarı/hata) ekran bildiriminde gösterir.        │
│    - EN ÖNEMLİ ÖZELLİK: OLUMLU MESAJIN OLUMSUZUN YERİNİ ALMASI (SUBCODE_MAP).               │
│      Örn: "Yetersiz Bakiye" (400101) varken "Bakiye Yüklendi" (200105) gelirse, o hata      │
│      kaldırılır ve YERİNE YEŞİL BAŞARI BİLDİRİMİ GEÇER!                                     │
│    - Sayfa geçişinde (NavigationStart) temizlenir.                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. LOKAL COMPONENT HATALARI (error / bilgiMesaji Sinyalleri)                                │
│    - Single Responsibility gereği component'in kendi formunun içinde gösterilen yerel hata.  │
│    - Global bildirim çubuğunu veya topWarn'ı etkilemez.                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. SUNUCU SUBCODE MİMARİSİ (server.js)                                                      │
│    - Her duruma benzersiz subCode üretir (200xxx başarı, 400xxx/120xxx hata).               │
│    - NotificationService'in olumlu/olumsuz eşleşmesini yapabilmesinin altyapısıdır.        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. .TOPWARN SİSTEMİNİN TÜM SEKME VE SAYFALARDAKİ UYUM TABLOSU

| Sayfa / Sekme | Dosya | Mevcut Kod Durumu | Uyum Durumu & Eksik |
| :--- | :--- | :--- | :--- |
| **Login** | `login.component.html` | `<app-info-message messageKey="loginPage" [messageText]="loginInfoMessage">` | ✅ **TAM UYUMLU**: Tek düzgün çalışan sayfa burası. |
| **Vitrin** | `vitrin.component.html` | `<div class="topWarn">Sistemde yayınlanan ve onaylanmış tüm ilanları bu sayfada görebilirsiniz...</div>` | 🔴 **UYUMSUZ**: Statik HTML kutusu kalmış. Header "Yardımı Kapat" butonundan etkilenmiyor, X butonu yok, ? ikonu yok! |
| **İlan Ver** | `ilan-form.component.html` | `<div class="topWarn">Yeni bir ilan oluşturma formundasınız...</div>` | 🔴 **UYUMSUZ**: Statik HTML kutusu kalmış. |
| **İlan Detayı** | `ilan-detay.component.html` | `<div class="topWarn">İlan detaylarını görüntülüyorsunuz...</div>` | 🔴 **UYUMSUZ**: Statik HTML kutusu kalmış. |
| **Başvurularım**| `my-applications.component.html`| `<div class="topWarn">Diğer kullanıcılara ait ilanlara yaptığınız başvuruları...</div>` | 🔴 **UYUMSUZ**: Statik HTML kutusu kalmış. |
| **İlanlarıma Talipler**| `my-ad-applicants.component.html`| `<div class="topWarn">Size ait ilanlara yapılan başvuruları burada...</div>` | 🔴 **UYUMSUZ**: Statik HTML kutusu kalmış. |
| **İlanlarım** | `my-ads.component.ts` | Yok | 🔴 **EKSİK**: Hiçbir .topWarn eklenmemiş. |
| **Talip Ol** | `talip-form.component.html` | Yok | 🔴 **EKSİK**: Hiçbir .topWarn eklenmemiş. |

---

## 5. AKILLI BİLDİRİM SİSTEMİ (SUBCODE_MAP) VE EKSİKLERİ

- **`SUBCODE_MAP` Tablosu (`notification.service.ts`):**
  - `200101` (Giriş Başarılı) -> `100101` (Oturum Süresi Doldu) hatasını temizler / yerini alır.
  - `200105` (Bakiye Yüklendi) -> `[400101, 400102, 400103]` (Yetersiz Bakiye) hatalarını temizler / yerini alır.
  - `200301` (İlan Oluşturuldu) -> `400101` (İlan Yetersiz Bakiye) hatasını temizler / yerini alır.
  - `200302` (Başvuru Alındı) -> `400102` (Başvuru Yetersiz Bakiye) hatasını temizler / yerini alır.
- **Koddaki Kritik Kopukluk:**
  `public-app/src/app/services/notification.service.ts` servisi ve `notifications.component.ts` yazılmış olsa da, **uygulamadaki hiçbir component (`login`, `vitrin`, `ilan-form`, `talip-form`, `my-ads`) API isteklerinin ardından `notificationService.showSuccess()` veya `notificationService.showError()` ÇAĞIRMAMAKTADIR!** 
  Sistem yazılmış ama component'lere bağlanmadığı için şu anda atıl durumdadır.

---

## 6. ÖNONAYLI İLAN, "ENDPOINT NOT FOUND" (4004/404001) VE "KENDİ İLANINIZA CEVAP YAZAMAZSINIZ" KÖK NEDEN ZİNCİRİ

### Zincir 1: Önonaylı İlanın Açılamaması ve "Yükleniyor..." Ekranında Takılı Kalma
1. Kullanıcı "İlanlarım" sayfasından kendi önonaylı (`durum = 2`) ilanına tıklar:
   `router.navigate(["/ilan", ad.id], { state: { ilanData: ad, isOwnerView: true } })`
2. `ilan-detay.component.ts` içinde `ngOnInit` çalışır:
   `const navigation = this.router.getCurrentNavigation();`
   `const isOwnerView = navigation?.extras?.state?.["isOwnerView"] || false;`
3. **Kritik Hata:** Angular'da navigasyon tamamlandıktan sonra `getCurrentNavigation()` **HER ZAMAN `null` döner!** (Bunun yerine `history.state` kullanılmalıdır).
4. `isOwnerView` `false` kaldığı için kod `else` bloğuna düşerek genel vitrin endpoint'ini çağırır:
   `apiService.getIlanDetayFull(id)`
5. Sunucudaki `handleIlanDetayFull` fonksiyonu ise:
   `SELECT * FROM ilanTablo WHERE id = ? AND durum = 1`
   İlanın durumu `2` (önonaylı) olduğu için sunucu ilanı bulamaz ve **404 4003 400303 ("İlan bulunamadı veya henüz onaylanmamış")** döner.
6. Component'teki switch-case `case 400303` olduğunda sayfayı `/ilan-bulunamadi` rotasına atar veya `this.ilan()` yüklenemediği için HTML'deki `@else { <p>İlan yükleniyor...</p> }` bloğunda takılı kalır!
7. **Oysa Olması Gereken:** `history.state` okunarak `isOwnerView: true` ve `durum !== 1` olduğunda `apiService.getMyAdDetayKisitli(id)` çağrılmalıdır. Sunucuda bu rota (`GET /api/my-ad-detay-kisitli/:id`) zaten vardır ve kullanıcının önonaylı ilanının kısıtlı verilerini başarıyla döndürür!

### Zincir 2: "Endpoint not found." (`errorCode: 4004, subCode: 404001`) Hatası
1. İlan detayında veya başka bir yerde "Talip Ol" butonuna tıklandığında `/ilan/:id/talip-ol` sayfasına gidilir.
2. `talip-form.component.ts` satır 31'de `ngOnInit` içinde:
   `this.apiService.getIlanById(this.ilanId).subscribe(...)` çağrılır.
3. `api.service.ts` satır 25'te `getIlanById`:
   `GET http://localhost:3001/api/ilanlar/:id` çağrısı yapar.
4. **Kritik Hata:** `server/server.js` dosyasında **`GET /api/ilanlar/:id` diye bir rota TANIMLANMAMIŞTIR!**
5. Sunucu isteği hiçbir rotaya uyduramadığı için router'ın en altındaki fallback bloğu devreye girer:
   `{"message":"Endpoint not found.","errorCode":4004,"subCode":404001}`
6. `talip-form` ekranında kocaman **"Endpoint not found."** yazar!

### Zincir 3: "Kendi İlanınıza Cevap Yazamazsınız / Başvuramazsınız" Durumu
- Sunucu iş mantığında `handleTalipOl` içinde:
  `if (ilan.kullaniciId === talipId) return sendError(res, 400, 4002, 400201, "Kendi ilanınıza başvuramazsınız.");` kuralı mevcuttur.
- Ancak kullanıcı kendi ilanına talip formunu açtığında, daha başvuru yapamadan sayfa yüklenirken Zincir 2 (sunucuda `GET /api/ilanlar/:id` olmaması) nedeniyle **"Endpoint not found." (404001)** patladığı için bu iş kuralı işletilememektedir.
- Ayrıca ilan detay sayfasında kullanıcı kendi ilanını görüntülüyorsa "Talip Ol" butonu yerine "Kendi ilanınıza başvuru yapamazsınız" mesajı gösterilmeli veya buton uygun şekilde kısıtlanmalıdır.

