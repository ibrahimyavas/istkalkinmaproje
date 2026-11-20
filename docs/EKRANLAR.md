# Proje 404 — Ekran Envanteri (tasarım devri için)

Bu belge Claude Design gibi bir tasarım aracına verilmek üzere hazırlandı: her ekranın amacı, içerdiği veri, durumları ve etkileşimleri. Mevcut arayüz işlevsel bir iskelettir. Yeni tasarım geldiğinde **yalnızca görünüm bileşenleri** değişir; veri ve mantık şu katmanlarda durur ve korunur:

| Katman | Dosyalar | Tasarım değişince |
|---|---|---|
| API istemcisi | `client/src/services/api.js` | değişmez |
| Mantık kancaları | `client/src/hooks/` (`useKesfet`, `useApi`, `useSpeech`) | değişmez |
| Yerel kayıt | `client/src/lib/` (`yerel.js`, `pasaport.js`, `harita.js`) | değişmez |
| Tercihler | `client/src/context/Tercihler.jsx` (tema, büyük yazı, erişilebilir mod) | değişmez |
| Görünüm | `client/src/pages/`, `client/src/components/` | yeniden tasarlanır |
| Tokenlar | `client/src/index.css`, `client/tailwind.config.js`, `client/DESIGN.md` | yeni DESIGN.md'ye göre güncellenir |

**Her ekranda zorunlu olanlar:** açık ve koyu tema; 375 px mobil genişlik; en az 44 px dokunma hedefi; klavyeyle kullanım; durumun yalnızca renkle değil ikon ve metinle de anlatılması. "Doğrulanacak", "Örnek" ve "DEMO VERİSİ" etiketlerinin görünür kalması da zorunlu.

---

## Genel kabuk
- **Üst menü:** logo; Semtler, Vapur, Keşfet, Rota sihirbazı, Gruplar, Atölyeler, Etkinlikler, Pasaportum; erişilebilir mod anahtarı; tema; mobil menü. ("Büyük yazı" düğmesi başlıktan kaldırıldı, tercih kodda duruyor.)
- **Sağ menü rayı:** 160 px kaydırınca üst başlık bırakılır, sağ kenarda dikey ikon menüsü (bağlantılar, erişilebilir mod, tema, başa dön) belirir; dar ekranda sağ altta menü düğmesi.
- **Alt bilgi:** demo uyarısı, "© OpenStreetMap katkıcıları" atfı (zorunlu), Yönetim bağlantısı.

## 1. Ana sayfa `/`
- **Kahraman:** gün seçici (1–5) ve `/rota-sihirbazi?gun=N` bağlantısı; Ayasofya fotoğrafı ve künyesi.
- **Yakalar:** 9 semt kartı Avrupa, Anadolu ve Adalar yakalarına göre gruplu.
- **İstanbul atlası (`#atlas`):** MapLibre üzerinde İstanbul → yaka → 39 ilçe → mahalle inişi; 3B Boğaz görünümü, Bölgeler/Köprüler/Simgeler katmanları, ekmek kırıntısı, arama, yan panelde mekan listesi ve müzik önerisi. WebGL yoksa SVG yedeği.
- **Müzeler** (yatay şerit), **Sergiler** (kalan gün), **Harita ve takvim** (harita katmanları, yaklaşan etkinlikler).

## 2. Keşfet `/kesfet` ⭐ yeni
Tinder tarzı kart destesi.
- **Kart:** tür ikonu ya da görsel alanı, tür etiketi, semt, "Doğrulanacak" rozeti, ad, kısa açıklama, atölye süresi, erişilebilirlik özeti. Sürüklerken "GİDERİM" (sağ) ve "GEÇ" (sol) damgaları belirir.
- **Eylemler:** sağa/sola kaydırma (eşik 120 px); Geç (X), Geri al, Giderim (♥) düğmeleri; klavyede ← ve →.
- **Filtre paneli:** semt çipleri, tür çipleri. Erişilebilir mod açıkken merdivenli ve dik yokuşlu yerler gelmez.
- **Yan panel "Gideceğim yerler":** liste, öğeyi çıkarma, "Rotamı oluştur" (en az 2, en fazla 15 yer).
- **Durumlar:** yükleniyor, hata, deste bitti, seçim yok, rota hesaplanıyor.
- **Veri:** `useKesfet(filtre)` → `{ kartlar, siradaki, begenilenler, karar, geriAl, cikar, sifirla }`.

