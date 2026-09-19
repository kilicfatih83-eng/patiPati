require('dotenv').config();
const http = require("http");
const db = require("./database.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { URLSearchParams } = require("url");
const { checkServerLoad, addPenaltyPoint } = require('./security.js');

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_PUBLIC_SECRET = process.env.JWT_PUBLIC_SECRET || "another_secret_for_public_app";
const JWT_BOLGE_SECRET = process.env.JWT_BOLGE_SECRET || "a_third_secret_for_bolge_app";
const SMS_SECRET_KEY = process.env.SMS_SECRET_KEY || "SUPER_GIZLI_ANAHTAR";

// Dynamic CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map(o => o.trim());

// Helper function for consistent error responses
function sendError(res, httpStatus, errorCode, subCode, message, details = {}) {
  res.writeHead(httpStatus, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message, errorCode, subCode, ...details }));
}

// Helper to normalize phone numbers
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('90') || digits.startsWith('0'))) {
    return digits.substring(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null; // Invalid format
}


function handleGetBolgeler(req, res) {
  db.all("SELECT * FROM bolgeTablo ORDER BY isim", [], (err, rows) => {
    if (err) {
      return sendError(res, 500, 5000, 500016, "Bölgeler getirilirken bir veritabanı hatası oluştu.");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  });
}


const server = http.createServer((req, res) => {
  // 1. İSTEK GELDİĞİ ANDA YÜK KONTROLÜ (BÖLÜM 3)
  if (checkServerLoad(req, res)) return; // Sistem yük altındaysa işlemi anında kes

  // Gerçek IP'yi Nginx'in/Cloudflare'in ilettiği formattan al
  const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.socket.remoteAddress;

  // Dynamic CORS Handling for Firebase Hosting & Cloudflare Domains
  const reqOrigin = req.headers.origin;
  if (allowedOrigins.includes("*") || !reqOrigin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (allowedOrigins.includes(reqOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", reqOrigin);
  } else {
    // If not explicitly matched, reflect first configured origin or wildcard
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0] || "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Secret-Key");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    const safeParse = (jsonString) => {
      try {
        if (!jsonString || !jsonString.trim()) return {};
        return JSON.parse(jsonString);
      } catch (e) {
        // BOZUK JSON - 25 Puan Ceza (BÖLÜM 3)
        addPenaltyPoint(clientIp, 25);
        sendError(res, 400, 3002, 300201, "İstek gövdesi JSON formatında değil.");
        return null;
      }
    };

    const parsedBody = body ? safeParse(body) : {};
    if (body && parsedBody === null) {
      return; // Stop processing if JSON is malformed
    }

    const safeBody = parsedBody || {};
    const id = pathname.split("/")[3];

    // --- ROUTER ---


    // Admin Routes
    if (pathname === "/login" && req.method === "POST") {
      handleLogin(req, res, safeBody, clientIp);
    } else if (pathname === "/api/getYon" && req.method === "GET") {
      authenticate(req, res, clientIp, () => handleGetYon(req, res));
    } else if (pathname === "/api/save-changes" && req.method === "POST") {
      authenticate(req, res, clientIp, () => handleSaveChanges(req, res, safeBody));
      // Admin User Management Routes
    } else if (pathname === "/api/kullanicilar" && req.method === "GET") {
      authenticate(req, res, clientIp, () => handleGetKullanicilar(req, res));
    } else if (pathname === "/api/kullanicilar/update-status" && req.method === "POST") {
      authenticate(req, res, clientIp, () => handleUpdateKullaniciStatus(req, res, safeBody));
    } else if (pathname === "/api/kullanicilar/register" && req.method === "POST") {
      authenticate(req, res, clientIp, () => handleRegisterKullanici(req, res, safeBody));

    }
    // Public App Routes
    else if (pathname === "/api/public/login" && req.method === "POST") {
      handlePublicLogin(req, res, safeBody, clientIp);
    } else if (pathname === "/api/bolgeler" && req.method === "GET") {
      handleGetBolgeler(req, res);
    } else if (pathname === "/api/ilanlar" && req.method === "GET") {
      handleGetIlanlar(req, res, url.searchParams);
    } else if (pathname.startsWith("/api/ilanlar/") && req.method === "GET") {
      handleIlanDetayFull(req, res, id);
    } else if (pathname === "/api/ilanlar" && req.method === "POST") {
      authenticatePublic(req, res, clientIp, () => handleCreateIlan(req, res, safeBody));
    } else if (pathname.endsWith("/talip-ol") && req.method === "POST") {
      authenticatePublic(req, res, clientIp, () => handleTalipOl(req, res, id, safeBody));
    } else if (pathname === "/api/mesaj" && req.method === "POST") {
      authenticatePublic(req, res, clientIp, () => handleMesaj(req, res, safeBody));
    } else if (pathname === "/api/my-ads" && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleMyAds(req, res));
    } else if (pathname === "/api/my-applications" && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleMyApplications(req, res));
    } else if (pathname === "/api/my-ads-applicants" && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleMyAdsApplicants(req, res));
    } else if (pathname.startsWith("/api/talep-detay-full/") && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleTalepDetayFull(req, res, id));
    } else if (pathname.startsWith("/api/talep-detay-kisitli/") && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleTalepDetayKisitli(req, res, id));
    } else if (pathname.startsWith("/api/ilan-detay-full/") && req.method === "GET") {
      handleIlanDetayFull(req, res, id);
    } else if (pathname.startsWith("/api/my-ad-detay-full/") && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleMyAdDetayFull(req, res, id));
    } else if (pathname.startsWith("/api/my-ad-detay-kisitli/") && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleMyAdDetayKisitli(req, res, id));
    } else if (pathname === "/api/me/yayin-hakki" && req.method === "GET") {
      authenticatePublic(req, res, clientIp, () => handleGetMyYayinHakki(req, res));
    }

    // Bolge App Routes
    else if (pathname === "/api/bolge/ilanlar" && req.method === "GET") {
      authenticateBolge(req, res, clientIp, () => handleGetBolgeIlanlar(req, res, url.searchParams));
    } else if (pathname === "/api/bolge/ilan-durum-guncelle" && req.method === "POST") {
      authenticateBolge(req, res, clientIp, () => handleUpdateIlanDurum(req, res, safeBody));
    } else if (pathname.startsWith("/api/bolge/ilan-detay/") && req.method === "GET") {
      authenticateBolge(req, res, clientIp, () => handleGetBolgeIlanDetay(req, res, id));
    } else if (pathname === "/api/bolge/talipler" && req.method === "GET") {
      authenticateBolge(req, res, clientIp, () => handleGetBolgeTalipler(req, res, url.searchParams));
    } else if (pathname === "/api/bolge/talip-durum-guncelle" && req.method === "POST") {
      authenticateBolge(req, res, clientIp, () => handleUpdateTalipDurum(req, res, safeBody));
    } else if (pathname === "/api/bolge/mesajlar" && req.method === "GET") {
      authenticateBolge(req, res, clientIp, () => handleGetBolgeMesajlar(req, res));
    }
    // Other Routes
    else if (pathname === "/api/sms-handler" && req.method === "POST") {
      handleSmsRequest(req, res, safeBody, body, clientIp);
    } else {
      // YANLIŞ ADRESE İSTEK (404) - 50 Puan Ceza (BÖLÜM 3)
      addPenaltyPoint(clientIp, 50);
      sendError(res, 404, 4004, 404001, "Endpoint not found.");
    }
  });
});


