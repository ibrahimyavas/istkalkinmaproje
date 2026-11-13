#!/usr/bin/env node
// Demo rotalarını yerel Valhalla ile önceden hesaplar ve GeoJSON olarak yazar.
//
//   node scripts/build-routes.js --in scripts/route-inputs.example.json --out scripts/out
//   node scripts/build-routes.js --in ... --out ... --valhalla http://localhost:8002
//
// Her rota için:
//   - normal yürüme rotası (Valhalla `pedestrian`, varsayılan ayarlar)
//   - erişilebilir rota (merdiven cezası yüksek, yokuş cezası yüksek)
//   - iki rotanın /height eğim profili, /trace_attributes ile merdiven uzunluğu
//   - zorluk etiketi: 'kolay' | 'orta' | 'dik'
//
// Valhalla'ya ulaşılamazsa, DEM yoksa veya bir rota bulunamazsa betik hata verip çıkar.
// Hiçbir koşulda tahmini ya da sahte veri yazmaz. Altyapı kurulumu: infra/README.md

import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------

// Zorluk eşikleri (yüzde eğim). Bir rota, iki koşulu da sağlayan en hafif sınıfı alır;
// hiçbirini sağlamıyorsa 'dik' olur.
//   azamiEgimYuzde:    EGIM_PENCERE_M uzunluğundaki en dik kesitin eğimi
//   ortalamaEgimYuzde: (toplam çıkış + toplam iniş) / toplam mesafe
// Referans: tekerlekli sandalye rampası için %5 rahat, %8,33 (1:12) üst sınır kabul edilir.
export const ZORLUK_ESIKLERI = Object.freeze({
  kolay: Object.freeze({ azamiEgimYuzde: 6, ortalamaEgimYuzde: 3 }),
  orta: Object.freeze({ azamiEgimYuzde: 12, ortalamaEgimYuzde: 6 }),
});

// Azami eğim bu uzunluktaki kesitler üzerinden ölçülür. SRTM ~30 m çözünürlüklü;
// daha kısa pencere DEM gürültüsünü "eğim" diye okur.
export const EGIM_PENCERE_M = 50;

// /height örnekleme aralığı (Valhalla'nın alt sınırı 10 m).
export const YUKSEKLIK_ORNEK_ARALIGI_M = 10;

const VARSAYILAN_VALHALLA = process.env.VALHALLA_URL || 'http://localhost:8002';
const ISTEK_ZAMAN_ASIMI_MS = 60_000;

// İstanbul il sınırını kapsayan kutu; girdideki durakları denetlemek için.
const ISTANBUL_BBOX = Object.freeze({ minLon: 27.95, minLat: 40.79, maxLon: 29.95, maxLat: 41.6 });

// Yürüme rotalarında vapur kullanılmaz. Valhalla'nın yaya profili vapuru varsayılan olarak
// kullanır; iskele durakları da (terminal merkezi) vapur hattına oturabilir. Bu yüzden hem
// use_ferry=0 hem de durak eşlemede exclude_ferry kullanılır.
const DURAK_ARAMA_FILTRESI = Object.freeze({ exclude_ferry: true });

// Normal profil: Valhalla'nın yaya varsayılanları (step_penalty 30 s, use_hills 0.5), vapursuz.
export const NORMAL_PROFIL = Object.freeze({
  costing: 'pedestrian',
  costing_options: { pedestrian: { use_ferry: 0 } },
});

// 'foot' veya 'wheelchair'. 'wheelchair' OSM'de wheelchair=no olan yolları dışlar;
// rampa/asansör etiketleri eksik semtlerde rota bulunamayabilir.
const ERISILEBILIR_TIP = 'foot';