## 3. Kişisel rota `/plan/:id` ⭐ yeni
- **Başlık:** "N duraklı rotan hazır"; eylemler: Grup aç, Paylaş (Web Share ya da kopyala), Seçimlerimi düzenle.
- **4 özet kutusu:** yürüyüş mesafesi, yürüme süresi, ziyaret süresi, tahmini toplam.
- **Kaynak notu:** Valhalla ile hesaplandıysa bunu yazar; değilse "yaklaşık güzergâh" der.
- **Harita:** numaralı duraklar, yürüme bölümleri (MultiLineString), toplanma alanları.
- **Durak listesi:** aralarında bacak satırı. Yürüme bacağında mesafe ve dakika; toplu taşıma bacağında "Yaka değişiyor: vapur/Marmaray" ya da "Uzak: toplu taşıma önerilir" ile tarif bağlantısı. Her durakta ziyaret süresi, en yakın durak, toplanma alanı ve gerekiyorsa erişilebilirlik uyarısı.
- **Çok günlü plan** (rota sihirbazından): gün sekmeleri; her gün için ayrı yol tarifi bağlantıları (Google/Yandex/Apple Maps). Yazdır (`/plan/:id/yazdir`).

## 4. Gezinti grupları `/gruplar` ⭐ yeni
Başlık ve "Grup aç" eylemi, semt filtresi, grup kartları (tarih, rota, buluşma, katılımcı/kapasite, açan kişinin rumuzu, dil; Erişilebilir, Dolu ve Örnek rozetleri). Boş durumda "İlk grubu sen aç".

## 5. Grup aç `/gruplar/yeni?planId=|rotaId=` ⭐ yeni
- **Form:** rota seçimi (kendi planı ya da hazır rotalar), başlık, tarih-saat, kişi sınırı (2–30), dil (TR, EN, TR/EN), rumuz, açıklama, erişilebilir grup seçeneği, topluluk kuralları ve onay kutusu.
- **Başarı ekranı:** tek seferlik **yönetim anahtarı** (kopyala) ve grup sayfasına bağlantı.