// --- HANDLERS ---

function handleLogin(req, res, body = {}, clientIp) {
  const { isim, sifre } = body;
  if (!isim || !sifre) {
    addPenaltyPoint(clientIp, 25);
    return sendError(res, 400, 1101, 110100, "Kullanıcı adı ve şifre zorunludur.");
  }

  db.get("SELECT * FROM yonTablo WHERE isim = ?", [isim], (err, user) => {
    if (err) return sendError(res, 500, 5000, 500001, "Database error while finding user.");
    if (!user) {
      addPenaltyPoint(clientIp, 35);
      return sendError(res, 401, 1101, 110101, "Invalid username or password.");
    }

    bcrypt.compare(sifre, user.sifre, (err, result) => {
      if (err || !result) {
        addPenaltyPoint(clientIp, 35);
        return sendError(res, 401, 1101, 110102, "Invalid username or password.");
      }

      let token;
      let app;
      if (user.adm) {
        token = jwt.sign({ id: user.id, isim: user.isim, adm: user.adm }, JWT_SECRET, { expiresIn: "1h" });
        app = 'admin';
      } else if (user.bolgeId) {
        token = jwt.sign({ 
          id: user.id, 
          isim: user.isim, 
          bolgeId: user.bolgeId,
          kus: user.kus || 0,
          kedi: user.kedi || 0,
          kopek: user.kopek || 0
        }, JWT_BOLGE_SECRET, { expiresIn: "8h" });
        app = 'bolge';
      } else {
        return sendError(res, 403, 1102, 110201, "User account is not configured for any application.");
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ token, user, app }));
    });
  });
}

function handlePublicLogin(req, res, body = {}, clientIp) {
  const normalizedPhone = normalizePhoneNumber(body.isim);
  if (!normalizedPhone) {
    addPenaltyPoint(clientIp, 25);
    return sendError(res, 400, 1103, 110301, "Geçersiz telefon formatı. Numarayı 5xx xxx xx xx şeklinde girin.");
  }

  const { sifre } = body;
  if (!sifre) {
    addPenaltyPoint(clientIp, 25);
    return sendError(res, 400, 1101, 110100, "Şifre zorunludur.");
  }

  db.get("SELECT id, isim, sifre, telefon, mail, yayinHakki, durum FROM kullaniciTablo WHERE telefon = ?", [normalizedPhone], (err, user) => {
    if (err) return sendError(res, 500, 5000, 500001, "Kullanıcı aranırken veritabanı hatası.");
    if (!user) {
      addPenaltyPoint(clientIp, 35);
      return sendError(res, 401, 1101, 110103, "Bu telefon numarasıyla kayıtlı kullanıcı bulunamadı.");
    }
    if (user.durum === 0) return sendError(res, 403, 1104, 110401, "Hesabınız yönetici tarafından reddedilmiştir veya askıya alınmıştır.");

    bcrypt.compare(sifre, user.sifre, (err, result) => {
      if (err || !result) {
        addPenaltyPoint(clientIp, 35);
        return sendError(res, 401, 1101, 110104, "Hatalı şifre.");
      }

      const token = jwt.sign({ id: user.id, isim: user.isim, telefon: user.telefon }, JWT_PUBLIC_SECRET, { expiresIn: "8h" });
      const { sifre, ...userWithoutPassword } = user;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
          token,
          user: userWithoutPassword,
          subCode: 200101,
          message: "Giriş başarılı."
      }));
    });
  });
}

