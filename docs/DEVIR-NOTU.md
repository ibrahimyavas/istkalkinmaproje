# Proje 404: Devir Notu (yeni sohbette devam için)

Son güncelleme: 14 Kasım 2026 · son commit `00b9483` (5.1, 5.2, 5.8 yapıldı, **henüz commit edilmedi**)

## 1. Proje
- **Ne:** İstanbul'a özel kültür, zanaat ve erişilebilir rota web uygulaması.
- **Neden:** İSTKA **Yaratıcı Ekonominin Güçlendirilmesi 2026** (İSTKA/2026/YEG) başvurusu için demo. Son başvuru tarihi **4 Aralık 2026**.
- **Hedef kitle:** yerli turist, İstanbullular, erişilebilirlik ihtiyacı olanlar ve sonradan eklenen backpacker'lar (gezinti grupları).
- **Kökeni:** `Projeler/yulaapp-main` (Yula) projesinden türetildi.

## 2. Nerede?
| | |
|---|---|
| Yerel klasör | `C:\Users\CU\Desktop\Projeler\proje-404` |
| GitHub | https://github.com/ibrahimyavas/istkalkinmaproje (`main`). Commit yazarı bu depoda `ibrahimyavas` + GitHub gizli e-postası |
| Canlı site | https://istkalkinmaproje.vercel.app |
| Vercel | Ekip "İbram" (`team_XehQyV2sFbaXKUoRlAaFjXH6`), proje `istkalkinmaproje` (`prj_SWYGCjBxYqblzxPkRlmYe8hYGLf3`), bölge `fra1`. `main`'e her gönderim otomatik deploy edilir |
| Vercel ortam değişkenleri | `SESSION_SECRET`, `ADMIN_PASSWORD` (kullanıcı belirledi), Neon'dan gelen `DATABASE_URL` ve `PG*` / `POSTGRES_*` |
| Diğer Vercel projesi | `ikaproject`, başka bir depoya ("Antigravika") bağlı. **Dokunulmadı.** |
| Vercel MCP | Bağlı: deploy, ortam değişkeni ve kayıt okuma yapılabiliyor |
| Tasarım | `tasarim/Proje 404 Preview v2.dc.html` (Claude Design). Palet: lacivert `#0A2540` + kiremit `#C84B26`; yazı tipleri Plus Jakarta Sans + Inter; ikonlar Material Symbols |

## 3. Mimari
- **client/:** React 18, Vite, Tailwind (tokenlar `src/index.css`), React Router, MapLibre, Recharts, `motion`.
  - Mantık görünümden ayrı: `services/api.js`, `hooks/`, `lib/`.
- **server/:** Express. Katmanlar `routes/ → services/ → repositories/`.
  - `DATABASE_URL` varsa Postgres (`repositories/pg.js`: JSONB belgeler, otomatik şema ve tohum veri, `TOHUM_SURUMU`).
  - Yoksa bellek + `server/.data/store.json` (`memory.js`).
- **api/index.js + vercel.json:** Express tek bir sunucusuz fonksiyon olarak çalışır; arayüz statik site.
- **infra/:** yalnızca yerelde Docker'da çalışır: Valhalla (`:8002`), Photon (`:2322`), martin + PMTiles (`:3000`), stil sunucusu (`:8080`), Postgres (`:5432`). `infra/data` 1,9 GB'tır ve git'e girmez.
- **Rotalar:** `scripts/build-app-routes.js` Valhalla ile hesaplar ve `server/src/data/routes-geo/*.json` dosyalarına yazar (canlıda bunlar kullanılır).
- **Testler:** sunucuda 47 (`cd server && npm test`; Postgres için `TEST_DATABASE_URL=postgres://proje404:proje404yerel@localhost:5432/proje404_test npm run test:pg`), arayüzde 6 (`cd client && npm run test:run`).
- **Ayrıntılı belgeler:** `docs/DEPLOY.md`, `docs/API-YENI.md`, `docs/EKRANLAR.md`, `README.md`.

