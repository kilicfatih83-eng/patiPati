const { monitorEventLoopDelay } = require('perf_hooks');
const https = require('https');

// Yük İzleyici (BÖLÜM 3 - %75 ve %80 Eşikleri)
const eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
eventLoopDelay.enable();

// Event loop gecikme threshold'ları (nanosaniye cinsinden)
const THRESHOLD_FAIL_FAST = 50e6; // ~50ms gecikme (%75 yük)
const THRESHOLD_DROP = 100e6;     // ~100ms gecikme (%80 yük)

// RAM Üzerinde Ceza Puanı İzleme Map'i
const ipPenaltyScores = new Map();
const BAN_THRESHOLD = 100;

/**
 * Sunucu yük durumunu kontrol eder.
 * %80 yükte bağlantıyı koparır.
 * %75 yükte veritabanına dokunmadan 503 cevabı döner.
 */
function checkServerLoad(req, res) {
    const lag = eventLoopDelay.mean;
    if (lag > THRESHOLD_DROP) {
        if (req.socket && !req.socket.destroyed) {
            req.socket.destroy(); // %80 Yük: Bağlantıyı anında kapat
        }
        return true;
    }
    if (lag > THRESHOLD_FAIL_FAST) {
        res.writeHead(503, {
            "Content-Type": "application/json",
            "Retry-After": "10"
        });
        res.end(JSON.stringify({
            error: "Sistemde yoğunluk var, lütfen birazdan tekrar deneyiniz.",
            subCode: 503001
        }));
        return true;
    }
    return false;
}

/**
 * IP adresine ceza puanı ekler.
 * Puan 100'e ulaştığında Cloudflare API'sine Ban isteği gönderir.
 */
function addPenaltyPoint(ip, points) {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return;

    const currentScore = ipPenaltyScores.get(ip) || 0;
    const newScore = currentScore + points;
    ipPenaltyScores.set(ip, newScore);

    console.log(`[GÜVENLİK UYARISI] IP: ${ip} | Ceza Puanı: +${points} | Toplam: ${newScore}/100`);

    if (newScore >= BAN_THRESHOLD) {
        banIpOnCloudflare(ip);
        ipPenaltyScores.delete(ip); // Banlandıktan sonra RAM'den temizle
    }
}

/**
 * Cloudflare API'sine IP Engelleme (Block Rule) isteği atar.
 */
function banIpOnCloudflare(ip) {
    const zoneId = process.env.CF_ZONE_ID;
    const apiToken = process.env.CF_API_TOKEN;

    if (!zoneId || !apiToken) {
        console.log(`[GÜVENLİK KORUMASI SIMULASYON] ${ip} 100 puana ulaştı! (Cloudflare API anahtarları tanımlanmadığı için loglandı)`);
        return;
    }

    const postData = JSON.stringify({
        mode: "block",
        configuration: {
            target: "ip",
            value: ip
        },
        notes: "Otomatik Güvenlik Sistemi - 100 Ceza Puanı Aşıldı"
    });

    const options = {
        hostname: 'api.cloudflare.com',
        port: 443,
        path: `/client/v4/zones/${zoneId}/firewall/access_rules/rules`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', chunk => responseBody += chunk);
        res.on('end', () => {
            console.log(`[CLOUDFLARE BAN BAŞARILI] IP: ${ip} engellendi.`);
        });
    });

    req.on('error', (e) => {
        console.error(`[CLOUDFLARE API HATASI] IP Banlama başarısız: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

module.exports = { checkServerLoad, addPenaltyPoint };