function handleGetYon(req, res) {
  db.all("SELECT id, isim, telefon, mail, kus, kedi, kopek, adm, bolgeId, engelli FROM yonTablo", [], (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500002, "Yöneticiler getirilemedi.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rows));
  });
}

function handleSaveChanges(req, res, body = {}) {
  const { updates = [], inserts = [], deletes = [] } = body;
  const failures = [];
  let completed = 0;
  const loggedInUser = req.user;

  const runInSeries = async () => {
    // --- DELETES ---
    for (const id of deletes) {
      await new Promise((resolve) => {
        db.get("SELECT adm FROM yonTablo WHERE id = ?", [id], (err, userToDelete) => {
          if (err) {
            failures.push({ id, message: err.message, subCode: 500003 });
          } else if (userToDelete && userToDelete.adm === 1) {
            failures.push({ id, message: "Admin kullanıcılar silinemez. Adm kullanıcı silmeye çalıştıysanız düzeltin.", subCode: 120205 });
          } else {
            db.run("DELETE FROM yonTablo WHERE id = ?", [id], function (err) {
              if (err) failures.push({ id, message: err.message, subCode: 500004 });
              else completed++;
            });
          }
          resolve();
        });
      });
    }

    // --- UPDATES ---
    for (const update of updates) {
      await new Promise((resolve) => {
        db.get("SELECT * FROM yonTablo WHERE id = ?", [update.id], (err, existing) => {
          if (err) {
            failures.push({ id: update.id, message: err.message, subCode: 500003 });
            return resolve();
          }
          if (!existing) {
            failures.push({ id: update.id, message: "Kullanıcı bulunamadı.", subCode: 500026 });
            return resolve();
          }

          if (existing.adm === 1) {
            if (loggedInUser.id !== update.id) {
              failures.push({ id: update.id, message: "Bir admin başka bir adminin bilgilerini değiştiremez. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin.", subCode: 120202 });
              return resolve();
            }

            const hasOtherChanges = (
              (update.isim !== undefined && update.isim !== existing.isim) ||
              (update.telefon !== undefined && update.telefon !== (existing.telefon || '')) ||
              (update.mail !== undefined && update.mail !== (existing.mail || '')) ||
              (update.kus !== undefined && (update.kus || 0) !== (existing.kus || 0)) ||
              (update.kedi !== undefined && (update.kedi || 0) !== (existing.kedi || 0)) ||
              (update.kopek !== undefined && (update.kopek || 0) !== (existing.kopek || 0)) ||
              (update.bolgeId !== undefined && (update.bolgeId || null) !== (existing.bolgeId || null)) ||
              (update.engelli !== undefined && (update.engelli || 0) !== (existing.engelli || 0)) ||
              (update.adm !== undefined && update.adm !== existing.adm)
            );

            if (hasOtherChanges) {
              failures.push({ 
                id: update.id, 
                message: "Admin kullanıcılar yalnızca kendi şifrelerini güncelleyebilir, diğer bilgiler değiştirilemez. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin.", 
                subCode: 120206 
              });
              return resolve();
            }

            if (update.sifre) {
              const hash = bcrypt.hashSync(update.sifre, 10);
              db.run("UPDATE yonTablo SET sifre = ? WHERE id = ?", [hash, update.id], function (err) {
                if (err) failures.push({ id: update.id, message: err.message, subCode: 500026 });
                else completed++;
                resolve();
              });
              return;
            } else {
              completed++;
              return resolve();
            }
          }

          const incomingAdm = update.adm !== undefined ? update.adm : existing.adm;
          if (incomingAdm !== existing.adm) {
            failures.push({ id: update.id, message: "Admin yetkisi doğuştandır, sonradan verilemez veya kaldırılamaz. Adm kullanıcı değiştirmeye çalıştıysanız düzeltin.", subCode: 120203 });
            return resolve();
          }

          const safeAdm = existing.adm;
          let query = "UPDATE yonTablo SET isim=?, telefon=?, mail=?, kus=?, kedi=?, kopek=?, adm=?, bolgeId=?, engelli=? WHERE id=?";
          let params = [
            update.isim,
            update.telefon,
            update.mail,
            update.kus || 0,
            update.kedi || 0,
            update.kopek || 0,
            safeAdm,
            update.bolgeId || null,
            update.engelli || 0,
            update.id
          ];

          if (update.sifre) {
            const hash = bcrypt.hashSync(update.sifre, 10);
            query = "UPDATE yonTablo SET isim=?, sifre=?, telefon=?, mail=?, kus=?, kedi=?, kopek=?, adm=?, bolgeId=?, engelli=? WHERE id=?";
            params = [
              update.isim,
              hash,
              update.telefon,
              update.mail,
              update.kus || 0,
              update.kedi || 0,
              update.kopek || 0,
              safeAdm,
              update.bolgeId || null,
              update.engelli || 0,
              update.id
            ];
          }

          db.run(query, params, function (err) {
            if (err) failures.push({ id: update.id, message: err.message, subCode: 500026 });
            else completed++;
            resolve();
          });
        });
      });
    }

    // --- INSERTS ---
    for (const insert of inserts) {
      await new Promise((resolve) => {
        const hash = bcrypt.hashSync(insert.sifre || "12345", 10);
        const query = "INSERT INTO yonTablo (isim, sifre, telefon, mail, kus, kedi, kopek, adm, bolgeId, engelli) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        const params = [
          insert.isim,
          hash,
          insert.telefon,
          insert.mail,
          insert.kus || 0,
          insert.kedi || 0,
          insert.kopek || 0,
          0,
          insert.bolgeId || null,
          insert.engelli || 0
        ];

        db.run(query, params, function (err) {
          if (err) failures.push({ id: null, message: err.message, subCode: 500027 });
          else completed++;
          resolve();
        });
      });
    }

    if (failures.length > 0) {
      sendError(res, 400, 4000, 400004, "Bazı işlemler başarısız oldu.", { failures });
    } else {
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({ message: "Tüm değişiklikler başarıyla kaydedildi.", subCode: 200501 })
      );
    }
  };

  runInSeries();
}


