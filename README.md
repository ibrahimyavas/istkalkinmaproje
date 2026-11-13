# Proje 404

İstanbul'un semtlerini **zanaat atölyeleri, hikâye rotaları, şiir ve erişilebilir yürüyüşlerle** keşfettiren web uygulaması.
İSTKA **Yaratıcı Ekonominin Güçlendirilmesi 2026** (İSTKA/2026/YEG) çağrısı için hazırlanan demo sürüm.

> **Demo uyarısı:** "Doğrulanacak" etiketli kayıtlar (örnek atölyeler, dizi mekanları, toplu taşıma koordinatları, toplanma alanları) gerçek veri değildir; başvuru öncesi doğrulanacak veya değiştirilecek. Admin panelindeki "Örnek görünüm" göstergeleri **DEMO VERİSİ**dir.

## Çalıştırma

```bash
cd server && npm install && cp .env.example .env && npm run dev
```

```bash
cd client && npm install && npm run dev
```

- Arayüz: http://localhost:5173
- API sağlık kontrolü: http://localhost:5000/api/saglik
- Yönetim paneli: http://localhost:5173/admin (parola `server/.env` içindeki `ADMIN_PASSWORD`)

Testler: `cd server && npm test` ve `cd client && npm run test:run`.

## Modüller

| Modül | Nerede |
|---|---|
| Semt sayfaları, hikâye rotaları, sesli rehber (tarayıcı TTS) | `client/src/pages/SemtSayfasi.jsx`, `RotaSayfasi.jsx` |
| Erişilebilir mod (merdiven/dik yokuş durakları atlanır, rampa/asansör bilgisi) | `server/src/services/mapService.js` |
| Toplu taşıma ve deprem toplanma alanı (her durak için en yakını) | `server/src/data/ulasim.js` |
| Zanaat atölyeleri ve talep formu | `client/src/pages/AtolyelerSayfasi.jsx`, `MekanSayfasi.jsx` |
| Şiir katmanı ve telif kuralı | `server/src/data/siirler.js`, `server/src/services/poemService.js` |
| Dün-Bugün karşılaştırma | `client/src/components/kultur/DunBugun.jsx` |
| Dijital semt pasaportu (QR → `/damga/:kod`) | `client/src/pages/PasaportSayfasi.jsx`, `DamgaSayfasi.jsx` |
| Kullanıcı bildirimi + admin onayı | `client/src/components/mekan/Formlar.jsx`, admin → Bildirimler |
| Keşfet: kaydırmalı kartlarla yer seçimi | `client/src/pages/KesfetSayfasi.jsx`, `client/src/hooks/useKesfet.js` |
| Kişisel rota optimizasyonu (en yakın komşu + 2-opt, yaka geçişi cezası, Valhalla yürüme yolu) | `server/src/services/optimizer.js`, `planService.js` |
| Gezinti grupları (aç, katıl, ayrıl, yönetim anahtarı, bildirme, admin moderasyonu) | `server/src/routes/sosyal.js`, `client/src/pages/Grup*.jsx` |
| Fotoğraf yükleme (EXIF temizliği, admin onayı), konumlu bildirim, Wikimedia'dan fotoğraf yenileme | `server/src/routes/fotograf.js`, `server/src/services/fotoService.js`, `wikimediaService.js` |
| Rota/plan yazdırma verisi ve mekanların ayrıntılı açıklamaları | `server/src/services/yazdirService.js`, `server/src/data/mekanDetaylari.js` |
| Uzman başvurusu, uzman paneli (etkinlik/workshop ekleme), etkinlik kaydı ve kontenjan | `server/src/routes/uzman.js`, `server/src/middleware/uzmanAuth.js` |
| Etki göstergeleri, içerik yönetimi, QR yazdırma, AI/HERE ayarları | `client/src/pages/admin/` |

Tasarım devri için ekran envanteri: [docs/EKRANLAR.md](docs/EKRANLAR.md). Fotoğraf, yazdırma ve uzman uçları: [docs/API-YENI.md](docs/API-YENI.md) (istemci entegrasyonu bekliyor).

## Mimari

- **client/**: React 18 + Vite + Tailwind (tokenlar `src/index.css`), React Router, MapLibre GL, Recharts.
- **server/**: Express; `routes/ → services/ → repositories/`.
  - `DATABASE_URL` tanımlıysa Postgres (`repositories/pg.js`). Şema ve tohum veri ilk istekte otomatik kurulur.
  - Tanımsızsa bellek ve `server/.data/store.json` kullanılır (`repositories/memory.js`, yalnızca yerel demo için).
  - Tohum veri `server/src/data/*.js` dosyalarında.
- **Yayınlama:** [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Neon).
- **api/index.js + vercel.json**: Express uygulaması Vercel serverless fonksiyonu olarak çalışır.

### Harita ve rota

- Harita karoları: yerelde kendi altyapımız (İstanbul PMTiles, İznik stili, yerel yazı tipleri; `http://localhost:8080/harita-stili.json`). Ayar `client/.env.development.local` dosyasında (`client/.env.example`'a bakın). Ayar yoksa, örneğin Vercel demosunda, OpenFreeMap kullanılır.
- Rota geometrisi, eğim profili ve merdiven uzunluğu kendi Valhalla sunucumuzla önceden hesaplanır ve `server/src/data/routes-geo/<rotaId>.json` olarak gömülür. Her rota iki kez hesaplanır: tüm duraklarla normal profil, erişilebilir modda atlanmayan duraklarla erişilebilir profil (merdiven ve yokuş cezalı).
- Rotalar veya durak koordinatları değişince yeniden üretin (Valhalla `localhost:8002`'de çalışırken):
  ```bash
  node scripts/build-app-routes.js
  ```
  Durak dizisi değişmiş bir rota için eski dosya kullanılmaz; arayüz yaklaşık çizgiye döner ve bunu belirtir.
- Altyapı kurulumu (Valhalla, Photon, PMTiles, karo sunucusu; Docker): `infra/README.md`. Hepsi `docker compose -f infra/docker-compose.yml up -d` ile kalkar. Photon (adres arama) çalışıyor ama uygulamaya henüz bağlı değil.

## Telif ve lisans notları

- Şiirler: FSEK'e göre yazarın ölümünden itibaren 70 yıl korunur. `korumali` eserlerde tam metin sunucudan hiç gönderilmez. Bu bir hukuki görüş değildir.
- Harita verisi © OpenStreetMap katkıcıları (ODbL).
- Dün-Bugün görselleri yalnızca kamu malı veya açık lisanslı kaynaklardan, künyesiyle eklenecek.
