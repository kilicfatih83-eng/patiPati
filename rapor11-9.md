# KAPSAMLI KOD & EKOSİSTEM RAPORU — 11.09.2026
### Kaynak: Doğrudan Kod Okuma | 11-9plan.md Baz Alınarak | Kod Yazma Yok

---

## 1. EKOSİSTEM GENEL YAPISI

Üç ayrı Angular uygulaması + tek bir Node.js sunucu + tek SQLite veritabanı:

```
server/server.js  ←→  server/database.js  ←→  server/database.sqlite
     ↕                      ↕
admin-app (Angular)    bolge-app (Angular)    public-app (Angular)
```

Üç ayrı JWT secret: `JWT_SECRET` (admin), `JWT_PUBLIC_SECRET` (public), `JWT_BOLGE_SECRET` (bolge).

---

## 2. SERVER.JS — KRİTİK BULGULAR (DOĞRUDAN KOD OKUNARAK)

### 🔴 KRİTİK: Duplicate (Mükerrer) Fonksiyon Tanımı — JavaScript'te Fonksiyon Ezme

`server.js` içinde şu fonksiyonlar **iki kez** tanımlanmış:

| Fonksiyon | 1. Tanım (satır) | 2. Tanım (satır) | Fark |
|---|---|---|---|
| `handleGetBolgeIlanlar` | ~686 | ~847 | **2. tanım** `params.has()` kullanıyor, 1. tanım `params.get()` double-check yapıyor |
| `handleUpdateIlanDurum` | ~719 | ~879 | **2. tanım** `subCode: 200601` EKSİK — sadece `message` dönüyor |
| `handleGetBolgeIlanDetay` | ~756 | ~916 | Aynı mantık, 2. kez |
| `handleGetBolgeTalipler` | ~768 | ~928 | Aynı mantık, 2. kez |
| `handleUpdateTalipDurum` | ~793 | ~953 | **2. tanım** `subCode: 200602` EKSİK — sadece `message` dönüyor |
| `handleGetBolgeMesajlar` | ~827 | ~987 | Aynı mantık, 2. kez |
| `authenticate` | ~157 | ~1004 | **Farklı davranış:** 1. tanım `user.adm` truthy check, 2. tanım `user.adm !== 1` strict check |
| `authenticatePublic` | ~170 | ~1024 | Benzer ama mesaj metni Türkçe/İngilizce farkı var |
| `authenticateBolge` | ~187 | ~1041 | **2. tanım** `bolgeId` kontrolü EKSİK — güvenlik açığı |
| `handleGetKullanicilar` | ~614 | ~1061 | **1. tanım** durum filtresi YOK (tüm kullanıcıları döner), **2. tanım** `durumParams` filtresi VAR |
| `handleUpdateKullaniciStatus` | ~621 | ~1097 | **Farklı field:** 1. tanım `SET durum`, 2. tanım `SET engelli` — tamamen farklı mantık |
| `handleRegisterKullanici` | ~664 | ~1122 | Farklı kontroller, 2. tanım `async/await` kullanıyor |

> **JavaScript'te `function` ile tanımlanan fonksiyonlar hoisting nedeniyle son tanım geçerli olur.**
> Yani router'da çağrılan fonksiyonlar, 843. satırdan itibaren başlayan BLOK'un içindeki 2. tanımları kullanıyor.

---

### 🔴 KRİTİK: Güvenlik — 2. `authenticateBolge` Tanımı `bolgeId` Kontrolü Yapmıyor

**1. tanım (satır ~187-204):**
```js
if (user.adm) return sendError(...)  // admin girişini engelle
if (!user.bolgeId) return sendError(...)  // bölgesi olmayan hesabı engelle
```

**2. tanım (satır ~1041-1056) — ROUTER BUNU KULLANIYOR:**
```js
// user.adm ve user.bolgeId kontrolü YOK
req.user = user;
next();
```
Bu, bölge rotalarına `bolgeId`'siz hesapların girebileceği anlamına gelir. `req.user.bolgeId` undefined olacağı için SQL sorgular hatalı çalışır.

---

### 🔴 KRİTİK: `handleUpdateKullaniciStatus` — 1. ve 2. Tanım Tamamen Farklı

