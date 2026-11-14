// Mekan fotoğraflarını Wikipedia/Wikimedia Commons'tan, lisans ve yazar bilgisiyle çeker.
//
// Kural: yalnızca kaynağı belirli bir tr.wikipedia maddesi olan ve bu maddeyi başka bir
// mekanla PAYLAŞMAYAN kayıtlar güncellenir (ör. "Kuzguncuk" maddesi semtin genel
// görselidir, bostanın değil). Yalnızca özgür lisanslı (CC / kamu malı) görseller alınır.
// Admin panelinden elle seçilmiş kapak fotoğrafları (tur: 'yukleme') ezilmez.
//
// İstekler toplu yapılır: tek istekte 50'ye kadar madde (tr.wikipedia pageimages) ve
// 50'ye kadar dosya (Commons imageinfo). Böylece tüm mekanlar 2 istekle yenilenir;
// Wikimedia'nın istek sınırına (429) takılmaz ve Vercel'in 30 sn sınırına rahat sığar.

const UA = 'Proje404-demo/0.1 (Istanbul kultur rotalari; ogrenci projesi)';
const ZAMAN_ASIMI_MS = 8000;
const PARTI = 50;
// Özgür lisanslar: Creative Commons, CC0, kamu malı, Free Art License (FAL).
const OZGUR_LISANS = /(^|\s)(CC[ -]|CC0|Public domain|PD|Kamu malı|FAL\b|Free Art)/i;

const htmlTemizle = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const parcala = (list, n) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

