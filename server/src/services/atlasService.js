// İstanbul Atlas arka uç servisi:
// - Her mekanı koordinatına (lat, lon) göre gerçek İstanbul yaka / ilçe / mahalle sınırına eşler.
// - Harita renklendirmesi (dominant tür), bölge özetleri, filtreli mekan listeleri ve Türkçe arama sağlar.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mekanRepo, rotaRepo, semtRepo, yorumRepo } from '../repositories/index.js';
import {
  BOGAZ_ODAK_BBOX,
  BOGAZ_ODAK_LL,
  KOPRULER,
  SIMGE_ID_SET,
  SIMGE_LISTESI,
  SU_YOLLARI,
  projSvg,
} from '../data/atlasKatmanlar.js';
import { bolgeIcinMuzik } from './muzikService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEO_PATH = path.join(__dirname, '..', 'data', 'atlas-bolgeler.json');

export const YAKA_AD = {
  avrupa: 'Avrupa Yakası',
  anadolu: 'Anadolu Yakası',
};

export const TUR_BILGI = {
  muze: { ad: 'Müze', cogul: 'Müzeler', hue: 210 },
  miras: { ad: 'Tarihi miras', cogul: 'Tarihi miras', hue: 24 },
  atolye: { ad: 'Zanaat atölyesi', cogul: 'Zanaat atölyeleri', hue: 12 },
  carsi: { ad: 'Çarşı', cogul: 'Çarşılar', hue: 38 },
  edebiyat: { ad: 'Edebiyat', cogul: 'Edebiyat durakları', hue: 272 },
  film: { ad: 'Dizi / film', cogul: 'Dizi ve film mekanları', hue: 338 },
  sahne: { ad: 'Sahne', cogul: 'Sahneler', hue: 172 },
  mekan: { ad: 'Semt mekanı', cogul: 'Semt mekanları', hue: 145 },
};

export const ROZET_BILGI = {
  simge: { ad: 'Öne çıkanlar', kisa: '★', aciklama: 'İstanbul\'un başlıca simge yapıları' },
  erisilebilir: { ad: 'Erişilebilir', kisa: 'E', aciklama: 'Basamaksız veya rampalı erişim' },
  atolye: { ad: 'Usta atölyesi', kisa: 'A', aciklama: 'Geleneksel zanaat deneyimi' },
  damga: { ad: 'Pasaport durağı', kisa: 'P', aciklama: 'Dijital semt pasaportu QR damgalı' },
  dogrulandi: { ad: 'Doğrulanmış', kisa: 'D', aciklama: 'Kaynak ve konumu doğrulanmış' },
};

let geoCache = null;
const konumCache = new Map();

function loadGeo() {
  if (geoCache) return geoCache;
  const raw = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
  const ilceBySlug = new Map(raw.ilceler.map((i) => [i.slug, i]));
  const mahByIlce = new Map();
  for (const m of raw.mahalleler) {
    if (!mahByIlce.has(m.ilce)) mahByIlce.set(m.ilce, []);
    mahByIlce.get(m.ilce).push(m);
  }
  geoCache = { ilceler: raw.ilceler, mahalleler: raw.mahalleler, ilceBySlug, mahByIlce };
  return geoCache;
}

export function normTr(s) {
  return String(s || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .trim();
}

function pointInRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolys(pt, polys) {
  return polys.some((poly) => pointInRing(pt, poly[0]) && !poly.slice(1).some((h) => pointInRing(pt, h)));
}

function inBbox(pt, [x, y, w, h]) {
  return pt[0] >= x && pt[0] <= x + w && pt[1] >= y && pt[1] <= y + h;
}

function minDistToBbox(pt, [x, y, w, h]) {
  const dx = Math.max(x - pt[0], 0, pt[0] - (x + w));
  const dy = Math.max(y - pt[1], 0, pt[1] - (y + h));
  return Math.hypot(dx, dy);
}

function pointToSegDistSq(pt, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return (pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2;
  const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2));
  return (pt[0] - (a[0] + t * dx)) ** 2 + (pt[1] - (a[1] + t * dy)) ** 2;
}