| | 1. Tanım (~621) | 2. Tanım (~1097) — ROUTER BUNU KULLANIYOR |
|---|---|---|
| SQL Field | `SET durum = ?` | `SET engelli = ?` |
| Payload | `{ id, durum }` | `{ id, engelli }` |
| subCode | `200502` dönüyor | `200502` dönüyor |
| Hata yönetimi | `failures` array | Yok (hata yakalamıyor) |

Frontend `kullanici-list.component.ts` `{ id: user.id, durum: user.durum }` gönderiyor → 2. tanım `update.engelli` alıyor → `undefined` geliyor → DB'ye `NULL` yazılıyor veya beklenmedik davranış.

---

### 🔴 KRİTİK: `handleGetKullanicilar` — 1. Tanım Filtresiz, 2. Tanım Filtreli

Router 2. tanımı kullanıyor. 2. tanım `durumParams` filtresiyle çalışıyor, `ORDER BY id DESC` var. Bu kısım **doğru çalışıyor** (filtre olmadığında WHERE eklemiyor, tüm kullanıcıları dönüyor).

---

### 🟡 UYARI: `handleSmsRequest` Tanımsız

Router'da (satır ~147):
```js
else if (pathname === '/api/sms-handler' && req.method === 'POST') {
  handleSmsRequest(req, res, parsedBody, body);
}
```
`handleSmsRequest` fonksiyonu dosyanın hiçbir yerinde tanımlı değil. Bu endpoint'e istek gelirse `ReferenceError: handleSmsRequest is not defined` hatası alınır ve sunucu çökebilir (try/catch yoksa).

---

### 🟡 UYARI: `handleUpdateIlanDurum` — 2. Tanımda `subCode: 200601` Eksik

