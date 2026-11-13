# Harita altyapısı (OpenStreetMap, yalnızca İstanbul)

Bu klasör projenin kendi harita altyapısını içerir. Hepsi Docker'da, bizim makinemizde çalışır:

| Servis | Görev | Port | Veri |
|---|---|---|---|
| **Valhalla** | Yürüme rotası, erişilebilir rota, yükseklik/eğim (`/route`, `/height`, `/trace_attributes`) | 8002 | `data/valhalla/istanbul.osm.pbf` + otomatik inen SRTM DEM |
| **Photon** | Adres arama ve ters kodlama, yalnızca İstanbul ili | 2322 | `data/photon/photon-istanbul.jsonl` |
| **martin** | PMTiles vektör karolarını XYZ olarak sunar (CORS açık) | 3000 | `data/tiles/istanbul.pmtiles` |
| **harita** (nginx) | Stil, font, sprite ve PMTiles dosyasını statik sunar (CORS açık) | 8080 | `harita-stili.json`, `data/harita/` |
| Postgres | Canlı yayında eklenecek | — | compose dosyasında yorum satırı |

Vercel Docker çalıştıramaz. Demo bu yüzden canlı Valhalla'ya bağlanmaz: rotalar yerelde
`scripts/build-routes.js` ile önceden hesaplanır ve GeoJSON olarak uygulamaya gömülür.
Harita karoları da tek bir `istanbul.pmtiles` dosyası olarak statik sunulur.

**Hazırlık bittikten sonra her şey tek komutla kalkar** (sonraki açılışlar ~15 sn):

```powershell
docker compose -f infra/docker-compose.yml up -d
```

| Uç nokta | Adres |
|---|---|
| Harita stili (uygulamada `VITE_HARITA_STIL`) | `http://localhost:8080/harita-stili.json` |
| Vektör karolar | `http://localhost:3000/istanbul/{z}/{x}/{y}` (TileJSON: `/istanbul`) |
| PMTiles dosyası (`pmtiles://` için, Range destekli) | `http://localhost:8080/istanbul.pmtiles` |
| Stil önizleme sayfası | `http://localhost:8080/onizleme.html#lat=41.03&lon=28.95&z=15` |
| Photon arama | `http://localhost:2322/api?q=Kuzguncuk%20Bostanı&lang=tr` |
| Photon ters kodlama | `http://localhost:2322/reverse?lat=41.0348&lon=29.0318&lang=tr` |
| Valhalla | `http://localhost:8002/route`, `/height`, `/trace_attributes` |

Haritada **"© OpenStreetMap katkıcıları"** atfı zorunludur (ODbL). Protomaps karoları da OSM verisidir.

## Gereksinimler (Windows)