export function wikiBasligi(kaynak) {
  const m = /^https:\/\/tr\.wikipedia\.org\/wiki\/([^#?]+)/.exec(kaynak || '');
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
}

/**
 * Görselin alınacağı madde. Mekan kaydında `gorselMaddesi` alanı varsa o kullanılır:
 * `null` → bu mekan için Wikipedia görseli alınmaz (kaynak madde mekanın kendisini değil,
 * örneğin bir kişiyi ya da semtin tamamını anlatıyor). Yoksa `kaynak` bağlantısı kullanılır.
 */
export function gorselBasligi(m) {
  if (Object.prototype.hasOwnProperty.call(m, 'gorselMaddesi')) return m.gorselMaddesi || null;
  return wikiBasligi(m.kaynak);
}

// 429'da Retry-After (en fazla 5 sn, yoksa artan bekleme) kadar bekleyip 2 kez yeniden dener.
async function getJson(url, { fetchFn, bekleme }) {
  for (let deneme = 0; ; deneme++) {
    const res = await fetchFn(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: AbortSignal.timeout(ZAMAN_ASIMI_MS) });
    if (res.status === 429 && deneme < 2) {
      const sn = Number(res.headers?.get?.('retry-after'));
      await bekleme(Number.isFinite(sn) && sn > 0 ? Math.min(sn, 5) * 1000 : 1000 * (deneme + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}

/** API'nin normalized/redirects eşlemelerini izleyerek istenen başlığın son hâlini bulur. */
function cozumleyici(query) {
  const esle = new Map();
  for (const n of query?.normalized || []) esle.set(n.from, n.to);
  for (const r of query?.redirects || []) esle.set(r.from, r.to);
  return (baslik) => {
    let t = baslik;
    for (let i = 0; i < 3 && esle.has(t); i++) t = esle.get(t);
    return t;
  };
}

/** Madde başlıkları → { başlık: ana görsel dosya adı } */
async function maddeDosyalari(basliklar, o) {
  const sonuc = {};
  for (const parti of parcala(basliklar, PARTI)) {
    const d = await getJson(
      `https://tr.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageimages&piprop=name&pilimit=${PARTI}&titles=${encodeURIComponent(parti.join('|'))}`,
      o,
    );
    const coz = cozumleyici(d.query);
    const sayfalar = new Map((d.query?.pages || []).map((p) => [p.title, p.pageimage]));
    for (const b of parti) {
      const dosya = sayfalar.get(coz(b));
      if (dosya) sonuc[b] = dosya;
    }
  }
  return sonuc;
}

/** Dosya adları → { dosya: görsel nesnesi | null (özgür değil / Commons'ta yok) } */
export async function dosyaBilgileri(dosyalar, o) {
  const sonuc = {};
  for (const parti of parcala(dosyalar, PARTI)) {
    const d = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1024&titles=${encodeURIComponent(parti.map((f) => `File:${f}`).join('|'))}`,
      o,
    );
    const coz = cozumleyici(d.query);
    const sayfalar = new Map((d.query?.pages || []).map((p) => [p.title, p.imageinfo?.[0]]));
    for (const dosya of parti) {
      const ii = sayfalar.get(coz(`File:${dosya}`));
      const meta = ii?.extmetadata || {};
      const lisans = htmlTemizle(meta.LicenseShortName?.value);
      sonuc[dosya] = ii && OZGUR_LISANS.test(lisans)
        ? {
          tur: 'wikimedia',
          url: ii.thumburl || ii.url,
          kaynakUrl: ii.descriptionurl,
          yazar: htmlTemizle(meta.Artist?.value) || 'Bilinmiyor',
          lisans,
          lisansUrl: meta.LicenseUrl?.value || null,
          dosya,
          guncelleme: new Date().toISOString(),
        }
        : null;
    }
  }
  return sonuc;
}

/**
 * Uygun mekanların görsellerini toplu olarak yeniler.
 * @param secenek { fetchFn, bekleme } (testlerde sahte fetch / bekleme) ya da doğrudan fetchFn
 * @returns rapor: [{ mekanId, durum: 'guncellendi'|'atlandi'|'bulunamadi'|'hata', neden }]
 */
export async function gorselleriYenile(mekanlar, guncelle, secenek = {}) {
  const opts = typeof secenek === 'function' ? { fetchFn: secenek } : secenek;
  const o = { fetchFn: opts.fetchFn || fetch, bekleme: opts.bekleme || bekle };

  const sayac = {};
  for (const m of mekanlar) {
    const b = gorselBasligi(m);
    if (b) sayac[b] = (sayac[b] || 0) + 1;
  }

  const rapor = [];
  const uygun = [];
  for (const m of mekanlar) {
    const baslik = gorselBasligi(m);
    if (m.gorsel?.tur === 'yukleme') rapor.push({ mekanId: m.id, durum: 'atlandi', neden: 'Elle seçilmiş kapak' });
    else if (m.gorselMaddesi === null) {
      // Önceki bir yenilemeden kalan (yanlış konulu) Wikimedia görseli temizlenir.
      if (m.gorsel?.tur === 'wikimedia') await guncelle(m.id, { gorsel: null });
      rapor.push({
        mekanId: m.id,
        durum: 'atlandi',
        neden: `Kaynak madde mekanın kendisini anlatmıyor${m.gorsel?.tur === 'wikimedia' ? ' (önceki görsel kaldırıldı)' : ''}`,
      });
    }
    else if (!baslik) rapor.push({ mekanId: m.id, durum: 'atlandi', neden: 'Wikipedia kaynağı yok' });
    else if (sayac[baslik] > 1) rapor.push({ mekanId: m.id, durum: 'atlandi', neden: `"${baslik}" maddesi birden çok mekanda` });
    else uygun.push({ m, baslik });
  }
  if (!uygun.length) return rapor;

  let dosyalar;
  let bilgiler;
  try {
    dosyalar = await maddeDosyalari(uygun.map((u) => u.baslik), o);
    bilgiler = await dosyaBilgileri([...new Set(Object.values(dosyalar))], o);
  } catch (err) {
    for (const { m } of uygun) rapor.push({ mekanId: m.id, durum: 'hata', neden: err.message });
    return rapor;
  }

  for (const { m, baslik } of uygun) {
    const dosya = dosyalar[baslik];
    const g = dosya ? bilgiler[dosya] : null;
    if (!dosya) { rapor.push({ mekanId: m.id, durum: 'bulunamadi', neden: 'Maddenin ana görseli yok' }); continue; }
    if (!g) { rapor.push({ mekanId: m.id, durum: 'bulunamadi', neden: `${dosya}: özgür lisanslı değil ya da Commons'ta yok` }); continue; }
    try {
      await guncelle(m.id, { gorsel: g });
      rapor.push({ mekanId: m.id, durum: 'guncellendi', neden: `${g.dosya} (${g.lisans})` });
    } catch (err) {
      rapor.push({ mekanId: m.id, durum: 'hata', neden: err.message });
    }
  }
  return rapor;
}
