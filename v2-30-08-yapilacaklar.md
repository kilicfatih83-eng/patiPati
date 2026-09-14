bu dosya tamamlanmıştır.. dikkat tamamlanmıştır

# Proje Düzeltme ve Geliştirme Planı (v2 - 30.08)

Bu doküman, `admin-app` kullanıcı yönetimi panelindeki kritik hataları ve eksik özellikleri tarif eder ve bunların düzeltilmesi için gereken adımları listeler.

---

## BÖLÜM 1: HATALAR ve MEVCUT DURUM ANALİZİ

İki ana işlev olan **Filtreleme** ve **Güncelleme** tamamen birbirine karıştırılmış ve hatalı implemente edilmiştir.

### Hata 1: Filtreleme Özelliği Tamamen Eksik

"Kullanıcıları Getir" butonunun, seçilen durumlara göre listeyi süzmesi gerekirken, bu mekanizma hiçbir katmanda mevcut değildir.

*   **Backend (`server/server.js`):** `handleGetKullanicilar` fonksiyonu, `GET` isteğiyle gönderilebilecek `?durum=...` gibi URL parametrelerini okuyup işleyecek bir mantığa sahip değildir. SQL sorgusu her zaman **TÜM** kullanıcıları getirmektedir.
*   **Frontend (`admin-app/.../kullanici-list.component.ts`):** `getKullanicilar` metodu, hangi durumlara göre filtreleme yapılacağını belirten bir parametre almamakta ve bunu `api.service`'e iletmemektedir.
*   **API Servisi (`admin-app/.../api.service.ts`):** `getKullanicilar` metodu, sunucuya istek atarken filtre parametrelerini URL'e eklememektedir.

**Sonuç:** Filtreleme özelliği **SIFIRDAN** yazılmalıdır.

### Hata 2: Güncelleme Arayüzü ve Mantığı Yanlış

"Seçilenlere uygula" bölümü, kullanıcının isteğiyle uyumlu değildir.

*   **Arayüz (`.html`):** Bölüm, çoklu seçime izin veren checkbox'lar yerine, sadece tek bir durum seçilebilen **radyo butonları** ile hatalı bir şekilde kurulmuştur.
*   **Mantık (`.ts`):** "Uygula" butonunun arkasındaki mantık, seçilen durumlar dizisinin **ilk elemanını** alıp uygulama kuralına göre değil, tek bir radyo butonu seçimine göre çalışmaktadır.

**Sonuç:** Güncelleme bölümünün hem HTML'i hem de TypeScript mantığı, kullanıcının "çoklu durum seç, ilkini uygula" kuralına göre yeniden düzenlenmelidir.

---

## BÖLÜM 2: YAPILACAK DEĞİŞİKLİKLER

### Görev 1: Filtreleme Mekanizmasını İnşa Etmek (`GET`)

1.  **Dosya: `admin-app/src/app/kullanici-list/kullanici-list.component.html`**
    *   **Eylem:** "Kullanıcıları Getir" butonunun yakınına, 0'dan 8'e kadar tüm durumları listeleyen yeni bir **checkbox grubu** eklenecek. Bu grup, **filtreleme** için kullanılacak.

2.  **Dosya: `admin-app/src/app/kullanici-list/kullanici-list.component.ts`**
    *   **Eylem:** Seçilen filtre durumlarının ID'lerini tutmak için `filterSelection = new Set<number>()` gibi yeni bir state (durum) değişkeni oluşturulacak.
    *   **Eylem:** `getKullanicilar` metodu, `filterSelection` set'inin içeriğini `apiService`'e parametre olarak gönderecek şekilde güncellenecek.

3.  **Dosya: `admin-app/src/app/services/api.service.ts`**
    *   **Eylem:** `getKullanicilar` metodu, bir durum ID'leri dizisi (`number[]`) kabul edecek şekilde değiştirilecek.
    *   **Eylem:** Bu metod, aldığı diziye göre `HttpParams` oluşturarak `GET` isteğinin sonuna `?durum=0&durum=2` gibi parametreleri ekleyecek.

4.  **Dosya: `server/server.js`**
    *   **Eylem:** `handleGetKullanicilar` fonksiyonu baştan düzenlenecek.
    *   **Eylem:** Fonksiyon, `req.url` üzerinden `durum` parametrelerini okuyacak.
    *   **Eylem:** Eğer `durum` parametreleri varsa, `SELECT ... FROM kullaniciTablo WHERE durum IN (?, ?, ...)` şeklinde dinamik bir SQL sorgusu oluşturulacak ve parametreler sorguya güvenli bir şekilde eklenecek. Parametre yoksa, mevcut `WHERE`'siz sorgu çalışacak.

### Görev 2: Güncelleme Arayüzünü ve Mantığını Düzeltmek (`POST`)

1.  **Dosya: `admin-app/src/app/kullanici-list/kullanici-list.component.html`**
    *   **Eylem:** "Seçilenlere uygula" bölümündeki mevcut **radyo butonları ve "Uygula" butonu tamamen silinecek.**
    *   **Eylem:** Yerine, 0'dan 8'e kadar tüm durumları listeleyen yeni bir **checkbox grubu** ve tek bir **"Uygula" butonu** eklenecek.

2.  **Dosya: `admin-app/src/app/kullanici-list/kullanici-list.component.ts`**
    *   **Eylem:** `selectedStatusId` değişkeni kaldırılacak.
    *   **Eylem:** Güncelleme için seçilen durum checkbox'larının ID'lerini tutmak için `updateStatusSelection: number[] = []` gibi yeni bir dizi oluşturulacak.
    *   **Eylem:** `applyStatusUpdate` metodu, kullanıcının isteğine göre yeniden yazılacak:
        *   Metod, `updateStatusSelection` dizisini kontrol edecek.
        *   Eğer dizi boş değilse, dizinin **sadece ilk elemanını (`updateStatusSelection[0]`)** alacak.
        *   Bu tek durumu, tablodan seçili olan **tüm kullanıcılara** (`selection` seti) uygulayacak.


---

## BÖLÜM 3: TAMAMLANMA DURUMU (30.08.2026)

*   **Görev 1 (Filtreleme):** Tamamlandı. Backend, API servisi, component ve arayüz artık durum bazlı filtrelemeyi destekliyor.
*   **Görev 2 (Güncelleme):** Tamamlandı. Hatalı radyo butonu arayüzü, checkbox tabanlı bir arayüzle değiştirildi ve component mantığı, "çoklu seçimden ilkini uygula" kuralına göre güncellendi.