## 4. Mevcut özellikler (canlıda)
- **Semtler ve rotalar:** 6 semt, 6 hikâye rotası (Valhalla güzergâhı, eğim profili, merdiven bilgisi), sesli rehber (tarayıcı konuşma sentezi).
- **Erişilebilirlik:** erişilebilir mod; her durakta en yakın toplu taşıma durağı ve deprem toplanma alanı.
- **Keşfet:** Tinder tarzı kart destesi → kişisel rota optimizasyonu (en yakın komşu + 2-opt, yaka geçişinde vapur/Marmaray önerisi).
- **Gezinti grupları:** aç, katıl, ayrıl; yönetim anahtarı, kontenjan kilidi, şikâyet bildirimi.
- **Mekanlar:** 31 mekan, ayrıntılı açıklama ve ipucu; 11 Wikimedia kapak fotoğrafı (tohumda, lisanslı).
- **Fotoğraf:** ziyaretçi fotoğraf yükleme (EXIF/GPS silinir) → admin onayı, "Kapak yap", "Fotoğrafları yenile".
- **Bildirim:** konumlu sahadan bildirim (`/bildir`).
- **Yazdırma:** A4 rota/plan çıktısı (QR kod + SVG rota çizimi).
- **Uzmanlar:** başvuru → admin onayı (tek seferlik anahtar) → uzman paneli (workshop ekleme, kayıtları görme); etkinlik sayfası ve kontenjanlı kayıt.
- **Diğer:** şiir katmanı (telif kuralıyla), dün-bugün kaydırıcı, dijital pasaport (QR damga).
- **Admin paneli:** göstergeler (gerçek / DEMO VERİSİ), bildirimler, talepler, gruplar, fotoğraflar, uzmanlar, JSON içerik düzenleyici, QR yazdırma, AI/HERE ayarları.

## 5. YENİ İSTEKLER ("neredeyse tam sürüm")

### 5.1 Gün sayısına göre genel İstanbul rotası (mesafeye göre) · YAPILDI
- **Yapılan:** `server/src/services/gunPlanService.js` + `POST /api/plan/gunluk { gunSayisi 1–5, ilgiler[], erisilebilir }`. Hepsi sığıyorsa tek sıra + dinamik programlamayla dengeli bölme; sığmıyorsa günlük "tohum + en iyi oran" seçimi, sonra dengeli bölme ve dışarıda kalanları geri ekleme. Yanıt `gunler[]`, `disarida[]` ve birleşik `duraklar/bacaklar` (grup sayfası için). Arayüz: `/rota-sihirbazi`, plan sayfasında gün sekmeleri, yazdırma çıktısı gün gün. Testler `server/test/gunplan.test.js`.
- **Bilinen eksik:** gün sınırı bazen aynı semtin ortasına düşüyor (ör. Sultanahmet Camii 1. gün, Ayasofya 2. gün). Gün başına Adalar vapuru saat çizelgesine yansımıyor (bütçede sayılıyor).
- **İstek:** Kullanıcı gün sayısını (ve isteğe bağlı ilgi alanlarını, erişilebilirliği) seçer; sistem şehir geneli bir rota üretir.
- **Altyapı hazır:** `server/src/services/optimizer.js` (sıralama, yaka cezası), `planService.js` (yürüme bölümleri, Valhalla, süreler).
- **Yapılacak:**
  - Mekanları yakaya ve mesafeye göre **günlere kümele**: günlük bütçe yaklaşık 7 saat (ziyaret + yürüme + toplu taşıma), aynı gün içinde mümkünse tek yaka.
  - Her günü ayrıca sırala.
  - Uç: `POST /api/plan { gunSayisi, ilgiler, erisilebilir }` (ya da yeni bir uç). Yanıtta `gunler[]`.
  - Arayüz: "Rota sihirbazı" ekranı ve plan sayfasında gün sekmeleri; yazdırma çıktısı gün gün.
- **Not:** Şu an plan tek gün olarak hesaplanıyor; "günlere bölme" zaten açık iş listesindeydi.