function handleCreateIlan(req, res, body = {}) {
  const userId = req.user.id;
  db.run("UPDATE kullaniciTablo SET yayinHakki = yayinHakki - 1 WHERE id = ? AND yayinHakki > 0", [userId], function (err) {
    if (err) return sendError(res, 500, 5000, 500005, "DB error updating yayinHakki.");
    if (this.changes === 0) {
      return db.get("SELECT yayinHakki FROM kullaniciTablo WHERE id = ?", [userId], (err, row) => {
        const currentHak = (row && row.yayinHakki) || 0;
        return sendError(res, 402, 4001, 400101, "İlan oluşturmak için yeterli yayın hakkınız yok.", { guncelYayinHakki: currentHak });
      });
    }

    const { bolgeId, hayvanTuru, ilanTuru, baslik, aciklama, hayvanIsim, telefon, formVerileri, fotoLink1, fotoLink2, fotoLink3 } = body;
    const formVerileriStr = typeof formVerileri === "object" ? JSON.stringify(formVerileri) : (formVerileri || "{}");
    const query = `
      INSERT INTO ilanTablo (kullaniciId, bolgeId, hayvanTuru, ilanTuru, durum, baslik, aciklama, hayvanIsim, telefon, formVerileri, fotoLink1, fotoLink2, fotoLink3)
      VALUES (?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      query,
      [userId, bolgeId || 1, hayvanTuru || "kedi", ilanTuru || "sahiplendirme", baslik || "", aciklama || "", hayvanIsim || "", telefon || "", formVerileriStr, fotoLink1 || "", fotoLink2 || "", fotoLink3 || ""],
      function (err) {
        if (err) return sendError(res, 500, 5001, 500101, "İlan veritabanına kaydedilemedi.");
        res.writeHead(201, { "Content-Type": "application/json" }).end(
          JSON.stringify({ 
            message: "İlan başarıyla oluşturuldu.", 
            id: this.lastID,
            subCode: 200301
          })
        );
      }
    );
  });
}

function handleTalipOl(req, res, ilanId, body = {}) {
  const talipId = req.user.id;
  db.get("SELECT kullaniciId, bolgeId, hayvanTuru FROM ilanTablo WHERE id = ?", [ilanId], (err, ilan) => {
    if (err) return sendError(res, 500, 5000, 500006, "DB error finding ilan.");
    if (!ilan) return sendError(res, 404, 4003, 400303, "Başvuru yapılmak istenen ilan bulunamadı.");
    if (ilan.kullaniciId === talipId) return sendError(res, 400, 4002, 400201, "Kendi ilanınıza başvuramazsınız.");

    db.run("UPDATE kullaniciTablo SET yayinHakki = yayinHakki - 1 WHERE id = ? AND yayinHakki > 0", [talipId], function (err) {
      if (err) return sendError(res, 500, 5000, 500005, "DB error updating yayinHakki.");
      if (this.changes === 0) {
        return db.get("SELECT yayinHakki FROM kullaniciTablo WHERE id = ?", [talipId], (err, row) => {
          const currentHak = (row && row.yayinHakki) || 0;
          return sendError(res, 402, 4001, 400102, "Başvuru yapmak için yeterli yayın hakkınız yok.", { guncelYayinHakki: currentHak });
        });
      }
      const query = "INSERT INTO talipTablo (ilanId, talipId, talipMsj, durum, bolgeId, hayvanTuru) VALUES (?, ?, ?, 2, ?, ?)";
      db.run(query, [ilanId, talipId, body.talipMsj || "", ilan.bolgeId, ilan.hayvanTuru], function (err) {
        if (err) return sendError(res, 500, 5001, 500102, "Başvuru kaydedilemedi.");
        res.writeHead(201, { "Content-Type": "application/json" }).end(
          JSON.stringify({ 
            message: "Başvurunuz başarıyla alındı.",
            subCode: 200302
          })
        );
      });
    });
  });
}

function handleMesaj(req, res, body = {}) {
  const userId = req.user.id;
  const { talipId, mesaj } = body;

  db.get("SELECT t.*, i.kullaniciId as sahipId FROM talipTablo t JOIN ilanTablo i ON t.ilanId = i.id WHERE t.id = ?", [talipId], (err, talip) => {
    if (err) return sendError(res, 500, 5000, 500009, "DB hatası.");
    if (!talip) return sendError(res, 404, 4003, 400302, "Mesaj gönderilecek başvuru kaydı bulunamadı.");

    const isTalip = userId === talip.talipId;
    const isSahip = userId === talip.sahipId;
    if (!isTalip && !isSahip) return sendError(res, 403, 1203, 120302, "Bu mesaja erişim yetkiniz yok.");

    db.run("UPDATE kullaniciTablo SET yayinHakki = yayinHakki - 1 WHERE id = ? AND yayinHakki > 0", [userId], function (err) {
      if (err) return sendError(res, 500, 5000, 500005, "DB hatası.");
      if (this.changes === 0) {
        return db.get("SELECT yayinHakki FROM kullaniciTablo WHERE id = ?", [userId], (err, row) => {
          const currentHak = (row && row.yayinHakki) || 0;
          return sendError(res, 402, 4001, 400103, "Mesaj göndermek için yeterli yayın hakkınız yok.", { guncelYayinHakki: currentHak });
        });
      }

      const column = isTalip ? "talipMsj" : "sahipMsj";
      db.run(`UPDATE talipTablo SET ${column} = ? WHERE id = ?`, [mesaj, talipId], function (err) {
        if (err) return sendError(res, 500, 5001, 500103, "Mesaj güncellenemedi.");
        res.writeHead(200, { "Content-Type": "application/json" }).end(
          JSON.stringify({ message: "Mesajınız başarıyla gönderildi.", subCode: 200303 })
        );
      });
    });
  });
}

function handleGetMyYayinHakki(req, res) {
  db.get("SELECT yayinHakki FROM kullaniciTablo WHERE id = ?", [req.user.id], (err, row) => {
    if (err) return sendError(res, 500, 5000, 500007, "DB error fetching yayinHakki.");
    if (!row) return sendError(res, 404, 2002, 200201, "Kullanıcı bulunamadı.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
  });
}

function handleMyAds(req, res) {
  const userId = req.user.id;
  const query = "SELECT id, kullaniciId, bolgeId, hayvanTuru, ilanTuru, baslik, aciklama, hayvanIsim, durum, yayinTarihi, fotoLink1, fotoLink2, fotoLink3 FROM ilanTablo WHERE kullaniciId = ? ORDER BY id DESC";
  db.all(query, [userId], (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500017, "İlanlarınız getirilemedi.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ilanlar: rows }));
  });
}

function handleMyApplications(req, res) {
  const userId = req.user.id;
  const query = `
    SELECT t.id, t.ilanId, t.talipId, t.durum, t.basvuruTarihi, i.baslik as ilanBaslik, i.durum as ilanDurum
    FROM talipTablo t
    JOIN ilanTablo i ON t.ilanId = i.id
    WHERE t.talipId = ?
    ORDER BY t.id DESC
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500018, "Başvurularınız getirilemedi.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ basvurular: rows }));
  });
}