function pointToPolysDist(pt, polys) {
  let best = Infinity;
  for (const poly of polys) {
    const ring = poly[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = pointToSegDistSq(pt, ring[j], ring[i]);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

function findRegion(pt, list, maxSnapDeg = 0.02) {
  for (const item of list) {
    if (inBbox(pt, item.bbox) && pointInPolys(pt, item.polys)) return item;
  }
  // Kıyı/ada kenarındaki noktalar için en yakın sınır kenarına yapıştır.
  let best = null;
  let bestDist = maxSnapDeg;
  for (const item of list) {
    if (minDistToBbox(pt, item.bbox) > bestDist) continue;
    const d = pointToPolysDist(pt, item.polys);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}

/** Bir mekanın koordinatından İstanbul yaka / ilçe / mahalle bilgisini çözer. */
export function konumCozumle(mekan) {
  const lat = Number(mekan?.lat);
  const lon = Number(mekan?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  if (konumCache.has(key)) return konumCache.get(key);

  const { ilceler, mahByIlce } = loadGeo();
  const pt = [lon, lat];
  const ilce = findRegion(pt, ilceler, 0.04);
  if (!ilce) {
    konumCache.set(key, null);
    return null;
  }
  const mahList = mahByIlce.get(ilce.slug) || [];
  const mah = findRegion(pt, mahList, 0.025);

  const sonuc = {
    yaka: ilce.yaka,
    yakaAd: YAKA_AD[ilce.yaka] || ilce.yaka,
    ilce: ilce.slug,
    ilceAd: ilce.ad,
    mahalle: mah?.slug || null,
    mahalleAd: mah?.ad || null,
  };
  konumCache.set(key, sonuc);
  return sonuc;
}

export function erisilebilirMi(m) {
  const e = m?.erisilebilirlik;
  if (!e) return false;
  if (e.zemin === 'merdiven' || e.zemin === 'yokus') return false;
  return e.basamak === false || e.rampa === true;
}

function rozetleriHesapla(m) {
  const out = [];
  if (SIMGE_ID_SET.has(m.id)) out.push('simge');
  if (erisilebilirMi(m)) out.push('erisilebilir');
  if (m.tur === 'atolye') out.push('atolye');
  if (m.damgaKodu) out.push('damga');
  if (m.dogrulandi) out.push('dogrulandi');
  return out;
}

function baskinTurler(list, limit = 3) {
  const sayim = {};
  for (const x of list) sayim[x.tur] = (sayim[x.tur] || 0) + 1;
  return Object.entries(sayim)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tur]) => tur);
}

/** Tüm mekanları konum + onaylı yorum puanı + rozetlerle zenginleştirir. */
async function zenginMekanlar() {
  const [mekanlar, yorumlar, semtler] = await Promise.all([
    mekanRepo.list(),
    yorumRepo.list({ durum: 'onaylandi' }),
    semtRepo.list(),
  ]);
  const semtAd = new Map(semtler.map((s) => [s.id, s.ad]));

  const puanMap = new Map();
  for (const y of yorumlar) {
    const cur = puanMap.get(y.mekanId) || { top: 0, sayi: 0 };
    cur.top += Number(y.puan) || 0;
    cur.sayi += 1;
    puanMap.set(y.mekanId, cur);
  }

  return mekanlar
    .map((m) => {
      const konum = konumCozumle(m);
      if (!konum) return null;
      const p = puanMap.get(m.id);
      const rozetler = rozetleriHesapla(m);
      const turBilgi = TUR_BILGI[m.tur] || { ad: m.tur, cogul: m.tur, hue: 210 };
      return {
        id: m.id,
        ad: m.ad,
        tur: m.tur,
        turAd: turBilgi.ad,
        hue: turBilgi.hue,
        zanaat: m.zanaat || null,
        kisa: m.kisa || '',
        semtId: m.semtId,
        semtAd: semtAd.get(m.semtId) || m.semtId,
        lat: m.lat,
        lon: m.lon,
        damgaKodu: m.damgaKodu || null,
        dogrulandi: Boolean(m.dogrulandi),
        erisilebilir: rozetler.includes('erisilebilir'),
        erisilebilirlik: m.erisilebilirlik || null,
        deneyim: m.deneyim || null,
        gorsel: m.gorsel?.url || null,
        rozetler,
        puan: p ? Math.round((p.top / p.sayi) * 10) / 10 : null,
        yorumSayisi: p ? p.sayi : 0,
        ...konum,
      };
    })
    .filter(Boolean);
}

/** GET /api/atlas/ozet — harita boyama, tooltip ve istemci tarafı anlık bölge araması. */
export async function atlasOzet() {
  const { ilceler } = loadGeo();
  const liste = await zenginMekanlar();

  const yakalar = {
    avrupa: { ad: YAKA_AD.avrupa, n: 0, dom: [], _items: [] },
    anadolu: { ad: YAKA_AD.anadolu, n: 0, dom: [], _items: [] },
  };
  const ilceMap = {};
  for (const i of ilceler) {
    ilceMap[i.slug] = { ad: i.ad, yaka: i.yaka, n: 0, dom: [], mahalleler: {}, _items: [], _mahItems: {} };
  }

  for (const m of liste) {
    const y = yakalar[m.yaka];
    if (y) {
      y.n++;
      y._items.push(m);
    }
    const ilc = ilceMap[m.ilce];
    if (ilc) {
      ilc.n++;
      ilc._items.push(m);
      if (m.mahalle) {
        if (!ilc._mahItems[m.mahalle]) ilc._mahItems[m.mahalle] = { ad: m.mahalleAd, items: [] };
        ilc._mahItems[m.mahalle].items.push(m);
      }
    }
  }

  const cleanYakalar = {};
  for (const [k, y] of Object.entries(yakalar)) {
    cleanYakalar[k] = { ad: y.ad, n: y.n, dom: baskinTurler(y._items) };
  }

  const cleanIlceler = {};
  for (const [slug, ilc] of Object.entries(ilceMap)) {
    const mahs = {};
    for (const [mslug, mdata] of Object.entries(ilc._mahItems)) {
      mahs[mslug] = { ad: mdata.ad, n: mdata.items.length, dom: baskinTurler(mdata.items) };
    }
    cleanIlceler[slug] = {
      ad: ilc.ad,
      yaka: ilc.yaka,
      n: ilc.n,
      dom: baskinTurler(ilc._items),
      mahalleler: mahs,
    };
  }

  const mekanById = new Map(liste.map((m) => [m.id, m]));
  const simgeler = SIMGE_LISTESI.map((s) => {
    const m = mekanById.get(s.id);
    if (!m) return null;
    const [x, y] = projSvg(m.lon, m.lat);
    return {
      id: m.id,
      ad: m.ad,
      kisaAd: s.kisaAd,
      oncelik: s.oncelik,
      tur: m.tur,
      turAd: m.turAd,
      hue: m.hue,
      kisa: m.kisa,
      gorsel: m.gorsel,
      ilce: m.ilce,
      ilceAd: m.ilceAd,
      mahalle: m.mahalle,
      mahalleAd: m.mahalleAd,
      puan: m.puan,
      yorumSayisi: m.yorumSayisi,
      lon: m.lon,
      lat: m.lat,
      x,
      y,
    };
  }).filter(Boolean);

  return {
    toplam: liste.length,
    guncelleme: new Date().toISOString().slice(0, 7),
    turler: TUR_BILGI,
    rozetler: ROZET_BILGI,
    dom: baskinTurler(liste),
    bogazOdak: BOGAZ_ODAK_BBOX,
    bogazOdakLL: BOGAZ_ODAK_LL,
    kopruler: KOPRULER,
    suYollari: SU_YOLLARI,
    simgeler,
    yakalar: cleanYakalar,
    ilceler: cleanIlceler,
  };
}

function siralaMekanlar(list) {
  return [...list].sort((a, b) => {
    if ((b.puan || 0) !== (a.puan || 0)) return (b.puan || 0) - (a.puan || 0);
    if (b.yorumSayisi !== a.yorumSayisi) return b.yorumSayisi - a.yorumSayisi;
    if (b.dogrulandi !== a.dogrulandi) return Number(b.dogrulandi) - Number(a.dogrulandi);
    if (b.erisilebilir !== a.erisilebilir) return Number(b.erisilebilir) - Number(a.erisilebilir);
    return a.ad.localeCompare(b.ad, 'tr');
  });
}

function mekanOzetSatiri(m, seviye) {
  const konum =
    seviye === 'mahalle'
      ? m.semtAd
      : seviye === 'ilce'
        ? m.mahalleAd || m.semtAd
        : m.mahalleAd
          ? `${m.ilceAd} · ${m.mahalleAd}`
          : m.ilceAd;
  return {
    id: m.id,
    ad: m.ad,
    tur: m.tur,
    turAd: m.turAd,
    hue: m.hue,
    zanaat: m.zanaat,
    kisa: m.kisa,
    konum,
    ilce: m.ilce,
    ilceAd: m.ilceAd,
    mahalle: m.mahalle,
    mahalleAd: m.mahalleAd,
    semtId: m.semtId,
    semtAd: m.semtAd,
    lat: m.lat,
    lon: m.lon,
    puan: m.puan,
    yorumSayisi: m.yorumSayisi,
    rozetler: m.rozetler,
    erisilebilir: m.erisilebilir,
    dogrulandi: m.dogrulandi,
    damgaKodu: m.damgaKodu,
  };
}

/** GET /api/atlas/liste — sağ panel listesi, çipler, gruplar ve alt bölge bağlantıları. */
export async function atlasListe({ yaka, ilce, mahalle, tur, rozet, erisilebilir } = {}) {
  const { ilceler, ilceBySlug, mahByIlce } = loadGeo();
  const [tumMekanlar, tumRotalar] = await Promise.all([zenginMekanlar(), rotaRepo.list()]);

  let seviye = 'istanbul';
  let baslik = 'İstanbul';
  let ustBaslik = 'ŞEHİR ATLASI';
  let bolgeMekanlari = tumMekanlar;
  let altBolgeler = [];
  let aktifYaka = null;
  let aktifIlce = null;
  let aktifMahalle = null;

  if (ilce) {
    const ilcObj = ilceBySlug.get(ilce);
    if (!ilcObj) return null;
    aktifIlce = ilcObj;
    aktifYaka = ilcObj.yaka;
    bolgeMekanlari = tumMekanlar.filter((m) => m.ilce === ilcObj.slug);

    const ilceMahList = mahByIlce.get(ilcObj.slug) || [];
    if (mahalle) {
      const mObj = ilceMahList.find((x) => x.slug === mahalle);
      if (!mObj) return null;
      aktifMahalle = mObj;
      seviye = 'mahalle';
      baslik = mObj.ad;
      ustBaslik = `İSTANBUL · ${ilcObj.ad.toLocaleUpperCase('tr-TR')}`;
      bolgeMekanlari = bolgeMekanlari.filter((m) => m.mahalle === mObj.slug);
    } else {
      seviye = 'ilce';
      baslik = ilcObj.ad;
      ustBaslik = `İSTANBUL · ${(YAKA_AD[ilcObj.yaka] || '').toLocaleUpperCase('tr-TR')}`;
    }

    // Alt mahalleler (mekanı olanlar üstte)
    const mahSayim = {};
    for (const m of tumMekanlar) {
      if (m.ilce === ilcObj.slug && m.mahalle) mahSayim[m.mahalle] = (mahSayim[m.mahalle] || 0) + 1;
    }
    altBolgeler = ilceMahList
      .filter((mh) => mahSayim[mh.slug] > 0)
      .map((mh) => ({ slug: mh.slug, ad: mh.ad, n: mahSayim[mh.slug], ilce: ilcObj.slug }))
      .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));
  } else if (yaka) {
    if (!YAKA_AD[yaka]) return null;
    aktifYaka = yaka;
    seviye = 'yaka';
    baslik = YAKA_AD[yaka];
    ustBaslik = 'İSTANBUL';
    bolgeMekanlari = tumMekanlar.filter((m) => m.yaka === yaka);

    const ilceSayim = {};
    for (const m of bolgeMekanlari) ilceSayim[m.ilce] = (ilceSayim[m.ilce] || 0) + 1;
    altBolgeler = ilceler
      .filter((i) => i.yaka === yaka && ilceSayim[i.slug] > 0)
      .map((i) => ({ slug: i.slug, ad: i.ad, n: ilceSayim[i.slug], yaka }))
      .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));
  } else {
    const ilceSayim = {};
    for (const m of bolgeMekanlari) ilceSayim[m.ilce] = (ilceSayim[m.ilce] || 0) + 1;
    altBolgeler = ilceler
      .filter((i) => ilceSayim[i.slug] > 0)
      .map((i) => ({ slug: i.slug, ad: i.ad, n: ilceSayim[i.slug], yaka: i.yaka }))
      .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));
  }

  // Küresel erişilebilir mod aktifse tüm liste ve çipler ona göre süzülür
  if (erisilebilir) {
    bolgeMekanlari = bolgeMekanlari.filter((m) => m.erisilebilir);
  }

  // Çipler (bölge içindeki dağılım)
  const turSayim = {};
  const rozetSayim = {};
  for (const m of bolgeMekanlari) {
    turSayim[m.tur] = (turSayim[m.tur] || 0) + 1;
    for (const r of m.rozetler) rozetSayim[r] = (rozetSayim[r] || 0) + 1;
  }

  const turCipleri = Object.entries(turSayim)
    .map(([id, n]) => ({ id, ad: TUR_BILGI[id]?.ad || id, hue: TUR_BILGI[id]?.hue ?? 210, n }))
    .sort((a, b) => b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));

  const rozetCipleri = Object.keys(ROZET_BILGI)
    .filter((id) => rozetSayim[id] > 0)
    .map((id) => ({ id, ad: ROZET_BILGI[id].ad, kisa: ROZET_BILGI[id].kisa, n: rozetSayim[id] }));

  // Aktif filtreyi uygula
  let filtreli = bolgeMekanlari;
  let filtreEtiketi = null;
  if (tur) {
    filtreli = filtreli.filter((m) => m.tur === tur);
    filtreEtiketi = TUR_BILGI[tur]?.cogul || tur;
  } else if (rozet) {
    filtreli = filtreli.filter((m) => m.rozetler.includes(rozet));
    filtreEtiketi = ROZET_BILGI[rozet]?.ad || rozet;
  }

  const sirali = siralaMekanlar(filtreli);
  const satirlar = sirali.map((m) => mekanOzetSatiri(m, seviye));

  // 'Tümü' görünümünde kategori başlıklarına göre grupla (Mideci'deki .gh düzeni gibi)
  let gruplar = [];
  if (!tur && !rozet && seviye !== 'mahalle') {
    const byTur = new Map();
    for (const m of satirlar) {
      if (!byTur.has(m.tur)) byTur.set(m.tur, []);
      byTur.get(m.tur).push(m);
    }
    gruplar = [...byTur.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([id, items]) => ({
        id,
        ad: TUR_BILGI[id]?.cogul || id,
        hue: TUR_BILGI[id]?.hue ?? 210,
        toplam: items.length,
        mekanlar: items.slice(0, seviye === 'ilce' ? 8 : 6),
      }));
  }

  // Bu bölgede geçen yürüyüş rotaları (Proje 404 entegrasyonu)
  const bolgeSemtleri = new Set(bolgeMekanlari.map((m) => m.semtId));
  const ilgiliRotalar = tumRotalar
    .filter((r) => bolgeSemtleri.has(r.semtId))
    .slice(0, 4)
    .map(({ id, ad, semtId, tur: rotaTur, ozet, duraklar }) => ({
      id,
      ad,
      semtId,
      tur: rotaTur,
      ozet,
      durakSayisi: duraklar?.length || 0,
    }));

  const muzik = bolgeIcinMuzik({
    ilce: aktifIlce?.slug || null,
    yaka: aktifYaka || null,
    bolgeAd: aktifMahalle ? `${aktifMahalle.ad}, ${aktifIlce.ad}` : baslik,
  });

  return {
    seviye,
    ustBaslik,
    baslik,
    yaka: aktifYaka,
    ilce: aktifIlce?.slug || null,
    ilceAd: aktifIlce?.ad || null,
    mahalle: aktifMahalle?.slug || null,
    mahalleAd: aktifMahalle?.ad || null,
    filtreEtiketi,
    toplam: bolgeMekanlari.length,
    filtreliToplam: satirlar.length,
    cipler: { rozetler: rozetCipleri, turler: turCipleri },
    gruplar,
    mekanlar: satirlar,
    altBolgeler,
    rotalar: ilgiliRotalar,
    muzik,
  };
}

