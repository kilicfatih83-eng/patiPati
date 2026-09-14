const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const db = new sqlite3.Database("database.sqlite", (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        setupDatabase();
    }
});

function setupDatabase() {
    db.serialize(() => {
        // 1. Create yonTablo (Admin users)
        db.run(`
            CREATE TABLE IF NOT EXISTS yonTablo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isim TEXT,
                sifre TEXT NOT NULL,
                telefon TEXT,
                mail TEXT,
                kus INTEGER DEFAULT 0,
                kedi INTEGER DEFAULT 0,
                kopek INTEGER DEFAULT 0,
                adm INTEGER DEFAULT 0,
                bolgeId INTEGER,
                engelli INTEGER DEFAULT 0
            );
        `, (err) => {
            if (err) return console.error("Error creating yonTablo:", err.message);
            console.log("yonTablo table is ready.");
            db.get("SELECT COUNT(*) as count FROM yonTablo", [], (err, row) => {
                if (err) return console.error("Error counting yonTablo users:", err.message);
                if (row.count === 0) {
                    console.log("No admin users found, creating initial admin user...");
                    const hash = bcrypt.hashSync("12345", 10);
                    db.run("INSERT INTO yonTablo (isim, sifre, adm) VALUES (?, ?, ?)", ["adm", hash, 1], (err) => {
                        if (err) return console.error("Error creating initial admin user:", err.message);
                        console.log("Initial admin user created.");
                    });
                } else {
                    console.log("Admin users already exist.");
                }
            });
        });

        // 2. Create kullaniciTablo (Public users)
        db.run(`
            CREATE TABLE IF NOT EXISTS kullaniciTablo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isim TEXT NOT NULL,
                sifre TEXT NOT NULL,
                telefon TEXT UNIQUE,
                mail TEXT,
                yayinHakki INTEGER DEFAULT 5,
                durum INTEGER DEFAULT 2
            );
        `, (err) => {
            if (err) return console.error("Error creating kullaniciTablo:", err.message);
            console.log("kullaniciTablo table is ready.");
            db.get("SELECT COUNT(*) as count FROM kullaniciTablo", [], (err, row) => {
                if (err) return console.error("Error counting public users:", err.message);
                if (row.count === 0) {
                    console.log("No public users found, creating initial test users...");
                    const hash = bcrypt.hashSync("123", 10);
                    const users = [
                        { name: "testuser1", phone: "5555555551" },
                        { name: "testuser2", phone: "5555555552" },
                        { name: "testuser3", phone: "5555555553" },
                    ];
                    const stmt = db.prepare("INSERT INTO kullaniciTablo (isim, sifre, telefon, yayinHakki) VALUES (?, ?, ?, ?)");
                    users.forEach(u => stmt.run(u.name, hash, u.phone, 10));
                    stmt.finalize((err) => {
                         if (err) return console.error("Error creating initial public users:", err.message);
                         console.log("Initial public users created.");
                    });
                } else {
                    console.log("Public users already exist.");
                }
            });
        });

        // 3. Create bolgeTablo (Regions)
        db.run(`
            CREATE TABLE IF NOT EXISTS bolgeTablo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                isim TEXT NOT NULL UNIQUE
            );
        `, (err) => {
            if (err) return console.error("Error creating bolgeTablo:", err.message);
            console.log("bolgeTablo table is ready.");
            db.get("SELECT COUNT(*) as count FROM bolgeTablo", [], (err, row) => {
                if (err) return console.error("Error counting regions:", err.message);
                if (row.count === 0) {
                    console.log("No regions found, creating sample regions...");
                    const regions = ["Ankara", "İstanbul", "İzmir", "Bursa", "Antalya"];
                    const stmt = db.prepare("INSERT INTO bolgeTablo (isim) VALUES (?)");
                    regions.forEach(region => stmt.run(region));
                    stmt.finalize((err) => {
                        if(err) return console.error("Error inserting regions", err.message);
                        console.log("Sample regions created.");
                    });
                }
                 else {
                    console.log("Regions already exist.");
                }
            });
        });

        // 4. Create ilanTablo (Ads)
        db.run(`
            CREATE TABLE IF NOT EXISTS ilanTablo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kullaniciId INTEGER NOT NULL,
                bolgeId INTEGER NOT NULL,
                hayvanTuru TEXT, -- kedi, kopek, kus
                ilanTuru TEXT, -- acilKan, sahiplendirme, kayip
                durum INTEGER DEFAULT 0, -- 0: Onay Bekliyor, 1: Onaylandı, 2: Reddedildi
                baslik TEXT,
                aciklama TEXT,
                hayvanIsim TEXT,
                telefon TEXT,
                formVerileri TEXT, -- JSON object for detailed form data
                yayinTarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                fotoLink1 TEXT,
                fotoLink2 TEXT,
                fotoLink3 TEXT,
                FOREIGN KEY (kullaniciId) REFERENCES kullaniciTablo (id),
                FOREIGN KEY (bolgeId) REFERENCES bolgeTablo (id)
            );
        `, (err) => {
            if (err) return console.error("Error creating ilanTablo:", err.message);
            console.log("ilanTablo table is ready.");
        });

        // 5. Create talipTablo (Applicants)
        db.run(`
            CREATE TABLE IF NOT EXISTS talipTablo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ilanId INTEGER NOT NULL,
                talipId INTEGER NOT NULL,
                talipMsj TEXT,
                sahipMsj TEXT,
                basvuruTarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
                durum INTEGER DEFAULT 2, -- 2: islemsiz
                bolgeId INTEGER,
                hayvanTuru TEXT,
                FOREIGN KEY (ilanId) REFERENCES ilanTablo (id),
                FOREIGN KEY (talipId) REFERENCES kullaniciTablo (id)
            );
        `, (err) => {
            if (err) return console.error("Error creating talipTablo:", err.message);
            console.log("talipTablo table is ready.");
        });

        // Run migrations after table setup
        console.log("Checking for necessary database migrations...");
        db.run('ALTER TABLE kullaniciTablo ADD COLUMN durum INTEGER DEFAULT 2', (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Migration for kullaniciTablo.durum not needed (already exists).');
                } else {
                    console.error('Error during migration check for kullaniciTablo:', err.message);
                }
            } else {
                console.log('Migration successful: Added DURUM column to kullaniciTablo.');
            }
        });

        db.run('ALTER TABLE talipTablo ADD COLUMN durum INTEGER DEFAULT 2', (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log('Migration for talipTablo.durum not needed (already exists).');
                } else {
                    console.error('Error during migration check for talipTablo:', err.message);
                }
            } else {
                console.log('Migration successful: Added DURUM column to talipTablo.');
            }
        });
    });
}

module.exports = db;
