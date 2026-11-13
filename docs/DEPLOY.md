# Proje 404 — Vercel'e Yayınlama

Uygulama tek bir Vercel projesi olarak yayınlanır:
- `client/` derlenip statik site olarak sunulur.
- `api/index.js` Express sunucusunu serverless fonksiyon olarak çalıştırır.
- Veriler barındırılan bir Postgres'te (önerilen: Neon) tutulur.

## 1. Veritabanı (Neon)
1. https://neon.tech üzerinde yeni proje açın. Bölge: **AWS Europe Central 1 (Frankfurt)**; Vercel fonksiyonu da `fra1` bölgesinde çalışır.
2. "Connection string" ekranında **Pooled connection** seçeneğini açıp adresi kopyalayın (`...-pooler...neon.tech/...?sslmode=require`).
3. Tablo oluşturmanıza gerek yok: sunucu ilk istekte şemayı ve tohum veriyi (semtler, mekanlar, rotalar, örnek gruplar…) kendisi kurar.

> Vercel panelindeki **Storage → Neon** entegrasyonunu da kullanabilirsiniz. Entegrasyon `DATABASE_URL` değişkenini kendisi ekler.

## 2. Vercel projesi
Kodu Vercel'e iki yoldan gönderebilirsiniz:
- **GitHub:** Projeyi bir GitHub deposuna gönderin, Vercel'de "Add New → Project" ile içe aktarın.
- **CLI:** Proje kökünde `npx vercel` çalıştırın (ilk seferde giriş yapıp projeyi bağlar).

Ayarların hepsi `vercel.json` dosyasında; panelde değiştirmeniz gereken bir şey yok. Root Directory proje kökü olarak kalmalı.

## 3. Ortam değişkenleri (Vercel → Settings → Environment Variables)

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | Evet | Neon'un havuzlu (pooled) bağlantı adresi |
| `ADMIN_PASSWORD` | Evet | Yönetim paneli parolası. Demo parolasını (`demo404`) kullanmayın |
| `SESSION_SECRET` | Evet | Admin oturumu imza anahtarı. Üretmek için: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `VALHALLA_URL` | Hayır | Kendi Valhalla sunucunuz. Yoksa kişisel planlar yaklaşık çizgiyle hesaplanır; hazır rotalar yine gerçek güzergâhla görünür |
| `VITE_HARITA_STIL` | Hayır | Kendi harita stilinizin adresi. Yoksa OpenFreeMap kullanılır |
| `VITE_HARITA_YAZI_TIPI` | Hayır | Kendi stilinizi kullanıyorsanız `Noto Sans Medium` |

`ADMIN_PASSWORD` veya `SESSION_SECRET` eksikse site çalışır ama yönetim girişi kapalı kalır (bilinçli güvenlik önlemi).

## 4. Yayından sonra kontrol
1. `https://<alan-adı>/api/saglik` → `{"durum":"ok"}`
2. Ana sayfa, bir semt, bir rota (`/rota/kadikoy-sahne`): gerçek güzergâh ve yükseklik profili görünmeli.
3. Keşfet'te 2–3 yer seçip "Rotamı oluştur"; plan sayfası açılmalı ve yenilendiğinde de kaybolmamalı.
4. Gruplar → Grup aç → başka bir tarayıcıdan katıl.
5. `/admin` → giriş → **QR kodlar** sekmesinden kodları **canlı alan adıyla** yeniden yazdırın. Yerelde üretilenler `localhost`'a gider.

## 5. Kendi harita altyapımızı canlıya taşımak (isteğe bağlı)
Vercel Docker çalıştıramaz. `infra/docker-compose.yml`'deki servisler bir sunucuda (ör. bir VPS) çalıştırılır:
- **Valhalla** (`:8002`): `VALHALLA_URL` olarak verilir. Herkese açık olacaksa önüne HTTPS ve istek sınırı koyun.
- **Harita karoları:** `istanbul.pmtiles` (yaklaşık 76 MB) ile `infra/data/harita/` altındaki yazı tipleri ve sprite'lar bir nesne depolamaya ya da CDN'e konur (ör. Cloudflare R2). `harita-stili.json` içindeki adresler buna göre güncellenip `VITE_HARITA_STIL` verilir.
- **Photon:** henüz uygulamaya bağlı değil.

## Bilinen sınırlar
- Tohum veri yalnızca `server/src/repositories/pg.js` içindeki `TOHUM_SURUMU` değişince yeniden uygulanır ve yalnızca **eksik** kayıtları ekler. Admin düzenlemeleri ezilmez.
- Dijital pasaport damgaları kullanıcının tarayıcısında tutulur (hesap sistemi yok).
- Yerel geliştirmede Postgres: `docker compose -f infra/docker-compose.yml up -d postgres` ve `server/.env` içinde `DATABASE_URL`. Postgres testleri: `cd server && TEST_DATABASE_URL=postgres://proje404:proje404yerel@localhost:5432/proje404_test npm run test:pg`.
