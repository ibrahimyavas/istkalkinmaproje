# Proje 404: Durum Özeti (yeni ajana devir)

Son güncelleme: 20 Kasım 2026 · canlıdaki son commit `2dc35fa` (Vercel READY) · 20 Kasım işleri yerelde commit edildi, **push edilmedi** (§3.5)

Bu dosya yeni bir ajanın sıfırdan devam edebilmesi için yazıldı. Ayrıntılı geçmiş ve teknik notlar `docs/DEVIR-NOTU.md` dosyasında; 20 Kasım işleri `docs/DEVIR-2026-11-20.md` dosyasında. Okuma sırası: bu dosya → `DEVIR-2026-11-20.md` → `DEVIR-NOTU.md`.

## 1. Proje bir bakışta
- **Ne:** İstanbul'a özel kültür, zanaat ve erişilebilir rota web uygulaması.
- **Neden:** İSTKA **Yaratıcı Ekonominin Güçlendirilmesi 2026** (İSTKA/2026/YEG) başvurusu için jüriye gösterilecek çalışan demo.
- **Son başvuru:** **4 Aralık 2026**.
- **Hedef kitle:** yerli turistler, İstanbullular, erişilebilirlik ihtiyacı olanlar, backpacker gezinti grupları.
- **Yerel klasör:** `C:\Users\CU\Desktop\gemini\projeika` (eski konum: `Desktop\Projeler\proje-404`)
- **GitHub:** https://github.com/ibrahimyavas/istkalkinmaproje, dal `main`. Her gönderim Vercel'e otomatik deploy edilir.
- **Canlı site:** https://istkalkinmaproje.vercel.app
- **Not:** Kullanıcının bilgisayarındaki Güvenli İnternet filtresi `*.vercel.app` adreslerini engelliyor. Canlı kontrol için Vercel MCP'nin `web_fetch_vercel_url` aracı kullanılmalı.

## 2. Mimari (kısa)
- **client/:**
  - React 18, Vite, Tailwind. Renk tokenları RGB değişkenleri olarak `client/src/index.css` içinde.
  - React Router, MapLibre.
  - Veri katmanı: `services/api.js` (axios), `hooks/useApi.js`.
- **server/:**
  - Express; katmanlar `routes → services → repositories`.
  - `DATABASE_URL` varsa Postgres kullanılır (Neon; `kayitlar` tablosunda JSONB satırlar).
  - Yoksa bellek deposu kullanılır.
- **api/index.js + vercel.json:** Express tek bir sunucusuz fonksiyon olarak çalışır.
- **infra/:** Yalnızca yerelde Docker'da çalışır:
  - Valhalla `:8002` (güzergâh hesabı)
  - Photon `:2322` (adres arama)
  - PMTiles (harita karoları)
  - Postgres `:5432`
- **Testler:**
  - Sunucu: `cd server && npm test`
  - Arayüz: `cd client && npm run test:run`
- **Yerel önizleme:** `.claude/launch.json` içinde `api` (:5000) ve `web` (:5173) tanımlı.

## 3. Bu dönemde yapılanlar (14–20 Kasım 2026)

### 3.1 Ana sayfa yeniden kuruldu: `198c377`
- `client/src/pages/AnaSayfa.jsx` baştan yazıldı. Bölümler:
  - **Hero:** gün seçici (1–5) ve `/rota-sihirbazi?gun=N` bağlantısı; Ayasofya fotoğrafı ve künyesi.
  - **Yakalar:** semtler Avrupa, Anadolu ve Adalar yakalarına göre gruplanmış.
  - **Müzeler:** lacivert zeminde yatay kaydırmalı şerit.
  - **Sergiler:** kalan gün sayısıyla, en yakın kapanan önce.
  - **Harita ve takvim:** harita katmanları ve "Yaklaşan etkinlikler".
- Kaydırınca beliren içerik: `.acil` sınıfı ve `useAcilis` kancası. İçerik yalnızca `html.acilis-hazir` varken gizlenir.
- `RotaSihirbaziSayfasi.jsx`, adres çubuğundan `?gun` değerini okuyor.
- Kaydırma çubukları temaya uyduruldu: `--kaydirma` / `--kaydirma-ust` tokenları; koyu zeminler için `.kaydirma-koyu`.

