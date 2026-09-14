### Gözden Geçirilmiş ve Tamamlanmış Analiz

#### 1. Tamamlanmış Başarı `subCode` Listesi

Mevcut hata kodlarına karşılık, `server.js`'e eklenmesi gereken **tam** başarı `subCode` listesi aşağıdadır. Bu, `NotificationService`'in tam potansiyelle çalışmasını sağlayacaktır.

| İşlev / Eylem | `server.js` Fonksiyonu | Önerilen Başarı `subCode` | Mesaj |
| :--- | :--- | :--- | :--- |
| Kullanıcı Girişi | `handlePublicLogin` | `200101` | Giriş başarılı. |
| Yeni Kullanıcı Kaydı | `handlePublicRegister` | `200102` | Kayıt başarılı. |
| Bakiye Yükleme (SMS) | `handleSmsHandler` | `200105` | Yayın hakkı eklendi. |
| Yeni İlan Oluşturma | `handleCreateIlan` | `200301` | İlan onaya gönderildi. |
| İlana Başvurma | `handleTalipOl` | `200302` | Başvurunuz alındı. |
| Mesaj Gönderme | `handleGonderMesaj` | `200303` | Mesaj gönderildi. |
| Admin: Değişiklikleri Kaydetme | `handleSaveChanges` | `200501` | Yöneticiler güncellendi. |
| Admin: Kullanıcı Durumu Güncelleme | `handleUpdateKullaniciStatus` | `200502` | Kullanıcı durumları güncellendi. |
| Bölge: İlan Durumu Güncelleme | `handleUpdateIlanOnay` | `200601` | İlan durumları güncellendi. |

---

### Tam Kapsamlı ve Gözden Geçirilmiş `SUBCODE_MAP` Analizi

Bu analiz, `server.js` dosyasında bulunan **her bir hata `subCode`'unu** listeler ve mantıksal bir "başarı" `subCode`'u ile eşleştirilip eşleştirilemeyeceğini belirtir.

| Hata `subCode` | Hata Mesajı | Eşleşen Başarı `subCode` | Senaryo / Açıklama |
| :--- | :--- | :--- | :--- |
| **100101** | Oturum süreniz dolmuştur. Lütfen tekrar giriş yapın. | **`200101`** (Giriş Başarılı) | **Eşleşme Var:** Kullanıcı, oturum süresi doldu uyarısından sonra tekrar giriş yaptığında, bu hata bildirimi "Giriş Başarılı" mesajıyla değiştirilir. |
| `100001` | Bu işlem için token gereklidir. | Karşılığı Yok | Bu, genellikle kodlama hatası veya beklenmedik durumdur. Kullanıcının bir eylemiyle doğrudan düzelmez. |
| `100002` | Geçersiz token. | Karşılığı Yok | Kullanıcının bir eylemiyle doğrudan düzelmez. Tekrar giriş yapılması gerekir, ancak bu `100101` senaryosudur. |
| `110201` | Kullanıcı bulunamadı. | Karşılığı Yok | Kullanıcı ya farklı bilgilerle tekrar denemeli ya da kayıt olmalıdır. Otomatik bir eşleşme senaryosu yoktur. |
| `110301` | Hatalı şifre. | Karşılığı Yok | Kullanıcı doğru şifreyle tekrar denemelidir. Otomatik bir eşleşme senaryosu yoktur. |
| `110401` | Hesabınız askıya alınmıştır. | **`200503`** (Admin: Hesap Aktive Edildi) | **Eşleşme Mümkün (Gelişmiş):** Admin, kullanıcı hesabını aktive ettiğinde bu hata mesajı bir başarı mesajına dönüşebilir. Ancak bu, anlık bildirim (websocket) gerektirebilecek daha karmaşık bir senaryodur. `SUBCODE_MAP`'e **şimdilik eklenmemesi** daha doğrudur. |
| `110601` | Bu telefon numarası zaten kayıtlı. | Karşılığı Yok | Kullanıcı farklı bir numara ile kayıt olmalıdır. |
| **400101** | Yetersiz yayın hakkı (İlan). | **`200105`** (Bakiye Yüklendi) veya **`200301`** (İlan Oluşturma Başarılı) | **Eşleşme Var:** Kullanıcı bakiye yüklediğinde VEYA daha sonra ilanı başarıyla oluşturduğunda bu hata temizlenir. |
| **400102** | Yetersiz yayın hakkı (Başvuru). | **`200105`** (Bakiye Yüklendi) veya **`200302`** (Başvuru Başarılı) | **Eşleşme Var:** Kullanıcı bakiye yüklediğinde VEYA daha sonra başvuruyu başarıyla yaptığında bu hata temizlenir. |
| **400103** | Yetersiz yayın hakkı (Mesaj). | **`200105`** (Bakiye Yüklendi) | **Eşleşme Var:** Kullanıcı bakiye yüklediğinde bu hata temizlenir. |
| `400201` | Kendi ilanınıza başvuramazsınız. | Karşılığı Yok | Bu bir iş kuralı ihlalidir, sonradan "başarıya" dönüşmez. |
| `400202` | Bu ilana daha önce başvurdunuz. | Karşılığı Yok | Bu bir iş kuralı ihlalidir, sonradan "başarıya" dönüşmez. |
| `120101` - `120305` | Çeşitli yetki hataları. | Karşılığı Yok | Bunlar yetki ihlalleridir, kullanıcının bir sonraki adımıyla başarıya dönüşmezler. |
| Diğerleri | Veritabanı hataları, geçersiz istekler vb. | Karşılığı Yok | Bu hatalar genellikle sistemseldir ve bir kullanıcı eyleminin başarısıyla doğrudan eşleşmez. |

