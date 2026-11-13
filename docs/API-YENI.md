# Yeni API uçları — fotoğraf, konumlu bildirim, yazdırma, uzmanlar

Hepsi `/api` altında; hem bellek hem Postgres arka ucunda çalışır.

Kısaltmalar:
- 🔓 herkese açık
- 🔑 admin oturumu (`p404_admin` çerezi)
- 🧑‍🎨 uzman oturumu (`p404_uzman` çerezi)

## Fotoğraflar

### 🔓 `POST /api/fotograflar` — fotoğraf yükle (saatte 10)
- Yalnızca JPEG, en fazla 1,5 MB. İstemci görseli tarayıcıda yaklaşık 1600 px'e küçültüp JPEG'e çevirmeli.
- Sunucu EXIF/XMP ve yorum bölümlerini (GPS dahil) siler. Fotoğraf `bekliyor` durumunda başlar.
- Bu uçta gövde sınırı 3 MB'dır.

```json
{ "mekanId": "kuzguncuk-bostani", "aciklama": "Hasat günü", "ad": "Ece",
  "dosya": "data:image/jpeg;base64,...", "izin": true,
  "konum": { "lat": 41.0348, "lon": 29.0318, "dogruluk": 12 } }
```
- `mekanId` ve `konum` isteğe bağlı. Konum İstanbul sınırları dışındaysa 400 döner. Konum yalnızca adminde görünür.
- Yanıt: `201 { "id": "foto-…", "durum": "bekliyor" }`

### 🔓 `GET /api/fotograflar/:id/dosya`
- Onaylıysa JPEG dosyası döner (`Cache-Control: public`).
- Onaysızsa 404 döner; admin oturumuyla görülebilir (`private, no-store`).

### 🔓 `GET /api/mekanlar/:id` (değişti)
Yanıta şu alanlar eklendi:
- `fotograflar: [{ id, mekanId, aciklama, ad, tarih, url }]`: yalnızca onaylılar, konumsuz.
- `mekan.gorsel`: kapak görseli. Wikimedia'dan geliyorsa `{ tur:'wikimedia', url, yazar, lisans, lisansUrl, kaynakUrl, dosya }`, ziyaretçi yüklemesinden seçildiyse `{ tur:'yukleme', fotoId, url, yazar, lisans }`. Görselde **yazar ve lisans mutlaka gösterilmeli.**
- `mekan.detay: { metin, ipucu }`: ayrıntılı açıklama.
- `bildirimler` artık konum alanı içermiyor.

### 🔑 Admin
| Uç | Ne yapar |
|---|---|
| `GET /api/admin/fotograflar?durum=bekliyor` | Liste. `konum` ve `url` dahil |
| `PATCH /api/admin/fotograflar/:id` `{ durum: 'onaylandi' \| 'reddedildi' \| 'bekliyor' }` | Moderasyon |
| `DELETE /api/admin/fotograflar/:id` | Siler |
| `POST /api/admin/fotograflar/:id/kapak` | Fotoğrafı onaylar ve mekanın kapağı yapar (`gorsel.tur = 'yukleme'`; Wikimedia yenilemesi bunu ezmez) |
| `POST /api/admin/fotograflar/yenile` | "Fotoğrafları yenile": Wikipedia/Commons'tan özgür lisanslı görselleri toplu çeker (yaklaşık 2 sn). Yanıt: `{ ozet: { guncellendi, atlandi, bulunamadi, hata }, rapor: [{ mekanId, durum, neden }] }` |

Yenileme kuralları:
- Yalnızca özgür lisanslar kabul edilir: CC, CC0, kamu malı, FAL.
- Aynı maddeyi paylaşan mekanlar atlanır.
- `gorselMaddesi: null` olan mekanlar atlanır; bunlar kaynak maddesi kişi ya da semt hakkında olanlardır (Barış Manço Evi, Kadıköy Çarşısı…).
- Elle seçilmiş kapaklar korunur.

## Konumlu bildirim

### 🔓 `POST /api/bildirimler` (değişti)
```json
{ "tur": "erisilebilirlik", "metin": "Kaldırım rampası kırık.",
  "konum": { "lat": 41.0368, "lon": 29.0318, "dogruluk": 15 },
  "fotoIdler": ["foto-…"] }
```
- `mekanId` yoksa `konum` zorunlu (sahadan bildirim). Sunucu en yakın mekanı `enYakinMekan` olarak not eder (yalnızca adminde).
- `fotoIdler`: önce `/api/fotograflar` ile yüklenmiş, `bekliyor` durumundaki en fazla 3 fotoğraf.
- `GET /api/admin/bildirimler` yanıtında `konum`, `enYakinMekan` ve `fotoIdler` görünür.

## Yazdırma