function handleMyAdsApplicants(req, res) {
  const userId = req.user.id;
  const query = `
    SELECT t.id, t.ilanId, t.talipId, t.durum, t.basvuruTarihi, i.baslik as ilanBaslik, i.durum as ilanDurum
    FROM talipTablo t
    JOIN ilanTablo i ON t.ilanId = i.id
    WHERE i.kullaniciId = ?
    ORDER BY t.id DESC
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500019, "İlanlarınıza yapılan başvurular getirilemedi.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ talipler: rows }));
  });
}

function handleTalepDetayFull(req, res, id) {
  const userId = req.user.id;
  const query = `
    SELECT t.*, i.baslik as ilanBaslik, i.kullaniciId as sahipId
    FROM talipTablo t
    JOIN ilanTablo i ON t.ilanId = i.id
    WHERE t.id = ?
  `;
  db.get(query, [id], (err, row) => {
    if (err) return sendError(res, 500, 5000, 500020, "Talep detayı getirilemedi.");
    if (!row) return sendError(res, 404, 4003, 400302, "Başvuru kaydı bulunamadı.");
    if (userId !== row.talipId && userId !== row.sahipId) {
      return sendError(res, 403, 1203, 120303, "Bu başvurunun detayını görme yetkiniz yok.");
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
  });
}

function handleTalepDetayKisitli(req, res, id) {
  const query = `
    SELECT t.id, t.ilanId, t.durum, t.basvuruTarihi, i.baslik as ilanBaslik
    FROM talipTablo t
    JOIN ilanTablo i ON t.ilanId = i.id
    WHERE t.id = ?
  `;
  db.get(query, [id], (err, row) => {
    if (err) return sendError(res, 500, 5000, 500021, "Kısıtlı talep detayı getirilemedi.");
    if (!row) return sendError(res, 404, 4003, 400302, "Başvuru kaydı bulunamadı.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
  });
}

function handleIlanDetayFull(req, res, id) {
  db.get("SELECT * FROM ilanTablo WHERE id = ? AND durum = 1", [id], (err, row) => {
    if (err) return sendError(res, 500, 5000, 500022, "İlan detayı getirilemedi.");
    if (!row) return sendError(res, 404, 4003, 400303, "İlan bulunamadı veya henüz onaylanmamış.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
  });
}

function handleMyAdDetayFull(req, res, id) {
  const userId = req.user.id;
  db.get("SELECT * FROM ilanTablo WHERE id = ? AND kullaniciId = ?", [id, userId], (err, row) => {
    if (err) return sendError(res, 500, 5000, 500023, "İlan detayı getirilemedi.");
    if (!row) return sendError(res, 404, 4003, 400303, "İlan bulunamadı.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
  });
}

function handleMyAdDetayKisitli(req, res, id) {
  const userId = req.user.id;
  db.get(
    "SELECT id, kullaniciId, bolgeId, hayvanTuru, ilanTuru, baslik, aciklama, hayvanIsim, durum, yayinTarihi FROM ilanTablo WHERE id = ? AND kullaniciId = ?",
    [id, userId],
    (err, row) => {
      if (err) return sendError(res, 500, 5000, 500024, "Kısıtlı ilan detayı getirilemedi.");
      if (!row) return sendError(res, 404, 4003, 400305, "İlan bulunamadı.");
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(row));
    }
  );
}


function handleGetIlanlar(req, res, params) {
  let whereClauses = ["durum = 1"];
  let queryParams = [];

  const bolge = params.get("bolgeId") || params.get("bolge");
  if (bolge) {
    whereClauses.push("bolgeId = ?");
    queryParams.push(bolge);
  }

  const tur = params.get("hayvanTuru") || params.get("tur");
  if (tur) {
    whereClauses.push("hayvanTuru = ?");
    queryParams.push(tur);
  }

  if (params.get("ilanTuru")) {
    whereClauses.push("ilanTuru = ?");
    queryParams.push(params.get("ilanTuru"));
  }

  if (params.get("ilan_id") || params.get("id")) {
    whereClauses.push("id = ?");
    queryParams.push(params.get("ilan_id") || params.get("id"));
  }

  const query = `SELECT id, kullaniciId, bolgeId, hayvanTuru, ilanTuru, baslik, aciklama, hayvanIsim, yayinTarihi, fotoLink1, fotoLink2, fotoLink3 FROM ilanTablo WHERE ${whereClauses.join(" AND ")} ORDER BY id DESC`;
  db.all(query, queryParams, (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500016, "İlanlar getirilemedi.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rows));
  });
}

function handleSmsRequest(req, res, parsedBody = {}, rawBody, clientIp) {
  const authHeader = req.headers['x-secret-key'];
  if (authHeader !== SMS_SECRET_KEY) {
    addPenaltyPoint(clientIp, 35);
    return sendError(res, 403, 1300, 130001, "Geçersiz SMS anahtarı.");
  }

  const { telefon, miktar } = parsedBody;
  if (!telefon || !miktar) {
    addPenaltyPoint(clientIp, 25);
    return sendError(res, 400, 1300, 130002, "Telefon ve miktar zorunludur.");
  }

  const normalizedPhone = normalizePhoneNumber(telefon);
  db.run("UPDATE kullaniciTablo SET yayinHakki = yayinHakki + ? WHERE telefon = ?", [miktar, normalizedPhone], function(err) {
    if (err) return sendError(res, 500, 5000, 500030, "Bakiye güncellenirken veritabanı hatası.");
    if (this.changes === 0) {
       return sendError(res, 404, 2002, 200201, "Kullanıcı bulunamadı.");
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "Bakiye yüklendi.", subCode: 200105 }));
  });
}




// --- BOLGE APP HANDLERS ---

function handleGetBolgeIlanlar(req, res, params) {
  const user = req.user;
  let whereClauses = ["i.bolgeId = ?"];
  let queryParams = [user.bolgeId];

  const allowedTurler = [];
  if (user.kedi === 1) allowedTurler.push('kedi');
  if (user.kopek === 1) allowedTurler.push('köpek', 'kopek');
  if (user.kus === 1) allowedTurler.push('kuş', 'kus');

  if (params.has("durum") && params.get("durum")) {
    const durumler = params.get("durum").split(',').map(Number);
    if (durumler.length > 0) {
      whereClauses.push(`i.durum IN (${durumler.map(() => '?').join(',')})`);
      queryParams.push(...durumler);
    }
  }

  const isGenelYonetici = user.adm === 1 || allowedTurler.length === 0;

  if (params.has("tur") && params.get("tur")) {
    const requestedTurler = params.get("tur").split(',').map(t => t.trim().toLowerCase());
    
    let effectiveTurler;
    if (isGenelYonetici) {
      effectiveTurler = requestedTurler;
    } else {
      effectiveTurler = requestedTurler.filter(t => 
        allowedTurler.includes(t) || 
        (t === 'kopek' && allowedTurler.includes('köpek')) ||
        (t === 'kus' && allowedTurler.includes('kuş'))
      );
    }

    if (effectiveTurler.length > 0) {
      const finalTurList = [];
      effectiveTurler.forEach(t => {
        if (t === 'kedi') finalTurList.push('kedi');
        if (t === 'kopek' || t === 'köpek') finalTurList.push('kopek', 'köpek');
        if (t === 'kus' || t === 'kuş') finalTurList.push('kus', 'kuş');
      });
      const uniqueTurList = Array.from(new Set(finalTurList));
      whereClauses.push(`i.hayvanTuru IN (${uniqueTurList.map(() => '?').join(',')})`);
      queryParams.push(...uniqueTurList);
    } else {
      whereClauses.push("1 = 0");
    }
  } else {
    if (!isGenelYonetici) {
      const finalTurList = [];
      allowedTurler.forEach(t => {
        if (t === 'kedi') finalTurList.push('kedi');
        if (t === 'kopek' || t === 'köpek') finalTurList.push('kopek', 'köpek');
        if (t === 'kus' || t === 'kuş') finalTurList.push('kus', 'kuş');
      });
      const uniqueTurList = Array.from(new Set(finalTurList));
      whereClauses.push(`i.hayvanTuru IN (${uniqueTurList.map(() => '?').join(',')})`);
      queryParams.push(...uniqueTurList);
    }
  }

  const limit = parseInt(params.get("limit") || "50", 10);
  const page = parseInt(params.get("page") || "1", 10);
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM ilanTablo i WHERE ${whereClauses.join(" AND ")}`;
  
  db.get(countQuery, queryParams, (err, countRow) => {
    if (err) return sendError(res, 500, 5000, 500010, "Bölge ilanları sayılırken hata oluştu.");
    
    const total = countRow ? countRow.total : 0;

    const query = `
          SELECT i.id, i.baslik, i.hayvanTuru, i.durum, i.yayinTarihi, i.formVerileri, i.fotoLink1, i.fotoLink2, i.fotoLink3
          FROM ilanTablo i
          WHERE ${whereClauses.join(" AND ")}
          ORDER BY i.id DESC
          LIMIT ? OFFSET ?
      `;
    
    db.all(query, [...queryParams, limit, offset], (err, rows) => {
      if (err) return sendError(res, 500, 5000, 500010, "Bölge ilanları getirilemedi.");
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ilanlar: rows, total }));
    });
  });
}