### 3.2 Sade görünüm tüm sayfalara uygulandı: `2ee43bd`
- **Kurallar (taste-skill):**
  - Çizgi yok, durağan hâlde gölge yok, gradyan yok.
  - Küçük büyük harfli üst etiket yok.
  - Yüzeyler birbirinden ton farkıyla ayrılır.
  - Düğmeler tam yuvarlak.
- **Ana sınıflar (`index.css`):**
  - `.kart` → `rounded-[14px] bg-surface`
  - `.panel` → `rounded-[20px] bg-surface p-5`
  - Seçili olmayan çip ve ikincil düğme: `bg-heading/[.07]`
- Yaklaşık 20 JSX dosyasından kenarlık, gölge ve büyük harfli etiketler temizlendi.
- Gölge yalnızca üstte duran katmanlarda kaldı: Yorumlar açılır menüsü, Keşfet üst kartı ve sağ menü rayı.

### 3.3 Eyüp, Beyoğlu ve Boğaz semtleri eklendi: `fc22d0c`
- **Semtler:** 3 yeni semt (`server/src/data/semtler.js`): `eyup`, `beyoglu`, `bogaz`. Toplam semt sayısı **9**.
- **Mekanlar:** 22 yeni mekan (`mekanlar.js`, damga kodları EYS-32 … BYL-53). Örnekler: Galata Kulesi, Dolmabahçe, Eyüp Sultan Camii, Rumelihisarı, Pera Müzesi.
  - Hepsinin `dogrulandi: false` değeri var.
  - Hepsinin kaynağı Vikipedi, Vikiveri ya da OSM.
- **Müzeler:** +12 müze (`scripts/muzeler.js` yeni semtlere genişletildi).
- **Kapak görselleri:** +30 Commons kapağı (`mekanGorselleri.js`).
- **Ulaşım:** yeni iskele, istasyon ve teleferik durakları (`ulasim.js`).
- **Rotalar:** 3 yeni hikâye rotası (`eyup-halic`, `galata-pera`, `bogaz-saraydan-hisara`). Toplam rota sayısı **9**.
- **Sergiler:** semtlere ve mekanlara bağlandı.
  - Yeni `YENILENEN_TOHUMLAR` listesi (`store.js`) sayesinde sergi kayıtları her tohum sürümünde koddaki hâliyle yeniden yazılır.
  - `TOHUM_SURUMU` o gün `'2026-11-15.1'` yapıldı; şu anki değer `'2026-11-20.2'` (`server/src/repositories/pg.js`).
- **Test:** `server/test/etkinlik-gercek.test.js`.