- **Docker Desktop** çalışır durumda olmalı (WSL 2 arka ucu). Ayarlar → Resources'ta en az **4 GB bellek** ayırın; Valhalla karo derlemesi bellek ister.
- **Node 22.15+** (betikler yerleşik `fetch` ve `photon-istanbul.js` yerleşik zstd kullanır; Node 24 ile denendi).
- Komutlar **PowerShell** içinde, **proje kökünden** (`proje-404\`) çalıştırılır. `osmium` ve `pmtiles` için Windows kurulumu gerekmez; ikisi de Docker konteynerinde çalışır.

## İndirme boyutları (Kasım 2026'da ölçüldü)

Bu indirmeler otomatik yapılmaz; her adımda komutu siz çalıştırırsınız.

| Ne | Kaynak | Boyut |
|---|---|---|
| Türkiye OSM PBF | `download.geofabrik.de/europe/turkey-latest.osm.pbf` | **~653 MB** (kesimden sonra silinebilir) |
| İstanbul kesiti | osmium çıktısı | **~62 MB** |
| SRTM yükseklik karoları | Valhalla ilk açılışta kendisi indirir (AWS `elevation-tiles-prod`) | 7 karo, **~174 MB** disk |
| Valhalla karoları | İstanbul PBF'den derlenir (~3 dk, 8 çekirdek) | **~106 MB** klasör + **~106 MB** `valhalla_tiles.tar` |
| Photon Türkiye dökümü | `download1.graphhopper.com/public/europe/turkey/photon-dump-turkey-1.0-latest.jsonl.zst` | **~143 MB** (zst) |
| Photon İstanbul dökümü | `scripts/photon-istanbul.js` çıktısı (237 811 kayıt) | **~527 MB** düz JSONL; içe aktarım ~1,5 dk |
| İstanbul PMTiles | Protomaps günlük dünya derlemesinden (~139 GB) yalnızca İstanbul kesilir | **z15: ~76 MB**, z14: ~36 MB |
| Fontlar ve sprite | `protomaps.github.io/basemaps-assets` (Noto Sans, OFL; v4 light sprite) | **~8 MB** |
| Docker imajları | valhalla-scripted, photon-docker, martin, nginx, debian, go-pmtiles | toplam ~1,5 GB |

## Adım 1 — Türkiye PBF'sini indir (~653 MB)

```powershell
New-Item -ItemType Directory -Force infra\data\valhalla, infra\data\osm, infra\data\tiles | Out-Null
curl.exe -L -o infra\data\osm\turkey-latest.osm.pbf https://download.geofabrik.de/europe/turkey-latest.osm.pbf
```

## Adım 2 — İstanbul sınırına kes (`osmium extract`)

> **DNS notu:** Bazı Docker Desktop kurulumlarında konteyner içindeki DNS (192.168.65.7, UDP) yanıt vermiyor ve
> `apt-get` "Temporary failure resolving" hatası veriyor. Aşağıdaki komutta `--dns 1.1.1.1 --dns-option use-vc`
> DNS'i TCP üzerinden genel sunucuya yönlendirir. compose dosyası aynı ayarı `dns`/`dns_opt` ile içeriyor.

İstanbul il sınırını kapsayan kutu: **boylam 27.95–29.95, enlem 40.79–41.60** (Silivri'den Şile'ye, Adalar dahil).
Kutu, Tekirdağ ve Kocaeli sınırından küçük parçalar da içerir. Bu rota ve arama için zararsızdır.

```powershell
docker run --rm --dns 1.1.1.1 --dns-option use-vc -v "${PWD}\infra\data:/data" debian:bookworm-slim bash -c `
  "apt-get update -qq && apt-get install -y -qq osmium-tool >/dev/null && \
   osmium extract --bbox 27.95,40.79,29.95,41.60 --set-bounds --overwrite \
     -o /data/valhalla/istanbul.osm.pbf /data/osm/turkey-latest.osm.pbf && \
   osmium fileinfo /data/valhalla/istanbul.osm.pbf"
```

İl sınırına tam kesmek isterseniz OSM'deki İstanbul ili sınırını (`admin_level=4` relation) GeoJSON olarak indirip
`--bbox ...` yerine `--polygon /data/osm/istanbul.geojson` verin.

Kesimden sonra `infra\data\osm\turkey-latest.osm.pbf` silinebilir.

## Adım 3 — Valhalla'yı başlat

```powershell
docker compose -f infra/docker-compose.yml up -d valhalla
docker compose -f infra/docker-compose.yml logs -f valhalla   # ilerlemeyi izlemek için
```

İlk açılışta konteyner sırasıyla şunları yapar: SRTM karolarını `data/valhalla/elevation_data/` altına indirir,
yönetim bölgesi ve saat dilimi veritabanlarını kurar, rota karolarını derler (birkaç dakika). Sonraki açılışlar
saniyeler sürer (`use_tiles_ignore_pbf=True`).

Hazır olduğunu doğrulama:

```powershell
curl.exe http://localhost:8002/status
# Fener Rum Lisesi'nin yüksekliği (sayı dönmeli, null değil):
Invoke-RestMethod -Method Post http://localhost:8002/height -ContentType "application/json" `
  -Body '{"shape":[{"lat":41.02928,"lon":28.94939}]}'
```

`/height` `null` dönüyorsa DEM inmemiştir. `force_rebuild=True` ve `build_elevation=Force` ile bir kez yeniden başlatın,
sonra eski değerlere geri alın.

Docker Desktop'ta karo derlemesi "Killed" ile biterse compose dosyasında `server_threads=2` yapın veya Docker'a daha çok bellek verin.

## Adım 4 — İstanbul PMTiles üret (`pmtiles extract`)

Protomaps her gün dünya haritasını tek bir PMTiles dosyası olarak yayınlar. Eski derlemeler bir süre sonra silinir;
güncel adı şu listeden alın (sondaki `key` alanı, örn. `20261113.pmtiles`):

```powershell
(Invoke-RestMethod https://build-metadata.protomaps.dev/builds.json)[-1].key
```

`pmtiles extract` tüm dosyayı indirmez. HTTP aralık istekleriyle yalnızca İstanbul'un karolarını çeker.
Önce `--dry-run` ile boyutu görün, sonra asıl komutu çalıştırın:

```powershell
$BUILD = "20261113.pmtiles"   # yukarıdaki listeden en güncel olanı yazın
docker run --rm --dns 1.1.1.1 --dns-option use-vc -v "${PWD}\infra\data\tiles:/out" protomaps/go-pmtiles extract `
  "https://build.protomaps.com/$BUILD" /out/istanbul.pmtiles `
  --bbox=27.95,40.79,29.95,41.60 --maxzoom=15 --dry-run

docker run --rm --dns 1.1.1.1 --dns-option use-vc -v "${PWD}\infra\data\tiles:/out" protomaps/go-pmtiles extract `
  "https://build.protomaps.com/$BUILD" /out/istanbul.pmtiles `
  --bbox=27.95,40.79,29.95,41.60 --maxzoom=15
```

20261113 derlemesiyle ölçüm: z15 → 76 MB (13 606 karo), z14 → 36 MB. Protomaps derlemelerinin azami zoom'u 15'tir;
MapLibre daha yakın zoomlarda z15 karolarını büyüterek çizer. Daha küçük dosya gerekirse `--maxzoom=14` ya da
demo semtlerine daraltılmış bir kutu (örn. `--bbox=28.90,40.98,29.10,41.12`) kullanın.

Bu dosya iki yoldan kullanılabilir:
- **Docker'da (bu compose):** `martin` dosyayı XYZ karolara çevirir; `harita-stili.json` bu adresi kullanır. İstemcide ek bir şey gerekmez.
- **Statik (Vercel demosu):** dosya `client/public/` altına konur ve stilde kaynak `pmtiles:///istanbul.pmtiles`
  olarak verilir; istemcide `pmtiles` paketinin `Protocol`'ü `maplibregl.addProtocol('pmtiles', …)` ile kaydedilir.

## Adım 5 — Harita stilini üret (`infra/harita-stili.json`)

Stil Protomaps'in resmi katman tanımlarından (`@protomaps/basemaps` 5.7.2, BSD-3) üretilir ve uygulamanın paletine
çevrilir: kâğıt zemin `#F7F4EE`, İznik mavisi `#174C9E` vurgu (deniz etiketleri ve bazı ilgi noktaları), sade
Positron benzeri yollar. Etiketler `name:tr`, yoksa `name` alanından okunur (Protomaps'in kendi `tr` ayarı
`name:en`'e düştüğü için bu ayar betikte değiştirilir). Atıf: "© OpenStreetMap katkıcıları · Protomaps".

```powershell
npm install --prefix scripts/.harita-arac --no-save --no-package-lock @protomaps/basemaps@5.7.2
node scripts/build-harita-stili.js
```

Betik stili yazar ve stilin kullandığı Noto Sans glyph aralıklarını (Latin/Türkçe, Yunanca, Kiril, Ermenice,
İbranice, Arapça) ve sprite'ı `infra/data/harita/` altına indirir (~8 MB). Böylece harita, karolar dahil, internet
olmadan açılır. Başka bir sunucu için: `--taban https://ornek.com/harita --karo "https://ornek.com/karo/{z}/{x}/{y}"`.
Paleti değiştirmek için betikteki `PALET` nesnesini düzenleyip yeniden çalıştırın.

## Adım 6 — Photon için yalnızca İstanbul dökümü

Photon'un hazır indeksleri ülke düzeyindedir. Türkiye dökümü indirilir ve `address.state = İstanbul` olan kayıtlara
süzülür (il sınırına göre; bbox'a göre değil, Kocaeli/Tekirdağ girmez):

```powershell
New-Item -ItemType Directory -Force infradataphoton | Out-Null
curl.exe -L -o infradataphotonphoton-dump-turkey-1.0-latest.jsonl.zst https://download1.graphhopper.com/public/europe/turkey/photon-dump-turkey-1.0-latest.jsonl.zst
node scripts/photon-istanbul.js
```

`photon` servisi ilk açılışta bu dosyayı içe aktarır (`infra/photon/baslat.sh`, ~1,5 dk), indeksi `photon_data`
birimine yazar ve sonraki açılışlarda doğrudan sunar. Veriyi yenilemek için: dökümü yeniden indirip süzün, sonra
`docker compose -f infra/docker-compose.yml down -v` (birimi siler) ve `up -d`.

```powershell
curl.exe "http://localhost:2322/api?q=Kuzguncuk%20Bostan%C4%B1&lang=tr&limit=3"
curl.exe "http://localhost:2322/reverse?lat=41.0348&lon=29.0318&lang=tr"
```

## Adım 7 — Hepsini başlat

```powershell
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
```

## Adım 8 — Demo rotalarını derle

```powershell
node scripts/build-routes.js --in scripts/route-inputs.example.json --out scripts/out
```

Betik her rota için iki profil hesaplar (normal ve erişilebilir), `/height` ile eğim profili çıkarır,
`/trace_attributes` ile rotadaki merdiven uzunluğunu ölçer ve zorluk etiketi verir. Valhalla'ya ulaşamazsa veya
DEM yoksa hata verip çıkar; sahte veri üretmez. Ayrıntılar: `scripts/build-routes.js` dosyasının başı.

Yürüme rotalarında vapur kapalıdır (`use_ferry: 0` ve durak eşlemede `exclude_ferry`). Aksi halde iskele
durakları vapur hattına oturur ve Valhalla yürüme rotasına Haliç vapurunu ekler.

Bilinen OSM eksiği (Kasım 2026): Fener İskelesi'nden çıkan sahil parkı yürüyüş yolu caddeye iskelenin yanında
bağlanmıyor. Bu yüzden İskele → Patrikhane bacağı kuş uçuşu ~210 m iken ~770 m çıkıyor. OSM'de bağlantı ya da
geçit eklenirse rota kendiliğinden kısalır.

Farklı bir Valhalla adresi için `--valhalla http://host:8002` veya `VALHALLA_URL` ortam değişkeni.

## Erişilebilir profil hakkında bilinmesi gerekenler

- `step_penalty` merdiveni **yasaklamaz**, her merdiven kenarına saniye cinsinden ceza ekler (betikte 3600 s).
  Başka yol yoksa rota yine merdivenden geçer. Bu yüzden betik her rotanın `merdivenM` değerini ayrıca raporlar.
- `use_hills` (0–1) eğimli kenarlara ceza ekler. Bunun çalışması için graf **DEM ile derlenmiş** olmalı
  (`build_elevation=True`); aksi halde her kenarın eğimi 0 sayılır ve iki profil aynı çıkar.
- `max_grade` Valhalla'da okunuyor ama **şu an rota seçiminde uygulanmıyor**. `src/sif/pedestriancost.cc` içinde ilgili
  kontrol "gürültülü veri" gerekçesiyle yorum satırına alınmış. Betik değeri yine gönderir; asıl etki `use_hills` ve
  `step_penalty`'den gelir. Azami eğimi biz `/height` profilinden hesaplayıp zorluk etiketine yansıtıyoruz.
- `type: "wheelchair"` seçeneği, OSM'de `wheelchair=no` olan yolları dışlar ve hızı 4 km/s'ye düşürür. Betikte
  `ERISILEBILIR_TIP` sabitiyle açılabilir. Rampa ve asansör etiketleri eksikse rota bulunamayabilir.
- SRTM'in çözünürlüğü yaklaşık 30 m. Boğaz yamaçları gibi dar vadilerde tek tek sokakların eğimi yumuşar veya kayar.
  Zorluk etiketleri bu yüzden yaklaşık değerlerdir.