function handleUpdateIlanDurum(req, res, body = {}) {
  const { updates } = body;
  const user = req.user;
  const failures = [];
  let completedCount = 0;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return sendError(res, 400, 4000, 400001, "Toplu güncelleme için geçersiz veya boş istek.");
  }

  const query = "UPDATE ilanTablo SET durum = ? WHERE id = ? AND bolgeId = ?";

  const promises = updates.map(update => {
    return new Promise(resolve => {
      db.run(query, [update.durum, update.id, user.bolgeId], function (err) {
        if (err) {
          failures.push({ id: update.id, message: err.message, subCode: 500011 });
        } else if (this.changes === 0) {
          failures.push({ id: update.id, message: "Yetki sorunu veya kayıt bulunamadı", subCode: 120301 });
        } else {
          completedCount++;
        }
        resolve();
      });
    });
  });

  Promise.all(promises).then(() => {
    if (failures.length > 0) {
      return sendError(res, 400, 4000, 400002, "Bazı ilanlar güncellenemedi.", { failures });
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: `${completedCount} ilan başarıyla güncellendi.`, subCode: 200601 }));
    }
  });
}

function handleGetBolgeIlanDetay(req, res, id) {
  const user = req.user;
  db.get("SELECT * FROM ilanTablo WHERE id = ?", [id], (err, ilan) => {
    if (err) return sendError(res, 500, 5000, 500012, "İlan detayı getirilirken DB hatası.");
    if (!ilan) return sendError(res, 404, 4003, 400303, "İlan bulunamadı.");
    if (ilan.bolgeId !== user.bolgeId) {
      return sendError(res, 403, 1203, 120301, "Bu ilanın detaylarını görme yetkiniz yok.");
    }
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(ilan));
  });
}