### 🔓 `GET /api/rotalar/:id/yazdir?erisilebilir=1` · `GET /api/plan/:id/yazdir`
Yazdırılabilir sayfa için tek yanıt:
- `duraklar[]`: her durakta `detay { metin, ipucu }`, `anlatim` (yalnızca rota), `erisilebilirlik`, `engeller`, `enYakinDurak`, `enYakinToplanma`.
- Rota için: `mesafeM`, `sureDk`, `zorluk`, `egimOzeti`, `merdivenM`. Plan için: `toplam` ve `bacaklar`.
- `sadeGeometri`: SVG çizimi için en fazla 300 noktaya indirilmiş `LineString` / `MultiLineString`, `[lon, lat]` sırasıyla.
- `sinirlar`: `[minLon, minLat, maxLon, maxLat]` (SVG ölçeklemesi için).

## Uzmanlar ve etkinlik yönetimi

### 🔓 `POST /api/uzman/basvuru` (saatte 3)
```json
{ "ad": "Ayşe Usta", "uzmanlik": "cini", "atolyeAdi": "Lale Çini Atölyesi", "mekanId": "atolye-cini-uskudar",
  "iletisim": "ayse@example.com", "aciklama": "Yirmi yıldır İznik çinisi üzerine çalışıyorum…", "kurallarKabul": true }
```
- `uzmanlik`: zanaat anahtarlarından biri (ebru, bakircilik, sedef, ahsap, cini, hat, seramik) ya da `rehber` / `diger`.
- Yanıt: `201 { id, durum: 'basvuru' }`

### 🔑 Admin
| Uç | Ne yapar |
|---|---|
| `GET /api/admin/uzmanlar` | Başvurular ve uzmanlar |
| `POST /api/admin/uzmanlar/:id/onayla` | `{ uzman, erisimAnahtari }`. **Anahtar yalnızca bu yanıtta bir kez gösterilir**; admin uzmana kendisi iletir. Yeniden çağrılırsa yeni anahtar üretilir, eskisi geçersiz olur |
| `PATCH /api/admin/uzmanlar/:id` `{ durum: 'onayli' \| 'askida' \| 'reddedildi' }` | Askıya alınan uzmanın oturumu hemen düşer |

### Uzman oturumu
- 🔓 `POST /api/uzman/giris` `{ anahtar }` → `p404_uzman` çerezi (12 saat). Hız sınırı: 15 dakikada 10 deneme. Canlıda `SESSION_SECRET` yoksa 503.
- 🔓 `POST /api/uzman/cikis` · `GET /api/uzman/oturum` → `{ girisYapildi }`
- 🧑‍🎨 `GET /api/uzman/ben`

### 🧑‍🎨 Uzman etkinlikleri
| Uç | Ne yapar |
|---|---|
| `GET /api/uzman/etkinlikler` | Yalnızca kendi etkinlikleri |
| `POST /api/uzman/etkinlikler` | Yeni etkinlik (gövde aşağıda) |
| `PUT /api/uzman/etkinlikler/:id` | Kısmi güncelleme; yalnızca kendi etkinliği, başkasınınkine 404 |
| `POST /api/uzman/etkinlikler/:id/iptal` | İptal eder |
| `GET /api/uzman/katilimlar` | Kendi etkinliklerine gelen kayıtlar (katılımcı iletişim bilgisi dahil) |

```json
{ "baslik": "Lale motifli çini boyama", "tur": "atolye",
  "aciklama": "Başlangıç seviyesi; malzemeler dahil…", "baslangic": "2026-12-06T14:00:00+03:00",
  "sureDk": 150, "kapasite": 8, "ucret": "750 TL",
  "mekanId": "atolye-cini-uskudar", "erisilebilir": true }
```
- `tur`: atolye, yuruyus, konser, edebiyat, soylesi, sergi, tiyatro, festival
- `baslangic`: gelecekte ve en fazla 180 gün sonra
- `sureDk`: 15–720 · `kapasite`: 1–50
- Mekan yerine `konumAd` ("Balat İskelesi önü") verilebilir. `ucret` boşsa ya da "Ücretsiz" ise `ucretsiz: true` olur.

## Etkinlik ayrıntısı ve kayıt
- 🔓 `GET /api/etkinlikler`: iptal edilenler listede yok. Her öğede `uzman: { id, ad, uzmanlik, atolyeAdi }` var; iletişim bilgisi yok.
- 🔓 `GET /api/etkinlikler/:id` → `{ etkinlik, mekan, uzman, kontenjan: { toplam, dolu, kalan }, kayitEngeli }`. `kayitEngeli` şunlardan biri ya da null: "Kontenjan doldu", "Bu etkinlik iptal edildi", "Bu etkinlik sona erdi".
- 🔓 `POST /api/talepler` artık `etkinlikId` de kabul ediyor (`{ etkinlikId, ad, iletisim, kisi, erisilebilirlikIhtiyaci?, not? }`). Kontenjan, iptal edilmemiş taleplerin kişi toplamıyla hesaplanır; aşılırsa 409. Atölye deneyim talebi (`mekanId`) eskisi gibi çalışır.

## Göstergeler
`GET /api/admin/gostergeler` yanıtına yeni sayaçlar eklendi: `fotoYukleme`, `uzmanBasvuru`, `etkinlikKaydi` (gerçek ve demo).