// Erişilebilir profil.
//   step_penalty: her merdiven kenarına eklenen ceza (saniye). Merdiveni yasaklamaz;
//                 başka yol yoksa yine kullanılır, bu yüzden merdivenM ayrıca ölçülür.
//   use_hills:    0 = yokuştan olabildiğince kaçın. DEM ile derlenmiş graf gerektirir.
//   max_grade:    Valhalla bu değeri okuyor ama şu an rota seçiminde uygulamıyor
//                 (pedestriancost.cc'de ilgili kontrol yorum satırında). Yine de gönderiyoruz;
//                 Valhalla etkinleştirirse kendiliğinden devreye girer.
export const ERISILEBILIR_PROFIL = Object.freeze({
  costing: 'pedestrian',
  costing_options: {
    pedestrian: {
      type: ERISILEBILIR_TIP,
      use_ferry: 0,
      step_penalty: 3600,
      use_hills: 0,
      max_grade: 8,
      walking_speed: 4,
    },
  },
});

// ---------------------------------------------------------------------------
// Valhalla istemcisi
// ---------------------------------------------------------------------------

class ValhallaHatasi extends Error {}

async function valhallaIstegi(tabanUrl, uc, govde) {
  const url = `${tabanUrl.replace(/\/$/, '')}/${uc}`;
  let yanit;
  try {
    yanit = await fetch(url, {
      method: govde ? 'POST' : 'GET',
      headers: govde ? { 'Content-Type': 'application/json' } : undefined,
      body: govde ? JSON.stringify(govde) : undefined,
      signal: AbortSignal.timeout(ISTEK_ZAMAN_ASIMI_MS),
    });
  } catch (hata) {
    const neden = hata.cause?.code || hata.name || hata.message;
    throw new ValhallaHatasi(
      `Valhalla'ya ulaşılamadı: ${url} (${neden}).\n` +
        `  Başlatmak için: docker compose -f infra/docker-compose.yml up -d valhalla\n` +
        `  İlk açılışta DEM indirme ve karo derleme birkaç dakika sürer; ilerleme için:\n` +
        `  docker compose -f infra/docker-compose.yml logs -f valhalla\n` +
        `  Ayrıntı: infra/README.md`,
    );
  }

  const metin = await yanit.text();
  let veri;
  try {
    veri = JSON.parse(metin);
  } catch {
    throw new ValhallaHatasi(`Valhalla /${uc} JSON dışı yanıt verdi (HTTP ${yanit.status}): ${metin.slice(0, 200)}`);
  }
  if (!yanit.ok || veri.error_code) {
    const kod = veri.error_code ?? yanit.status;
    let ipucu = '';
    if (kod === 171) ipucu = ' (Durağın yakınında yürünebilir yol yok; koordinatı kontrol edin.)';
    if (kod === 442) ipucu = ' (Bu profille duraklar arasında yol bulunamadı.)';
    if (kod === 154) ipucu = ' (Mesafe sınırı aşıldı; data/valhalla/valhalla.json service_limits.)';
    throw new ValhallaHatasi(`Valhalla /${uc} hatası ${kod}: ${veri.error || metin.slice(0, 200)}${ipucu}`);
  }
  return veri;
}

async function valhallaHazirMi(tabanUrl) {
  const durum = await valhallaIstegi(tabanUrl, 'status');
  const eylemler = durum.available_actions || [];
  for (const gerekli of ['route', 'height', 'trace_attributes']) {
    if (eylemler.length && !eylemler.includes(gerekli)) {
      throw new ValhallaHatasi(`Valhalla '${gerekli}' eylemini sunmuyor. Mevcut: ${eylemler.join(', ')}`);
    }
  }
  return durum;
}

// ---------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------

// Valhalla şekilleri polyline6 olarak kodlanır. Çıktı: [[lon, lat], ...] (GeoJSON sırası).
export function polyline6Coz(kodlu) {
  const koordinatlar = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  while (i < kodlu.length) {
    for (const eksen of [0, 1]) {
      let sonuc = 0;
      let kaydirma = 0;
      let bayt;
      do {
        bayt = kodlu.charCodeAt(i++) - 63;
        sonuc |= (bayt & 0x1f) << kaydirma;
        kaydirma += 5;
      } while (bayt >= 0x20);
      const fark = sonuc & 1 ? ~(sonuc >> 1) : sonuc >> 1;
      if (eksen === 0) lat += fark;
      else lon += fark;
    }
    koordinatlar.push([lon / 1e6, lat / 1e6]);
  }
  return koordinatlar;
}