function handleGetBolgeTalipler(req, res, params) {
  const user = req.user;
  let whereClauses = ["i.bolgeId = ?"];
  let queryParams = [user.bolgeId];

  if (params.get("ilanId")) {
    whereClauses.push("t.ilanId = ?");
    queryParams.push(params.get("ilanId"));
  }

  const query = `
        SELECT t.*, i.baslik as ilanBaslik, talip.isim as talipIsim, talip.telefon as talipTelefon
        FROM talipTablo t
        JOIN ilanTablo i ON t.ilanId = i.id
        JOIN kullaniciTablo talip ON t.talipId = talip.id
        WHERE ${whereClauses.join(" AND ")}
        ORDER BY t.id DESC
    `;

  db.all(query, queryParams, (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500013, "Bölge talipleri getirilirken DB hatası.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rows));
  });
}

function handleUpdateTalipDurum(req, res, body = {}) {
  const { updates } = body;
  const user = req.user;
  const failures = [];
  if (!updates || !Array.isArray(updates)) {
    return sendError(res, 400, 4000, 400001, "Toplu güncelleme için geçersiz istek.");
  }
  const query = `
        UPDATE talipTablo 
        SET durum = ? 
        WHERE id = ? 
        AND (SELECT bolgeId FROM ilanTablo WHERE id = talipTablo.ilanId) = ?
    `;
  const promises = updates.map(update => {
    return new Promise(resolve => {
      db.run(query, [update.durum, update.id, user.bolgeId], function (err) {
        if (err) {
          failures.push({ id: update.id, message: err.message, subCode: 500014 });
        } else if (this.changes === 0) {
          failures.push({ id: update.id, message: "Yetki sorunu veya kayıt bulunamadı", subCode: 120306 });
        }
        resolve();
      });
    });
  });
  Promise.all(promises).then(() => {
    if (failures.length > 0) {
      return sendError(res, 400, 4000, 400003, "Bazı talepler güncellenemedi.", { failures });
    } else {
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ message: "Talepler başarıyla güncellendi.", subCode: 200602 }));
    }
  });
}

function handleGetBolgeMesajlar(req, res) {
  const user = req.user;
  const query = `
        SELECT t.id, t.ilanId, i.baslik, t.talipMsj, t.sahipMsj, t.basvuruTarihi 
        FROM talipTablo t
        JOIN ilanTablo i ON t.ilanId = i.id
        WHERE i.bolgeId = ? AND (t.talipMsj IS NOT NULL OR t.sahipMsj IS NOT NULL)
        ORDER BY t.basvuruTarihi DESC
    `;
  db.all(query, [user.bolgeId], (err, rows) => {
    if (err) return sendError(res, 500, 5000, 500015, "Bölge mesajları getirilirken DB hatası.");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(rows));
  });
}


// --- AUTHENTICATION MIDDLEWARE ---
function authenticate(req, res, clientIp, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    addPenaltyPoint(clientIp, 35);
    return sendError(res, 401, 1000, 100001, "Bu işlem için token gereklidir.");
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      addPenaltyPoint(clientIp, 35);
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 419, 1001, 100101, "Oturum süreniz dolmuştur. Lütfen tekrar giriş yapın.");
      }
      return sendError(res, 403, 1000, 100002, "Geçersiz token.");
    }
    if (user.adm !== 1) {
      addPenaltyPoint(clientIp, 35);
      return sendError(res, 403, 1201, 120101, "Bu işlemi sadece adminler yapabilir.");
    }
    req.user = user;
    next();
  });
}