1. tanım başarı yanıtında `subCode: 200601` döndürüyor.
2. tanım (router'ın kullandığı) sadece `message` döndürüyor, `subCode` yok.
Frontend `NotificationService.showSuccess()` çağırsa bile `subCode` olmadığı için akıllı temizleme çalışmaz.

Aynı durum `handleUpdateTalipDurum` için de geçerli: 2. tanımda `subCode: 200602` yok.

---

### 🟢 DOĞRU ÇALIŞIYOR: `/api/bolgeler` Rota Sıralaması

Satır 102: `else if (pathname === '/api/bolgeler' && req.method === 'GET')` — Bu, `authenticate` gerektiren admin rotalarından ÖNCE tanımlanmış. Yani admin-app token ile bile bu rotayı sorunsuz çağırabilir. **11-9plan.md'deki "500 hatası" sorunun ÇÖZÜLDÜĞÜ görülüyor.**

---

### 🟡 UYARI: `handlePublicLogin` Gerçek `durum` Kontrolü Eksik

`kullaniciTablo`'da `durum` alanı var ama login sırasında `SELECT`'te `durum` çekilmiyor ve engellendi/askıya alındı kontrolü yapılmıyor. Engelli kullanıcı giriş yapabilir.

---

## 3. DURUM FİLTRELERİ — KONTROL SONUÇLARI

### A. Admin App — Kullanıcı Filtreleri (`/api/kullanicilar`)

**Frontend:** `kullanici-list.component.ts` → `filterSelection` boş `Set` ise `[]` iletiliyor → `getKullanicilar([])` çağrılıyor.

**API Service:** `if (durum && durum.length > 0)` — boş array gelirse params eklenmez, sunucuya filtresiz istek gider.

**Server (2. tanım — aktif):** `durumParams.length > 0` kontrolü var → WHERE eklenmez → tüm kullanıcılar döner.

✅ **DOĞRU ÇALIŞIYOR** — Hiçbir seçim yoksa server tüm kullanıcıları döner.

---

### B. Bölge App — İlan Filtreleri (`/api/bolge/ilanlar`)

**Frontend:** `durumlar` dizisindeki `checked` olanlar map'leniyor → `activeDurumFilters.join(',')` ile `durum=1,2` formatında gönderiliyor.

**API Service (bolge):** `if (filters[key])` — bu `durum` boş string `""` ise `false` sayılır, params'a eklenmez. **Dikkat: boş string falsy.**

**Server (2. tanım — aktif):** `params.has("durum") && params.get("durum")` — `durum` parametresi URL'de yoksa WHERE eklenmez, tüm bölge ilanları döner.

✅ **SONUÇ DOĞRU** — ama uçtan uca akış kritik bir noktaya dayanıyor: Bolge API service'in `if (filters[key])` filtresi, boş string'i düşürüyor. Bu bir **şans eseri** doğru çalışıyor, sağlam bir tasarım değil.

---

### 🔴 C. Bölge App — `totalCount` Sinyal Bağlantısı Kopuk

`ilan-list.component.ts` satır 91: `this.totalCount.set(response.total)` — ama server `handleGetBolgeIlanlar` (2. tanım) `{ ilanlar: rows }` döndürüyor. `total` field'ı server yanıtında **YOK**. `response.total` her zaman `undefined` → `totalCount` signal'i 0 kalır → sayfalama düzgün çalışmaz.

---

## 4. HER TUŞUN GÖREVİ — SERVER-DB-FRONTEND ÜÇGENİ

### ADMIN APP

| Tuş | Frontend | Server | DB | Durum |
|---|---|---|---|---|
| **Kullanıcıları Getir** | `filterSelection` → `getKullanicilar(params)` | `handleGetKullanicilar` (2. tanım) → SELECT + opsiyonel WHERE | `kullaniciTablo` | ✅ Çalışıyor |
| **Değişiklikleri Kaydet** | `durum !== originalDurum` olanları `{ id, durum }` ile POST | `handleUpdateKullaniciStatus` (2. tanım) → `SET engelli = ?` | `kullaniciTablo.engelli` | 🔴 **YANLIŞ FIELD!** `durum` yerine `engelli` yazıyor |
| **Seçilenlere Uygula** | Lokal state güncelle (durum) → kaydet tetikler | ← yukarıdakiyle aynı | ← | 🔴 Aynı sorun |
| **Bölgeleri Getir (yon-list)** | `getBolgeler()` | `handleGetBolgeler` | `bolgeTablo` | ✅ Çalışıyor |

### BÖLGE APP

| Tuş | Frontend | Server | DB | Durum |
|---|---|---|---|---|
| **Filtreyi Uygula / Getir** | `durum` ve `tur` join ile | `handleGetBolgeIlanlar` (2. tanım) | `ilanTablo WHERE bolgeId=?` | ✅ Çalışıyor |
| **Değişiklikleri Kaydet** | Değişen ilanları POST | `handleUpdateIlanDurum` (2. tanım) | `SET durum` WHERE `bolgeId` kontrolüyle | ✅ Çalışıyor ama `subCode` eksik |
| **Seçilenlere Uygula** | Lokal durum güncelle + `kaydet()` | ← | ← | ✅ Çalışıyor |
| **Resimlerini Hazırla** | `new Image()` ile önbellek | İstek yok (client-side) | Yok | ✅ Client-only |
| **Seçili Satırın Sırasını Göster** | `totalCount` sinyali | `response.total` field | | 🔴 `totalCount` her zaman 0, sıra hesabı hatalı |

### PUBLIC APP

| Tuş | Frontend | Server | DB | Durum |
|---|---|---|---|---|
| **Kontrol Et (Header)** | `getMyYayinHakki()` | `/api/me/yayin-hakki` | `kullaniciTablo` | ✅ Çalışıyor |
| **Yardımı Aç/Kapat (Header)** | `toggleInfoMessages()` | İstek yok (localStorage) | Yok | ✅ Çalışıyor |
| **İlan Ver** | `createIlan()` | `handleCreateIlan` → `yayinHakki-1` | `ilanTablo + kullaniciTablo` | ✅ Çalışıyor, `subCode: 200301` döner |
| **Talip Ol** | `talipOl()` | `handleTalipOl` | `talipTablo + kullaniciTablo` | ✅ Çalışıyor, `subCode: 200302` döner |
| **Mesaj Gönder** | `gonderMesaj()` | `handleMesaj` | `talipTablo` | ✅ Çalışıyor, `subCode: 200303` döner |
| **Login** | `login()` | `handlePublicLogin` | `kullaniciTablo` | ⚠️ Engelli kontrolü yok |

---

## 5. FRONTEND — NESNE İNCELEME

### 5.1. `info-message.component.ts` — Import Yolu Bozuk

```ts
import { UiStateService } from '../services/ui-state.service';
```
Bu component `public-app/src/app/components/info-message/` dizininde.
`../services/` yolu `public-app/src/app/components/services/` anlamına gelir — böyle bir klasör yok.
Doğru yol: `../../services/ui-state.service`.

> **Bu bir derleme hatası. Bu component şu anda DERLENMEZ.**

### 5.2. `header.component.ts` — Bozuk Fonksiyon Tanımı

```ts
guncelle(): void {
  this.apiService.getMyYayinHakki().subscribe((res: any) => {
    this.authService.updateYayinHakki(res.yayinHakki);
    toggleInfoHelp(): void {          // ← HATA: fonksiyon içinde fonksiyon tanımı
      this.uiStateService.toggleInfoMessages();
    }
  });
}
```
`toggleInfoHelp()` fonksiyonu `guncelle()`'nin `subscribe` callback'i içine yanlış yerleştirilmiş. Bu TypeScript sözdizimi hatası. **Bu dosya DERLENMEZ.**

### 5.3. Admin App `updateKullaniciStatus` — Yanlış Payload

`api.service.ts` satır 59:
```ts
return this.http.post(`${this.apiUrl}/kullanicilar/update-status`, updates);
```
`updates` = `[{ id, durum }]` — `durum` field'ı var.

Server 2. tanım satır 1108:
```js
db.run("UPDATE kullaniciTablo SET engelli = ? WHERE id = ?", [update.engelli, update.id], ...)
```
`update.engelli` — `undefined`. **Durum asla güncellenmez.**

### 5.4. `bolge-app` API Service — `updateIlanDurum` Payload

```ts
return this.http.post(`${this.apiUrl}/bolge/ilan-durum-guncelle`, updates);
```
Server `handleUpdateIlanDurum` (2. tanım): `const { updates } = body` — yani `body.updates` bekliyor.
Frontend direkt `updates` array'i gönderiyor, `{ updates: [...] }` değil.
Server'daki `const { updates } = body` destructure `undefined` döner.

> **Bölge kaydet işlemi sunucuda "geçersiz istek" hatası verir.**

### 5.5. `UiStateService` — `dismissedWarnings` Sinyali Eksik

`v2-1-9-yapilacaklar.md`'de planlanan:
```ts
private dismissedWarnings = signal(new Set<string>());
isWarningDismissed(id: string): boolean { ... }
dismissWarning(id: string): void { ... }
unDismissWarning(id: string): void { ... }
```

Mevcut `ui-state.service.ts` — sadece `showInfoMessages` signal'i var, `dismissedWarnings` yok.
`InfoMessageComponent` bu metodları çağırmıyor — kendi `isDismissed` signal'ini `localStorage` üzerinden yönetiyor. Bu planlanan tasarımdan farklı ama **kendi içinde tutarlı** çalışır.

---

## 6. DOKÜMAN ↔ KOD UYUM TABLOSU

| Plan / Doküman | Kodda Durumu | Gerçek Sonuç |
|---|---|---|
| `.topWarn` Global Anahtar (`header`) | `header.component.ts` derleme hatası var | 🔴 **Çalışmaz** |
| `.topWarn` Component Entegrasyonu | `info-message.component.ts` import hatası | 🔴 **Çalışmaz** |
| `UiStateService` temel `showInfoMessages` | ✅ Var, localStorage persist edilmiş | ✅ |
| `UiStateService` `dismissedWarnings` metodları | ❌ Kodlanmamış | 🔴 Eksik |
| `NotificationService` (public-app) | ✅ Tam kodlanmış, `SUBCODE_MAP` dahil | ✅ |
| `NotificationsComponent` | ✅ Var, `app.component.html`'e eklenmiş | ✅ |
| `NotificationService` (admin/bolge) | Stub (boş, subCode/SUBCODE_MAP yok) | 🟡 Henüz entegre değil |
| Başarı subCode'ları (server) | `handleUpdateIlanDurum` ve `handleUpdateTalipDurum` 2. tanımda eksik | 🔴 |
| SMS Handler | `handleSmsRequest` tanımsız | 🔴 Çalışmaz |
| `/api/bolgeler` sıralama düzeltmesi | ✅ Çözülmüş | ✅ |
| Admin `kullanicilar` filtresi | ✅ Çözülmüş (2. tanım) | ✅ |
| Bölge `totalCount` / sayfalama | `response.total` server'dan gelmiyor | 🔴 Bozuk |

---

## 7. YAPILMAYANLAR / KRİTİK EKSİKLER (ÖNCELIK SIRASIYLA)

### 🔴 P0 — Derleme Hataları (Uygulama Çalışmıyor)

1. **`header.component.ts`:** `toggleInfoHelp()` `guncelle()` subscribe bloğu içinde yanlış yerde. Düzeltilmesi gerekiyor.
2. **`info-message.component.ts`:** Import yolu `'../services/ui-state.service'` yanlış, `'../../services/ui-state.service'` olmalı.

### 🔴 P1 — İşlevsel Hatalar (Şu An Yanlış Çalışıyor)

3. **`handleUpdateKullaniciStatus` (server.js 2. tanım):** `SET engelli` yerine `SET durum` olmalı. Admin kullanıcı durum güncellemesi çalışmıyor.
4. **`updateIlanDurum` API (bolge-app):** Frontend `updates` array direkt gönderiyor, server `{ updates }` bekliyor. Bölge ilan kaydetme çalışmıyor.
5. **`authenticateBolge` (2. tanım):** `bolgeId` kontrolü yok — güvenlik açığı.
6. **`handleSmsRequest`:** Tanımsız — server çökme riski.

### 🟡 P2 — Eksik/Tamamlanmamış

7. **`totalCount` / Sayfalama:** Server `total` field dönmüyor, `bolge-app` sayfalama devre dışı.
8. **`handleUpdateIlanDurum` ve `handleUpdateTalipDurum` (2. tanımlar):** `subCode` eksik, `NotificationService` akıllı temizleme yapamıyor.
9. **`UiStateService.dismissedWarnings`:** Planlandı ama kodlanmadı. Şu an `InfoMessageComponent` kendi localStorage yönetimini yapıyor — tutarlı ama plan ile farklı.
10. **`handlePublicLogin`:** Kullanıcı `durum` (engelli) kontrolü yok.

### 🟡 P3 — Temizlik / Teknik Borç

11. **server.js — Duplicate blok (satır 843-1154):** 311 satır tekrar eden kod. Router'ın hangi tanımı kullandığını belirsizleştiriyor, hata riskini artırıyor. Temizlenmeli.

---

## 8. YAPILABİLECEKLER — HAZIR OLANLAR

| Yapılabilir | Nerede | Ne Gerekiyor |
|---|---|---|
| Header derleme hatası | `header.component.ts` | `toggleInfoHelp()` dışarı çıkarılacak |
| Info-message import | `info-message.component.ts` | `../../` prefix |
| Server `SET durum` düzeltmesi | `server.js` 2. `handleUpdateKullaniciStatus` | field değişikliği |
| Bolge API payload | `bolge-app/api.service.ts` | `{ updates }` sarmalı |
| `authenticateBolge` güvenlik | `server.js` 2. tanım | `bolgeId` kontrolü eklenmesi |
| `handleSmsRequest` stub | `server.js` | En azından 501 yanıtı |
| `total` field ekleme | `server.js handleGetBolgeIlanlar` | COUNT sorgusu |
| Duplicate blok temizliği | `server.js` | 843-1154 satır silinecek, 1. tanımlar güçlendirilecek |

---

## 9. GENEL DEĞERLENDİRME

**Mimari karar doğru:** Server-DB-Frontend üçgeni temiz bir ayrımla tasarlanmış. subCode sistemi iyi planlanmış, `NotificationService` (public-app) bu planı büyük ölçüde hayata geçirmiş.

**En büyük sorun:** Son yapılan düzeltme (11-9 oturumu), mevcut fonksiyonları silmek yerine dosyanın sonuna yeni blok ekleyerek yazmış. Bu hem semantik çakışma (farklı davranışlar) hem güvenlik açığı hem de yanlış DB field kullanımı yarattı. JavaScript'in `function` hoisting kuralı nedeniyle hangi tanımın aktif olduğu karıştırıcı, ama pratikte **sonraki tanım geçerli** — bu yüzden bazı düzeltmeler aslında eski hatanın üzerine yeni hata eklemiş.

**Kod YOK, hazır ve bekliyorum.**