## 6. Grup sayfası `/grup/:id` ⭐ yeni
- **Bilgiler:** başlık, rozetler, açıklama; 4 bilgi kutusu (ne zaman, buluşma noktası = rotanın ilk durağı, katılımcı sayısı, dil); rota haritası ve durak listesi; katılanların rumuzları.
- **Katıl paneli:** rumuz, isteğe bağlı iletişim bilgisi (yalnızca açan kişi görür), kural onayı. Katıldıysa "Gruptan ayrıl"; doluysa ya da iptal edildiyse nedenini yazar.
- **Açan kişinin paneli** (tarayıcıda anahtar varsa): katılımcılar ve iletişim bilgileri, "Grubu iptal et".
- **Grup sohbeti:** mesaj listesi (8 sn'de bir yenilenir), rumuz hatırlama, açan kişiye "Düzenleyen" rozeti.
- **Kısayollar:** Takvime ekle; rota için Google/Yandex/Apple Maps bağlantıları.
- **Diğer:** topluluk ve güvenlik kuralları kutusu, "Bu grubu bildir".

## 7. Semt `/semt/:id`
Başlık; rota kartları; mekan filtreleri (Hepsi, Atölyeler, Tarihi miras, Dizi/film/edebiyat) ile liste ve harita; semtin şairleri (şiir kartı); dün-bugün kaydırıcısı; müzik önerisi; etkinlikler; deprem toplanma alanları.

## 8. Hikâye rotası `/rota/:id`
- **Başlık ve eylemler:** erişilebilir mod anahtarı, "Birlikte yürüyelim: grup aç", sesli rehber.
- **Özet:** 3 kutu (mesafe, süre, zorluk), kaynak notu, yükseklik profili grafiği, harita.
- **Durak kartları:** anlatım, engeller, en yakın durak ve toplanma alanı, Dinle ve Yol tarifi düğmeleri. Erişilebilir modda atlanan duraklar soluk görünür.
- **Yol tarifi bağlantıları:** Yürüyüş/Toplu taşıma seçici + Google/Yandex/Apple Maps + Linki kopyala (erişilebilir modda atlanan duraklar hariç). Yazdır (`/rota/:id/yazdir`).

## 9. Mekan `/mekan/:id`
Tür ve doğrulama rozetleri, kaynak; erişilebilirlik ızgarası; ulaşım ve güvenlik kutusu; harita; (atölyeyse) deneyim talep formu; şiirler; etkinlikler; onaylanmış ziyaretçi bildirimleri ve bildirim formu.

Ayrıca: konuma göre müzik önerisi kartı (özel öneride "Biz size bunu öneriyoruz" rozeti, "Başka öner", YouTube Music / Spotify / Apple Music bağlantıları); yorumlar ve ortalama puan.

## 10. Atölyeler `/atolyeler` · 11. Etkinlikler `/etkinlikler`
Filtreli listeler (zanaat türü; semt ve ücretsiz). Erişilebilir moda göre süzülür. Etkinlik kartlarında "Takvime ekle" (Google Takvim / `.ics`). Etkinlikler sayfasında **Grup etkinlikleri ve sohbet** bölümü: yaklaşan grup yürüyüşleri, Sohbet, Takvime ekle, Google/Yandex Maps kısayolları ve canlı sohbet alanı. Etkinlik ayrıntısı `/etkinlik/:id`: kontenjan ve kayıt formu.

## 10a. Rota sihirbazı `/rota-sihirbazi?gun=N`
Gün sayısı (1–5), ilgi alanları ve erişilebilirlik seçimi → şehir geneli plan; sonuç plan sayfasında gün sekmeleriyle açılır, dışarıda kalan yerler listelenir.

## 10b. Vapur `/vapur` · `/vapur/:id?yon=gidis|donus`
4 Boğaz/Haliç hattı kartı; hat sayfasında iskele sırası, deniz hattı haritası, gidiş/dönüş seçici, Sol (İskele) / Sağ (Sancak) siluet kartları (Bugün ne?, Geçmişte ne?, Vapurdan nasıl tanırsın?, Sesli rehber, gezilebilirse mekan bağlantısı) ve müzik önerisi.

## 12. Pasaport `/pasaport` · 13. Damga `/damga/:kod`
Kodu elle girme alanı, semt rozetleri (2 damga = rozet), damga listesi. Damga ekranında damga animasyonu, "rozet kazandın" mesajı.

## 14. Yönetim `/admin`
Giriş ekranı; sekmeler: Etki göstergeleri (gerçek veri ile "Örnek görünüm / DEMO VERİSİ" ayrımı), Bildirimler (onay/ret), Atölye talepleri, **Gruplar (kaldır / yeniden yayınla)**, Fotoğraflar (onay, kapak yap, "Fotoğrafları yenile"), Yorumlar (onay, ret, sil), Uzmanlar (başvuru onayı, tek seferlik anahtar), İçerik (JSON düzenleyici), QR kodlar (yazdır), Ayarlar (yapay zekâ ve HERE anahtarları).

## 15. Diğer ekranlar
- **Sahadan bildirim `/bildir`:** konumlu bildirim formu, en fazla 3 fotoğraf.
- **Uzman `/uzman/*`:** başvuru formu, anahtarla giriş, uzman paneli (etkinlik ekleme/düzenleme/iptal, kayıtları görme).
- **Yazdırma `/rota/:id/yazdir`, `/plan/:id/yazdir`:** A4 çıktı, QR kod ve SVG rota çizimi.
- **Bulunamadı (404).**

---

## Bileşen sözlüğü
Yol tarifi bağlantıları (Yürüyüş/Toplu taşıma + Google/Yandex/Apple Maps + Linki kopyala) · Takvime ekle düğmesi · Grup sohbeti · Müzik öneri kartı · Kart · Etiket/rozet · Doğrulanacak rozeti · Birincil/ikincil düğme · Çip (seçilebilir filtre) · Anahtar (switch) · Form alanı (etiket + ipucu) · Harita (MapLibre) · Yükseklik grafiği · Şiir kartı · Dün-Bugün kaydırıcı · Etkinlik kartı · Mekan kartı · Grup kartı · Kaydırmalı kart destesi · Durak zaman çizelgesi · Bacak satırı (yürüme/toplu taşıma) · Özet kutusu (KPI) · Yükleniyor / Hata / Boş durumları.
