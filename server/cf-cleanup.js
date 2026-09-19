const https = require('https');
require('dotenv').config();

const zoneId = process.env.CF_ZONE_ID;
const apiToken = process.env.CF_API_TOKEN;

if (!zoneId || !apiToken) {
    console.log("Cloudflare yapılandırması eksik, temizlik iptal edildi.");
    process.exit(0);
}

// Cloudflare Firewall kurallarını listele ve süresi geçenleri sil
const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: `/client/v4/zones/${zoneId}/firewall/access_rules/rules?notes=Otomatik Güvenlik Sistemi`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const data = JSON.parse(body);
            if (data.success && data.result) {
                const now = new Date().getTime();
                data.result.forEach(rule => {
                    const createdOn = new Date(rule.created_on).getTime();
                    // 30 dakikayı (1800000 ms) geçen banları kaldır
                    if (now - createdOn > 30 * 60 * 1000) {
                        deleteRule(rule.id);
                    }
                });
            }
        } catch (e) {
            console.error("Temizlik parse hatası:", e.message);
        }
    });
});

function deleteRule(ruleId) {
    const delOptions = {
        hostname: 'api.cloudflare.com',
        port: 443,
        path: `/client/v4/zones/${zoneId}/firewall/access_rules/rules/${ruleId}`,
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        }
    };
    const delReq = https.request(delOptions, (res) => {
        console.log(`[BAN KALDIRILDI] Kural ID: ${ruleId}`);
    });
    delReq.end();
}

req.end();