### 3.4 Yükleme ekranı: `2dc35fa`
- `client/src/components/common/Yukleniyor.jsx`:
  - **Varsayılan görünüm:** Sayfanın ortasında kendini çizen bir rota çizgisi var; duraklar çizgi ulaştıkça yanıyor (2,4 saniyelik döngü).
    - Yanıp sönmeyi önlemek için 180 ms gecikmeyle beliriyor.
    - "Hareketi azalt" ayarı açıksa durağan görünüyor.
  - **`kutu` görünümü:** Harita yüklenirken haritanın kendi yüksekliğinde (`yukseklik` prop'u) ton zeminli bir kutu gösteriyor. 6 harita alanında kullanılıyor.
  - **`IskeletKartlar`:** Atölyeler, Etkinlikler ve Gruplar listelerinde nabız atan kart iskeletleri.
- CSS: `index.css` dosyasının sonunda, `yukleme-*` ve `iskelet*` sınıfları.

### 3.5 İstanbul atlası, müzik, vapur, takvim ve grup sohbeti (20 Kasım, commit edildi, **push edilmedi**)
- Ana sayfada `#atlas` bölümü: MapLibre üzerinde İstanbul → yaka → 39 ilçe → 972 mahalle inişi; köprüler, vapur hatları, 22 simge yapı.
- Konuma göre müzik önerisi (bölge torbaları + 20 mekana özel eşleştirme; YouTube Music, Spotify, Apple Music bağlantıları).
- Rota, plan, grup ve etkinlik sayfalarında Google/Yandex/Apple Maps çok duraklı yol tarifi bağlantıları.
- Takvime ekleme (Google Takvim + `.ics`) ve grup sohbeti (`/api/gruplar/:id/mesajlar`).
- `/vapur`: 4 Boğaz/Haliç vapur hattı, gidiş/dönüş yönüne göre iskele ve siluet sırası; 9 yeni gezilebilir mekan.
- `TOHUM_SURUMU = '2026-11-20.2'`. Testler: sunucu 54/54, arayüz 8/8, derleme temiz.
- Ayrıntı: `docs/DEVIR-2026-11-20.md`. Yerelde commit edildi; push (ve dolayısıyla Vercel'e yayın) kullanıcı onayı bekliyor. `client/public/geo/` ve `server/src/data/atlas-bolgeler.json` commit'te (Vercel'de gerekli).

## 4. Durum ve açık işler

### Önerilen sıra (kullanıcıyla konuşuldu)
1. **Kendi alan adı:** Güvenli İnternet filtresi `*.vercel.app` adresini engelliyor; jüri de engellenebilir.
2. **İBB açık verisi:** Gerçek deprem toplanma alanları ve toplu taşıma durakları. Şu an toplanma alanları **örnek** veri.
3. **Telefonda menü düzeni:** Mobilde menü yerleşimi gözden geçirilecek.
4. **İngilizce dil desteği.**

### ~25 Kasım'dan sonra
Yeni özellik eklenmeyecek, yalnızca:
- Veri doğrulama ("Doğrulanacak" etiketli kayıtlar).
- Örnek atölyeleri izinli gerçek ustalarla değiştirme.
- Sergileri yeniden kontrol etme (Yapı Kredi sergisi **29 Kasım'da bitiyor**).
- Demo videosu.

### Bekleyen diğer işler (ayrıntı `DEVIR-NOTU.md` §5–6)
- 5.4: yol üstünde kullanıcının kendi durağını ekleyebilmesi.
- 5.5: NVIDIA ücretsiz model API'si.
- 5.7: Vikisöz'den şiir.
- 5.9: Türkçe seslendirme. TTS repo bağlantısı henüz verilmedi.
- Arter elle eklenecek.
- Boğaz'ın Anadolu yakası mekanları.
- PWA.

### Bilinen küçük noktalar
- **Boğaz rotası:** %47 azami eğim ve "dik" etiketi gösteriyor; bu kıyıdaki SRTM verisinin gürültüsünden kaynaklanıyor. Rota kıyıdan ayrılmıyor.
- **Kapak görselleri:** Admin'deki "Fotoğrafları yenile", Pera Müzesi ve Rahmi M. Koç için elle seçilen kapakları geri çevirebilir.
- **Yerel veritabanı:** Yeni semtler listede en sonda görünüyor.

## 5. Değişmeyen kurallar
- **Commit ve push:** yalnızca kullanıcı açıkça onaylarsa ("Evet, gönder").
  - Commit yazarı: `ibrahimyavas <ibrahimyavas@users.noreply.github.com>`.
  - Commit mesajları Türkçe.
- **Kullanıcının kişisel e-postası** hiçbir yere yazılmaz.
- **Etiketler:** Doğrulanmamış veri `dogrulandi: false` ile tutulur ve arayüzde "Doğrulanacak" etiketiyle görünür. Demo göstergeler "DEMO VERİSİ" etiketlidir.
- **Telif:**
  - Korumalı şiirlerin tam metni gösterilmez.
  - Görseller yalnızca özgür lisanslı kullanılır; yazar ve lisans gösterilir.
  - Harita atfı "© OpenStreetMap katkıcıları" zorunlu.
- **Tohum verisi:** Tohum içeriği değişince `TOHUM_SURUMU` artırılır.
  - Postgres'te saklanan değer tohumdaki yeni değere üstün gelir.
  - Koddan zorla yenilenmesi gereken kayıtlar `YENILENEN_TOHUMLAR` listesine, silinecek kayıtlar `KALDIRILAN_TOHUMLAR` listesine eklenir.
- **Tasarım:** sade stil kurallarına (§3.2) uyulur. Kullanıcı arayüzü ileride kendi DESIGN.md'siyle Claude Design'da yeniden yapabilir; ekran envanteri `docs/EKRANLAR.md`.