function authenticatePublic(req, res, clientIp, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    addPenaltyPoint(clientIp, 35);
    return sendError(res, 401, 1000, 100001, "Bu işlem için token gereklidir.");
  }

  jwt.verify(token, JWT_PUBLIC_SECRET, (err, user) => {
    if (err) {
      addPenaltyPoint(clientIp, 35);
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 419, 1001, 100101, "Oturum süreniz dolmuştur. Lütfen tekrar giriş yapın.");
      }
      return sendError(res, 403, 1000, 100002, "Geçersiz token.");
    }
    req.user = user;
    next();
  });
}

function authenticateBolge(req, res, clientIp, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) {
    addPenaltyPoint(clientIp, 35);
    return sendError(res, 401, 1000, 100001, "Bu işlem için token gereklidir.");
  }

  jwt.verify(token, JWT_BOLGE_SECRET, (err, user) => {
    if (err) {
      addPenaltyPoint(clientIp, 35);
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 419, 1001, 100101, "Oturum süreniz dolmuştur. Lütfen tekrar giriş yapın.");
      }
      return sendError(res, 403, 1000, 100002, "Geçersiz token.");
    }
    if (user.adm) return sendError(res, 403, 1102, 110201, "Admin hesapları bu uygulamayı kullanamaz.");
    if (!user.bolgeId) return sendError(res, 403, 1102, 110202, "Bu hesap bir bölge yöneticisi olarak yapılandırılmamış.");
    req.user = user;
    next();
  });
}

//--- Admin App - User Management Handlers ---

function handleGetKullanicilar(req, res) {
  if (req.user.adm !== 1) {
    return sendError(res, 403, 1201, 120101, "Bu işlemi sadece adminler yapabilir.");
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const durumParams = url.searchParams.getAll('durum');

  let query = "SELECT id, isim, telefon, mail, yayinHakki, durum FROM kullaniciTablo";
  const params = [];

  if (durumParams && durumParams.length > 0) {
    const validDurumParams = durumParams.map(p => parseInt(p, 10)).filter(p => !isNaN(p));
    if (validDurumParams.length > 0) {
      const placeholders = validDurumParams.map(() => '?').join(',');
      query += ` WHERE durum IN (${placeholders})`;
      params.push(...validDurumParams);
    }
  }

  query += " ORDER BY id DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Database error in handleGetKullanicilar:", err.message);
      return sendError(res, 500, 5000, 500020, "Kullanıcılar getirilirken bir veritabanı hatası oluştu.");
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  });
}

function handleUpdateKullaniciStatus(req, res, body = {}) {
  if (req.user.adm !== 1) {
    return sendError(res, 403, 1201, 120101, "Bu işlemi sadece adminler yapabilir.");
  }
  const { updates } = body;
  if (!updates || !Array.isArray(updates)) {
    return sendError(res, 400, 4000, 400001, "Toplu güncelleme için geçersiz istek.");
  }

  const failures = [];
  let completedCount = 0;

  const promises = updates.map(update => {
    return new Promise(resolve => {
      if (update.id === undefined || update.durum === undefined) {
        failures.push({ id: update.id, message: "Geçersiz güncelleme nesnesi: id ve durum zorunludur.", subCode: 400001 });
        resolve();
        return;
      }
      db.run("UPDATE kullaniciTablo SET durum = ? WHERE id = ?", [update.durum, update.id], function (err) {
        if (err) {
          failures.push({ id: update.id, message: err.message, subCode: 500104 });
        } else if (this.changes === 0) {
          failures.push({ id: update.id, message: "Kullanıcı bulunamadı veya durum zaten aynı.", subCode: 400401 });
        } else {
          completedCount++;
        }
        resolve();
      });
    });
  });

  Promise.all(promises).then(() => {
    if (failures.length > 0) {
      return sendError(res, 400, 4000, 400005, "Bazı kullanıcı durumları güncellenemedi.", { failures });
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: `${completedCount} kullanıcının durumu başarıyla güncellendi.`, subCode: 200502 }));
  });
}

async function handleRegisterKullanici(req, res, body = {}) {
  if (req.user.adm !== 1) {
    return sendError(res, 403, 1201, 120101, "Bu işlemi sadece adminler yapabilir.");
  }

  const { isim, sifre, telefon, mail } = body;
  if (!isim || !sifre || !telefon) {
    return sendError(res, 400, 1100, 110001, "İsim, şifre ve telefon alanları zorunludur.");
  }

  const normalizedPhone = normalizePhoneNumber(telefon);
  if (!normalizedPhone) {
    return sendError(res, 400, 1100, 110002, "Geçersiz telefon numarası formatı.");
  }

  try {
    const hash = await bcrypt.hash(sifre, 10);
    db.run(`INSERT INTO kullaniciTablo (isim, sifre, telefon, mail, yayinHakki, engelli) VALUES (?, ?, ?, ?, ?, ?)`,
      [isim, hash, normalizedPhone, mail || null, 0, 0],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE constraint failed: kullaniciTablo.telefon")) {
            return sendError(res, 409, 2003, 200302, "Bu telefon numarası zaten kayıtlı.");
          }
          return sendError(res, 500, 5000, 500003, "Kullanıcı veritabanına kaydedilirken bir hata oluştu.");
        }
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Kullanıcı başarıyla oluşturuldu.", id: this.lastID }));
      });
  } catch (hashError) {
    sendError(res, 500, 5000, 500004, "Şifreleme sırasında bir hata oluştu.");
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = server;