### 5.2 Kullanıcı yorumu ve fotoğrafı · YAPILDI
- **Yapılan:** `yorumRepo` (koleksiyon `yorumlar`), `server/src/routes/yorum.js`: `GET/POST /api/mekanlar/:id/yorumlar`, `POST /api/yorumlar/:id/sikayet` (3 şikâyette yayından kalkar), saatte 5 yorum sınırı, bal küpü alanı, e-posta/telefon engeli. Admin → Yorumlar sekmesi (onayla, reddet, sil; yorumla gelen fotoğraf birlikte onaylanır). Mekan sayfasında ortalama puan, yorum listesi ve form. Testler `server/test/yorum.test.js`.
- **Fotoğraf altyapısı var:** `POST /api/fotograflar`, moderasyon, "Kapak yap". "Fotoğrafları oradan çekmek" = onaylı ziyaretçi fotoğrafını kapak yapmak (admin → Fotoğraflar).
- **Yorum sistemi yok** (bildirim türü "yorum" var ama ayrı bir yorum ve puan özelliği yok). Yapılacak:
  - `yorumRepo`: puan 1–5, metin, rumuz, isteğe bağlı fotoğraf.
  - Admin onayı.
  - Mekan sayfasında yorum listesi ve ortalama puan.
  - Hız sınırı ve kötüye kullanım bildirimi.

### 5.3 Kültür Yolu Festivali "lezzet noktaları" · YAPILDI (6 semtle sınırlı)
- **Yapılan:** `scripts/lezzet-noktalari.js` → `server/src/data/lezzetNoktalari.js`. Festival listesindeki 235 işletmeden yalnızca 6 demo semtinde kalan 55'i alındı (Sultanahmet 34, Kadıköy 14, Balat 5, Kuzguncuk 1, Burgazada 1; Üsküdar 0). Yalnızca ad + adres; koordinat yerel Photon (OSM) ile; adresteki ilçe semtle uyuşmuyorsa elendi. Hepsi `dogrulandi: false`, kaynak bağlantılı. Mekan türü `lezzet`.
- **Arayüz:** semt sayfasında "Lezzet noktaları" filtresi ("Hepsi" kültür mekanlarını gösterir), haritada ayrı renk, Keşfet'te yalnızca "Lezzet" seçilirse, mekan sayfasında adres. Rota sihirbazında "Öğle yemeği molası" (varsayılan açık): günün ortasına 700 m içindeki bir lezzet noktası eklenir, gün bütçesinden 1 saat düşülür.
- **Not:** Site `robots.txt` genel taramaya izin veriyor (yalnızca GPTBot engelli); kullanım şartları sayfası yok, altbilgide "Tüm hakları saklıdır". Kullanıcı kararıyla listenin yalnızca küçük bir bölümü alındı. Festival düzenleyicisinden yazılı izin hâlâ önerilir.
- **Kaynak:** https://kulturyolufestivali.com/lezzet-noktasi/istanbul
- **Önce kontrol et:** sitenin kullanım şartları ve `robots.txt`. İçerik metinleri telifli olabilir.
  - Yalnızca olgusal bilgileri al: ad, adres, konum, mutfak türü.
  - Kaynağa bağlantı ver.
  - Açıklama metinlerini kopyalama; kendin yaz.
  - Mümkünse festival düzenleyicisinden izin al.
- **Uygulama:**
  - Tek seferlik içe aktarma betiği (`scripts/lezzet-noktalari.js`) → `server/src/data/lezzetNoktalari.js`.
  - Mekan türü `lezzet` (ya da `yemek`).
  - Adresleri koordinata çevir: yerelde Photon; canlıda Nominatim değil, betik aşamasında yapılmalı.
  - "Doğrulanacak" etiketi.
  - Keşfet ve harita katmanlarına ekle.

### 5.4 Yol üstünde konum ekleme
- **İstek:** Plan veya rota üzerinde kullanıcının kendi durağını (adres ya da haritada tıklanan nokta) eklemesi.
- **Yapılacak:**
  - Plan sayfasında "Durak ekle": haritaya tıklama ya da adres arama ile nokta ekleme.
  - Plan yeniden optimize edilir (ya da sabit sırada araya eklenir).