#### Nihai `SUBCODE_MAP` Haritası (Tavsiye Edilen)

Yukarıdaki tam analize göre, `NotificationService`'e eklenmesi gereken, hem kullanışlı hem de yönetilebilir olan **nihai harita** şudur:

```typescript
// NotificationService'e eklenecek olan, tam kapsamlı analize dayalı nihai harita.
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
```

---

### BÖLÜM 5: Bölgeler API Sorununun Kök Neden Analizi (`admin-app` 500 Hatası)

**Sorun:** `admin-app` içerisinden bölgeler çekilmek istendiğinde `GET http://localhost:3001/api/bolgeler` isteği `500 Internal Server Error` hatası veriyor. Ancak aynı istek `public-app`'de sorunsuz çalışıyor.

**Hatanın Yeri:** `server/server.js` dosyasındaki API rotalarının (endpoints) tanımlanma sırası.

**Kök Neden:** Sunucuya gelen bir istek, `server.js` içindeki `if/else if` bloklarında yukarıdan aşağıya doğru bir eşleşme arar. Sorun bu sıralamadan kaynaklanmaktadır:
1. **Genelleyici Rota Önde:** `server.js` dosyasında, `/api/` ile başlayan **tüm** GET isteklerini yakalayan ve yetkilendirme (`authenticate`) gerektiren genel bir rota, `/api/bolgeler` gibi spesifik ve yetkilendirme gerektirmeyen bir rotadan **daha önce** tanımlanmıştır.
2. **Yetkilendirme Başlığı Farkı:**
   * `admin-app`, yaptığı tüm API isteklerine otomatik olarak `Authorization: Bearer <token>` başlığını ekler.
   * `public-app` ise halka açık bu istek için bu başlığı eklemez.
3. **Hatalı Akış:**
   * `admin-app`'den `GET /api/bolgeler` isteği (token ile birlikte) sunucuya geldiğinde, sunucu bu isteği özel `/api/bolgeler` rotasına ulaşamadan, daha yukarıdaki genel `authenticate` gerektiren `/api/...` rotasıyla eşleştirir.
   * Halka açık olması gereken bu isteğin yetkilendirme fonksiyonuna girmesi, sunucu içinde beklenmedik bir duruma yol açar ve `500 Internal Server Error` hatasıyla sonuçlanır.

**Çözüm:** `server.js` dosyasında, `else if (pathname === '/api/bolgeler' && req.method === 'GET')` bloğunun, yetkilendirme gerektiren ve `/api/` ile başlayan genelleyici `else if` bloğundan **daha yukarıya** taşınması gerekmektedir. Bu sayede istek doğru, yetkilendirmesiz olan kendi bloğu tarafından işlenir.
































