function ayniNokta(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

function bacaklariBirlestir(bacaklar) {
  const hepsi = [];
  for (const bacak of bacaklar) {
    for (const nokta of bacak) {
      if (!ayniNokta(hepsi[hepsi.length - 1], nokta)) hepsi.push(nokta);
    }
  }
  return hepsi;
}

function lineString(koordinatlar) {
  return { type: 'LineString', coordinates: koordinatlar };
}

function geometrilerAyniMi(a, b) {
  if (a.length !== b.length) return false;
  return a.every((nokta, i) => ayniNokta(nokta, b[i]));
}

// ---------------------------------------------------------------------------
// Eğim
// ---------------------------------------------------------------------------

// Valhalla veri olmayan noktalar için null (bazı sürümlerde -32768) döndürür.
function gecerliYukseklik(h) {
  return typeof h === 'number' && Number.isFinite(h) && h > -1000;
}

export function egimOzetiHesapla(profil) {
  if (profil.length < 2) {
    return { azamiEgimYuzde: 0, ortalamaEgimYuzde: 0, toplamCikisM: 0, toplamInisM: 0 };
  }
  let cikis = 0;
  let inis = 0;
  for (let i = 1; i < profil.length; i++) {
    const fark = profil[i].yukseklikM - profil[i - 1].yukseklikM;
    if (fark > 0) cikis += fark;
    else inis -= fark;
  }
  const toplamMesafe = profil[profil.length - 1].mesafeM - profil[0].mesafeM;

  let azami = 0;
  let j = 0;
  for (let i = 0; i < profil.length; i++) {
    if (j < i) j = i;
    while (j < profil.length - 1 && profil[j].mesafeM - profil[i].mesafeM < EGIM_PENCERE_M) j++;
    const dx = profil[j].mesafeM - profil[i].mesafeM;
    // Pencereden kısa kalan son parça (rota sonu) azami eğime katılmaz.
    if (dx < EGIM_PENCERE_M) break;
    const egim = (Math.abs(profil[j].yukseklikM - profil[i].yukseklikM) / dx) * 100;
    if (egim > azami) azami = egim;
  }
  // Rota pencereden kısaysa tek kesit olarak ölç.
  if (azami === 0 && toplamMesafe > 0) {
    azami = (Math.abs(profil[profil.length - 1].yukseklikM - profil[0].yukseklikM) / toplamMesafe) * 100;
  }

  return {
    azamiEgimYuzde: yuvarla(azami, 1),
    ortalamaEgimYuzde: toplamMesafe > 0 ? yuvarla(((cikis + inis) / toplamMesafe) * 100, 1) : 0,
    toplamCikisM: Math.round(cikis),
    toplamInisM: Math.round(inis),
  };
}

export function zorlukBelirle({ azamiEgimYuzde, ortalamaEgimYuzde }) {
  for (const sinif of ['kolay', 'orta']) {
    const esik = ZORLUK_ESIKLERI[sinif];
    if (azamiEgimYuzde <= esik.azamiEgimYuzde && ortalamaEgimYuzde <= esik.ortalamaEgimYuzde) return sinif;
  }
  return 'dik';
}

function yuvarla(sayi, basamak) {
  const k = 10 ** basamak;
  return Math.round(sayi * k) / k;
}

// ---------------------------------------------------------------------------
// Rota hesabı
// ---------------------------------------------------------------------------

async function egimProfiliAl(tabanUrl, koordinatlar, rotaEtiketi) {
  const yanit = await valhallaIstegi(tabanUrl, 'height', {
    shape: koordinatlar.map(([lon, lat]) => ({ lat, lon })),
    range: true,
    resample_distance: YUKSEKLIK_ORNEK_ARALIGI_M,
    height_precision: 1,
  });
  const ham = yanit.range_height || [];
  const profil = ham
    .filter(([, h]) => gecerliYukseklik(h))
    .map(([mesafe, h]) => ({ mesafeM: Math.round(mesafe), yukseklikM: yuvarla(h, 1) }));

  if (profil.length === 0) {
    throw new ValhallaHatasi(
      `${rotaEtiketi}: /height hiç yükseklik döndürmedi. DEM yüklü değil.\n` +
        `  infra/docker-compose.yml içinde build_elevation=True olmalı; README adım 3'teki /height denetimine bakın.`,
    );
  }
  const eksik = ham.length - profil.length;
  if (eksik / ham.length > 0.1) {
    throw new ValhallaHatasi(
      `${rotaEtiketi}: yükseklik noktalarının %${Math.round((eksik / ham.length) * 100)}'i boş. ` +
        `DEM bu bölgeyi kapsamıyor olabilir.`,
    );
  }
  return profil;
}

// Rotadaki merdiven ve asansör uzunluğunu, rota şeklini graf kenarlarına eşleyerek ölçer.
// Her bacak ayrı eşlenir (durak noktalarında geri dönüşler edge_walk'ı bozabiliyor).
async function kenarOzetiAl(tabanUrl, bacaklar, profil) {
  let merdivenKm = 0;
  let asansorSayisi = 0;
  for (const bacak of bacaklar) {
    if (bacak.length < 2) continue;
    const govde = {
      shape: bacak.map(([lon, lat]) => ({ lat, lon })),
      costing: profil.costing,
      costing_options: profil.costing_options,
      filters: { attributes: ['edge.use', 'edge.length'], action: 'include' },
    };
    let yanit;
    try {
      yanit = await valhallaIstegi(tabanUrl, 'trace_attributes', { ...govde, shape_match: 'edge_walk' });
    } catch {
      yanit = await valhallaIstegi(tabanUrl, 'trace_attributes', { ...govde, shape_match: 'map_snap' });
    }
    for (const kenar of yanit.edges || []) {
      if (kenar.use === 'steps') merdivenKm += kenar.length || 0;
      if (kenar.use === 'elevator') asansorSayisi += 1;
    }
  }
  return { merdivenM: Math.round(merdivenKm * 1000), asansorSayisi };
}

async function profilHesapla(tabanUrl, rota, profil, profilAdi) {
  const etiket = `${rota.id}/${profilAdi}`;
  const yanit = await valhallaIstegi(tabanUrl, 'route', {
    locations: rota.duraklar.map((d) => ({
      lat: d.lat,
      lon: d.lon,
      type: 'break',
      name: d.ad,
      search_filter: DURAK_ARAMA_FILTRESI,
    })),
    costing: profil.costing,
    costing_options: profil.costing_options,
    directions_type: 'none',
    units: 'kilometers',
    id: etiket,
  }).catch((hata) => {
    throw new ValhallaHatasi(`${etiket}: ${hata.message}`);
  });

  const trip = yanit.trip;
  if (!trip?.legs?.length) throw new ValhallaHatasi(`${etiket}: Valhalla boş rota döndürdü.`);

  const bacaklar = trip.legs.map((bacak) => polyline6Coz(bacak.shape));
  const koordinatlar = bacaklariBirlestir(bacaklar);
  const egimProfili = await egimProfiliAl(tabanUrl, koordinatlar, etiket);
  const egimOzeti = egimOzetiHesapla(egimProfili);
  const kenarlar = await kenarOzetiAl(tabanUrl, bacaklar, profil).catch((hata) => {
    console.warn(`  uyarı: ${etiket} merdiven ölçümü yapılamadı (${hata.message}); merdivenM = null`);
    return { merdivenM: null, asansorSayisi: null };
  });

  return {
    geometri: lineString(koordinatlar),
    mesafeM: Math.round(trip.summary.length * 1000),
    sureDk: Math.round(trip.summary.time / 60),
    egimProfili,
    egimOzeti,
    zorluk: zorlukBelirle(egimOzeti),
    merdivenM: kenarlar.merdivenM,
    asansorSayisi: kenarlar.asansorSayisi,
  };
}

function karsilastir(normal, erisilebilir) {
  const farkli = !geometrilerAyniMi(normal.geometri.coordinates, erisilebilir.geometri.coordinates);
  if (farkli) {
    const parcalar = [`mesafe ${normal.mesafeM} → ${erisilebilir.mesafeM} m`];
    if (normal.merdivenM != null) parcalar.push(`merdiven ${normal.merdivenM} → ${erisilebilir.merdivenM} m`);
    parcalar.push(`azami eğim %${normal.egimOzeti.azamiEgimYuzde} → %${erisilebilir.egimOzeti.azamiEgimYuzde}`);
    return { farkli, not: `Erişilebilir rota farklı: ${parcalar.join(', ')}.` };
  }
  let neden;
  if (normal.merdivenM === 0 && normal.egimOzeti.azamiEgimYuzde <= ZORLUK_ESIKLERI.kolay.azamiEgimYuzde) {
    neden = 'Normal rota zaten merdivensiz ve düz; kaçınılacak bir şey yok.';
  } else if (normal.merdivenM > 0) {
    neden =
      `Normal rotada ${normal.merdivenM} m merdiven var ama ` +
      `${ERISILEBILIR_PROFIL.costing_options.pedestrian.step_penalty} s cezaya rağmen başka yol bulunamadı ` +
      '(OSM\'de alternatif yol/rampa yok veya duraklardan biri merdivenle erişiliyor).';
  } else {
    neden =
      'Rota merdivensiz; yokuş cezası (use_hills=0) daha düz bir alternatif bulamadı. ' +
      'Semtte paralel ve daha düz bir sokak yoksa beklenen sonuç budur.';
  }
  return { farkli, not: `Erişilebilir rota normal rotayla aynı. ${neden}` };
}

function rotaDenetle(rota, sira) {
  const yer = `rotalar[${sira}]`;
  if (!rota || typeof rota.id !== 'string' || !rota.id.trim()) throw new Error(`${yer}: 'id' metni gerekli.`);
  if (!/^[a-z0-9-]+$/.test(rota.id)) throw new Error(`${yer}: id yalnızca küçük harf, rakam ve '-' içermeli (dosya adı olur): ${rota.id}`);
  if (!Array.isArray(rota.duraklar) || rota.duraklar.length < 2) {
    throw new Error(`${rota.id}: 'duraklar' en az 2 elemanlı bir dizi olmalı.`);
  }
  rota.duraklar.forEach((d, i) => {
    const yerD = `${rota.id}.duraklar[${i}]`;
    if (typeof d.id !== 'string' || typeof d.ad !== 'string') throw new Error(`${yerD}: 'id' ve 'ad' metin olmalı.`);
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon)) throw new Error(`${yerD}: 'lat' ve 'lon' sayı olmalı.`);
    const b = ISTANBUL_BBOX;
    if (d.lon < b.minLon || d.lon > b.maxLon || d.lat < b.minLat || d.lat > b.maxLat) {
      throw new Error(`${yerD} (${d.ad}) İstanbul kutusunun dışında: ${d.lat}, ${d.lon}. lat/lon yer değiştirmiş olabilir.`);
    }
  });
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      in: { type: 'string' },
      out: { type: 'string' },
      valhalla: { type: 'string', default: VARSAYILAN_VALHALLA },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help || !values.in || !values.out) {
    console.log('Kullanım: node scripts/build-routes.js --in <girdi.json> --out <klasör> [--valhalla http://localhost:8002]');
    process.exit(values.help ? 0 : 2);
  }

  const girdi = JSON.parse(await readFile(values.in, 'utf8'));
  const rotalar = Array.isArray(girdi) ? girdi : girdi.rotalar;
  if (!Array.isArray(rotalar) || rotalar.length === 0) throw new Error(`${values.in}: 'rotalar' dizisi boş veya yok.`);
  rotalar.forEach(rotaDenetle);
  const idler = new Set();
  for (const r of rotalar) {
    if (idler.has(r.id)) throw new Error(`Aynı id iki kez kullanılmış: ${r.id}`);
    idler.add(r.id);
  }

  const durum = await valhallaHazirMi(values.valhalla);
  console.log(`Valhalla hazır: ${values.valhalla} (sürüm ${durum.version ?? 'bilinmiyor'})`);

  // Önce hepsi hesaplanır; biri bile başarısız olursa hiçbir dosya yazılmaz.
  const sonuclar = [];
  for (const rota of rotalar) {
    console.log(`\n▸ ${rota.id} (${rota.duraklar.length} durak)`);
    const normal = await profilHesapla(values.valhalla, rota, NORMAL_PROFIL, 'normal');
    const erisilebilir = await profilHesapla(values.valhalla, rota, ERISILEBILIR_PROFIL, 'erisilebilir');
    const karsilastirma = karsilastir(normal, erisilebilir);

    for (const [ad, p] of [['normal', normal], ['erişilebilir', erisilebilir]]) {
      console.log(
        `  ${ad.padEnd(13)} ${String(p.mesafeM).padStart(5)} m  ${String(p.sureDk).padStart(3)} dk  ` +
          `merdiven ${p.merdivenM ?? '?'} m  azami %${p.egimOzeti.azamiEgimYuzde}  ` +
          `ort. %${p.egimOzeti.ortalamaEgimYuzde}  ↑${p.egimOzeti.toplamCikisM} m  → ${p.zorluk}`,
      );
    }
    console.log(`  ${karsilastirma.not}`);

    const ozet = (p) => ({
      mesafeM: p.mesafeM,
      sureDk: p.sureDk,
      egimProfili: p.egimProfili,
      egimOzeti: p.egimOzeti,
      zorluk: p.zorluk,
      merdivenM: p.merdivenM,
      asansorSayisi: p.asansorSayisi,
    });

    sonuclar.push({
      id: rota.id,
      ad: rota.ad ?? rota.id,
      duraklar: rota.duraklar,
      normal: normal.geometri,
      erisilebilir: erisilebilir.geometri,
      // Üst düzey mesafe/süre/eğim/zorluk normal rotaya aittir.
      ...ozet(normal),
      erisilebilirOzet: ozet(erisilebilir),
      karsilastirma,
      kaynak: {
        motor: 'valhalla',
        surum: durum.version ?? null,
        olusturulma: new Date().toISOString(),
        profiller: { normal: NORMAL_PROFIL, erisilebilir: ERISILEBILIR_PROFIL },
        zorlukEsikleri: ZORLUK_ESIKLERI,
        egimPencereM: EGIM_PENCERE_M,
        lisans: '© OpenStreetMap katkıcıları (ODbL); yükseklik: SRTM',
      },
    });
  }

  await mkdir(values.out, { recursive: true });
  for (const s of sonuclar) {
    await writeFile(path.join(values.out, `${s.id}.json`), JSON.stringify(s, null, 2) + '\n', 'utf8');
  }
  await writeFile(path.join(values.out, 'rotalar.json'), JSON.stringify(sonuclar, null, 2) + '\n', 'utf8');
  console.log(`\n${sonuclar.length} rota yazıldı: ${path.resolve(values.out)}`);
}

// Doğrudan çalıştırıldığında çalışır; testler eğim/zorluk fonksiyonlarını içe aktarabilir.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((hata) => {
    console.error(`\nHATA: ${hata.message}`);
    process.exit(1);
  });
}