/** GET /api/atlas/ara?q=... — mekan, zanaat, semt ve mahalle araması. */
export async function atlasAra(q) {
  const sorgu = normTr(q);
  if (sorgu.length < 2) return [];
  const liste = await zenginMekanlar();
  const eslesen = [];

  for (const m of liste) {
    const adN = normTr(m.ad);
    const metaN = normTr(`${m.turAd} ${m.zanaat || ''} ${m.ilceAd} ${m.mahalleAd || ''} ${m.semtAd} ${m.kisa}`);
    let skor = 0;
    if (adN.startsWith(sorgu)) skor = 100;
    else if (adN.includes(sorgu)) skor = 70;
    else if (metaN.includes(sorgu)) skor = 40;
    if (skor > 0) {
      eslesen.push({
        skor,
        id: m.id,
        ad: m.ad,
        tur: m.tur,
        turAd: m.turAd,
        hue: m.hue,
        konum: m.mahalleAd ? `${m.ilceAd} · ${m.mahalleAd}` : m.ilceAd,
        ilce: m.ilce,
        mahalle: m.mahalle,
        href: `/mekan/${m.id}`,
      });
    }
  }

  return eslesen
    .sort((a, b) => b.skor - a.skor || a.ad.localeCompare(b.ad, 'tr'))
    .slice(0, 12)
    .map(({ skor, ...rest }) => rest);
}