- **Adres arama:** Photon yalnızca yerelde çalışıyor. Canlı için seçenekler:
  - Photon'u bir sunucuya taşımak;
  - ya da Nominatim (saniyede 1 istek, kendi User-Agent'ı, önbellek zorunlu).
  - Haritaya tıklayarak ekleme dış servis gerektirmez; bununla başlamak önerilir.

### 5.5 NVIDIA'nın ücretsiz modelleri (API)
- **NVIDIA API Catalog (build.nvidia.com):** OpenAI uyumlu uç noktası `https://integrate.api.nvidia.com/v1`, anahtar `nvapi-…`.
  - Hangi modellerin ücretsiz olduğu, kotalar ve model adları uygulama öncesi build.nvidia.com'dan **doğrulanmalı**.
- **Mevcut durum:** Admin → Ayarlar'da AI sağlayıcı, model ve anahtar alanı var (henüz kullanılmıyor). Sağlayıcı listesine `nvidia` eklenecek.
  - **Öneri:** anahtarı veritabanında değil Vercel ortam değişkeninde tut (`NVIDIA_API_KEY`). Admin panelinde yalnızca model seçimi olsun.
- **Kullanım fikirleri:** 5.1 rotasına doğal dilde gün özetleri; "Bu rotada ne yemeli?"; Keşfet için kısa öneriler; erişilebilirlik sorularına yanıt.
- **Kurallar:**
  - Model çıktısı doğrulanmamış bilgi üretmesin: yalnızca mevcut mekan verisini kullanacak şekilde istem kur.
  - Sunucu tarafında çağır; zaman aşımı ve hız sınırı koy.
  - Hata olursa yapay zekâsız devam et.

### 5.6 İstanbul müzeleri ve aktif sergiler · KISMEN YAPILDI
- **Yapılan:** `server/src/data/sergiler.js`: 7 kurumdan 13 güncel sergi (İstanbul Modern, Pera, Salt Beyoğlu/Galata, Yapı Kredi Kültür Sanat, Sakıp Sabancı, Meşher, Borusan Contemporary), resmî sitelerden elle, son kontrol 14 Kasım 2026. Bitişi geçen sergi takvimden kendiliğinden düşer. Ücret/erişim bilinmiyorsa `null` ("bilgi yok"). Bu sitede kayıt alınmaz; "Kurumun sayfasına git".
- **Festival arşivi:** `scripts/festival-arsivi.js` → `server/src/data/festivalArsivi.js`: İstanbul Kültür Yolu Festivali 2026 programı (105 etkinlik, `arsiv: true`), takvim sayfasında açılır "Geçmiş" bölümünde; `GET /api/etkinlikler/arsiv`.
- **Kalan:** Arter (site içeriği tarayıcıda yüklüyor, elle eklenmeli); Vikipedi müze listesinden müzelerin mekan olarak eklenmesi; 4 Aralık öncesi sergileri yeniden kontrol (Yapı Kredi sergisi 29 Kasım'da bitiyor).
- **Kaynak (müzeler):** https://tr.wikipedia.org/wiki/İstanbul'daki_müzeler_listesi
  - Vikipedi metni CC BY-SA 4.0 lisanslı. Yalnızca olgusal alanları al: ad, ilçe, tür, resmi site. Açıklamaları kendin yaz.
  - Koordinat ve resmi site için Vikiveri'yi (Q kimlikleri, CC0) kullan. Listedeki bağlantılardan Q kimliğine ulaşılır.
  - Mevcut 31 mekanla çakışanları (ör. Topkapı, Ayasofya) yeni kayıt açmadan birleştir.
- **Kaynak (sergiler):** her müzenin kendi resmi sitesi.
  - Önce her sitenin `robots.txt` dosyasını ve kullanım şartlarını kontrol et. Sergi tanıtım metinlerini ve görsellerini izinsiz kopyalama.
  - Yalnızca şunları al: sergi adı, başlangıç ve bitiş tarihi, müze, kaynak bağlantısı. Kısa açıklamayı kendin yaz.
  - Site yapıları birbirinden farklı. Büyük müzeler için müze başına ayrıştırıcı yaz, gerisini admin panelinden elle gir.
- **Uygulama:**
  - `scripts/muzeler.js` (Vikipedi + Vikiveri) → `server/src/data/muzeler.js`. Mekan türü `muze`.
  - `scripts/sergiler.js` → sergi verisi (`sergiRepo`). Her kayıtta "son kontrol" tarihi ve kaynak bağlantısı olsun.
  - Admin panelinde sergi ekleme ve düzenleme.
  - Süresi geçen sergiler otomatik gizlensin.
  - Mekan sayfasında "Şu an sergide" bölümü; Keşfet'e sergi kartları.
  - `TOHUM_SURUMU` artırılmalı.
- **Not:** Sergiler sık değişir. Başvuru tarihinden (4 Aralık) hemen önce bir kez daha güncelle; doğrulanmamış kayıtlar "Doğrulanacak" etiketli kalsın.

### 5.7 Vikisöz'den şiir (şiir katmanını genişletme)
- **Kaynak:** https://tr.wikiquote.org (Vikisöz). Sayfalar CC BY-SA lisanslı, ama alıntılanan şiirin hakkı şairde kalır.
- **Telif kuralı (FSEK, ölümden sonra 70 yıl):**
  - 1955 ve öncesinde ölen şairlerin şiirlerinde tam metin gösterilebilir. Örnek: Yunus Emre, Karacaoğlan, Nedim, Namık Kemal, Tevfik Fikret, Ahmet Haşim, Mehmet Akif, Orhan Veli (1950).
  - Telifi sürenlerde tam metin gösterilmez (mevcut kural). Örnek: Yahya Kemal (2028 sonuna kadar), Nazım Hikmet (2033'e kadar), Necip Fazıl, Attila İlhan, Can Yücel. Cahit Sıtkı Tarancı'nın telifi 1 Ocak 2027'de düşer; başvuru tarihinde hâlâ korumalıdır.
- **Doğrulama:** Vikisöz'de şiirler eksik ya da hatalı olabilir. Metni oradan bul, basılı baskıyla karşılaştır. Kontrol edilene kadar "Doğrulanacak" etiketi.
- **Uygulama:**
  - `scripts/siirler.js`: MediaWiki API (`tr.wikiquote.org/w/api.php`) ile betik aşamasında tek seferlik çekme. Kendine ait User-Agent, yavaş istek. Canlı site Vikisöz'e istek atmaz.
  - Her şiirde: şair, ölüm yılı, kaynak bağlantısı (Vikisöz sayfası), basılı kaynak, doğrulama durumu.
  - İstanbul ve semt şiirlerini elle seç, semte ya da durağa eşle. Aday: Nedim (Sadabad), Orhan Veli'nin İstanbul şiirleri.
  - `TOHUM_SURUMU` artırılmalı.

### 5.8 Aşağı kaydırınca sağa asılı menü · YAPILDI
- **Yapılan:** `hooks/useKaydirma.js`; 160 px'ten sonra üst başlık yapışkanlığı bırakır, sağ kenarda dikey ikon menüsü belirir (etiketler üzerine gelince/odakta, erişilebilir mod, tema, başa dön). Dar ekranda sağ altta menü düğmesiyle açılır. `prefers-reduced-motion`'da animasyon yok. Ekran görüntüsüyle görsel kontrol yapılmadı (pencere gizliydi); yerleşim ölçümle doğrulandı.
- **İstek:** Sayfa aşağı kaydırılınca menü üstten kalkıp ekranın sağ kenarına asılı (dikey, yüzen) bir menüye dönüşsün.
- **Mevcut durum:** `client/src/components/layout/Navbar.jsx`. Üstte `DemoBant`, altında `sticky top-0` başlık var. Başlıkta logo, 6 bağlantı (`LINKLER`), erişilebilir mod, tema ve "Keşfetmeye başla" düğmeleri bulunuyor.
- **Yapılacak:**
  - Kaydırma eşiği (ör. 120 px) için bir hook yaz (`hooks/useKaydirma.js`, `requestAnimationFrame` ile ve pasif dinleyiciyle).
  - Eşik geçilince üst başlık gizlensin. Sağ kenarda dikey ikon menüsü belirsin: `LINKLER` için Material Symbols ikonları, üzerine gelince etiket (tooltip), alta erişilebilir mod ve tema düğmeleri.
  - Geçişte `motion` kullanılsın. `prefers-reduced-motion` açıksa animasyon olmasın.
  - Mobilde (`< sm`) sağ menü yerine alt sekme çubuğu ya da sağ altta bir menü düğmesi kullanılsın. Harita sayfalarında harita kontrolleriyle çakışmaya dikkat edilmeli.
  - Erişilebilirlik: `nav aria-label`, odak sırası, en az 44 px dokunma alanı, etkin bağlantıda `aria-current`.
- **Not:** Tasarım dosyasında (`tasarim/`) bu menü yok; renkler ve biçimler mevcut tokenlarla uyarlanacak.

### 5.9 Türkçe seslendirme reposu
- **İstek:** Sesli rehber için kullanıcının vereceği Türkçe bir seslendirme (TTS) reposu kullanılacak. **Repo bağlantısı henüz verilmedi.**
- **Mevcut durum:** Sesli rehber tarayıcının konuşma sentezini kullanıyor; ses kalitesi cihaza göre değişiyor, bazı cihazlarda Türkçe ses yok.
- **Önce kontrol et:**
  - Kodun ve model ağırlıklarının lisansı (ticari ya da kamu destekli projede kullanım, atıf şartı). Ses verisi bir kişinin sesinden üretildiyse o kişinin izni.
  - Donanım ihtiyacı (GPU gerekiyor mu, CPU'da bir paragraf kaç saniye sürüyor).
- **Uygulama önerisi:**
  - Vercel sunucusuz fonksiyonunda model çalıştırılamaz. Sesler betik aşamasında yerelde üretilsin: `scripts/seslendir.js` → durak ve rota metinleri için MP3/OGG dosyaları.
  - Dosyalar statik olarak (`client/public/ses/`) ya da çok yer tutarsa Vercel Blob'da yayınlansın.
  - Metin değişince ses yeniden üretilsin (metnin özetini dosya adına koy).
  - Ses dosyası yoksa tarayıcının konuşma sentezine geri dönülsün.
  - Kullanıcının kendi eklediği durak gibi anlık metinler için şimdilik tarayıcı sentezi kalsın.

## 6. Bu sohbette konuşulan, hâlâ açık işler
- **Canlıya taşıma:**
  - Valhalla ve PMTiles bir VPS/CDN'e taşınmadıkça canlıda kişisel planlar yaklaşık çizgi, harita OpenFreeMap. (Hazır rotalar gerçek güzergâhla görünür.)
  - Photon adres araması uygulamaya bağlanmadı.
- **Gerçek veri doğrulama (başvuru öncesi):**
  - Örnek atölyeleri gerçek ustalarla (izinli) değiştir.
  - Dizi çekim yerleri, toplanma alanları (İBB/AFAD verisi) ve durak koordinatları (İBB açık veri) doğrulanmalı.
  - Orhan Veli şiir metni basılı baskıdan kontrol edilmeli.
- **Dün-bugün:** kamu malı arşiv fotoğrafları eklenmedi.
- **Grup sayfası:** kişisel planın güzergâh çizgisini göstermiyor.
- **Ana sayfa semt kartları:** ikonlu; isterse semt fotoğrafı eklenebilir.
- **Tasarım:** Claude Design yalnızca ana sayfa, Keşfet ve Plan'ı kapsıyordu. Diğer ekranlar tokenlarla uyarlandı; isterse tasarlanıp uygulanacak. "Büyük yazı" düğmesi tasarım gereği başlıktan kaldırıldı (tercih kodda duruyor).
- **Fotoğraf depolama:** fotoğraflar Postgres'te; Neon ücretsiz katman 1 GB. Çok artarsa Vercel Blob'a geçilmeli.
- **Uzman e-postası:** uzmana anahtar iletmek elle yapılıyor (e-posta servisi yok).
- **Küçük iyileştirme:** Vercel'de Vite derlemesi iki kez çalışıyor (kök `package.json`'daki `build` / `vercel-build` betikleri + `vercel.json` `buildCommand`). Betiklerden biri kaldırılabilir; yaklaşık 12 saniye kazanç.
- **Güvenlik:** `SESSION_SECRET` değeri eski bir oturumun araç kayıtlarında göründü; isterse Vercel'den yenilenmeli (oturumlar sıfırlanır, başka etkisi yok).

## 7. Değişmeyen kurallar
- Doğrulanmamış veri "Doğrulanacak" etiketiyle görünür; demo göstergeler "DEMO VERİSİ" etiketlidir. Başvuruda gerçek veri gibi sunulmamalı.
- **Telif:** korumalı şiirlerin tam metni gösterilmez. Görseller yalnızca özgür lisanslı ya da izinli kullanılır; yazar ve lisans gösterilir. Harita atfı "© OpenStreetMap katkıcıları" zorunlu.
- **Gizlilik:** kullanıcı konumu yalnızca adminde görünür; fotoğraflardan EXIF/GPS silinir; grup iletişim bilgisi yalnızca grubu açana görünür.
- Yeni içerik koda eklenince `server/src/repositories/pg.js` içindeki `TOHUM_SURUMU` artırılmalı. Var olan veritabanına yalnızca eksik alanlar eklenir.
