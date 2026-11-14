#!/usr/bin/env node
// Vikipedi'deki "İstanbul'daki müzeler listesi"nden demo semtlerinde kalan müzeleri mekan
// olarak içe aktarır. Tek seferlik çalıştırılır; canlı site Vikipedi'ye istek atmaz.
//
//   node scripts/muzeler.js            (ham veri scripts/out'ta önbelleğe alınır)
//   node scripts/muzeler.js --yenile   (Vikipedi/Vikiveri'den yeniden çek)
//   node scripts/muzeler.js --kuru     (dosya yazmadan listeler)
//
// Kaynaklar ve lisans:
// - Liste: tr.wikipedia.org (CC BY-SA 4.0). Yalnızca olgusal alanlar alınır: müze adı, ilçe, tür.
//   Listedeki açıklama metinleri alınmaz; her kayıt müzenin Vikipedi maddesine bağlanır.
// - Koordinat (P625) ve resmî site (P856): Vikiveri (CC0).
// - İstekler MediaWiki API'siyle, kendi User-Agent'ımızla ve toplu (50'şer) atılır.
//
// Süzme: müze, uygulamadaki bir kültür mekanına semtin yarıçapı kadar yakınsa ve listedeki
// ilçesi semtin ilçesiyle uyuşuyorsa o semte atanır. Mevcut bir mekanla aynı yerdeyse
// (aynı Vikipedi maddesi, aynı ad ya da 40 m içinde) eklenmez.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { mekanlar } from '../server/src/data/mekanlar.js';
import { haversine } from '../server/src/utils/geo.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LISTE = "İstanbul'daki müzeler listesi";
const WP = 'https://tr.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const UA = 'Proje404-veri-betigi/1.0 (tek seferlik icerik aktarimi; Node fetch)';
const BEKLE_MS = 1000;

const SEMT_YARICAP_M = { sultanahmet: 1000, balat: 1000, kuzguncuk: 800, uskudar: 1000, kadikoy: 1000, burgazada: 1500 };
const SEMT_ILCE = { sultanahmet: 'Fatih', balat: 'Fatih', kuzguncuk: 'Üsküdar', uskudar: 'Üsküdar', kadikoy: 'Kadıköy', burgazada: 'Adalar' };
const AYNI_YER_M = 40; // yalnızca neredeyse aynı nokta; yan yana müzeler (Ayasofya–Aya İrini) ayrı kalır

const { values: arg } = parseArgs({ options: { yenile: { type: 'boolean', default: false }, kuru: { type: 'boolean', default: false } } });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url, params) {
  const u = `${url}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const yanit = await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
  if (!yanit.ok) throw new Error(`${url}: HTTP ${yanit.status}`);
  return yanit.json();
}

/** Vikimetin tablosundan satırlar: [[Madde|Ad]], ilçe, adres, tür. */
function satirlar(vikimetin) {
  const tablo = vikimetin.slice(vikimetin.indexOf('{|'), vikimetin.lastIndexOf('|}'));
  const list = [];
  for (const blok of tablo.split(/\n\|-/).slice(1)) {
    const hucreler = blok.split(/\n\|(?!\})/).map((h) => h.trim()).filter((_, i) => i > 0);
    const [isim = '', , konum = '', adres = '', tur = ''] = hucreler;
    const link = isim.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    if (!link) continue;
    list.push({
      madde: link[1].trim(),
      ad: (link[2] || link[1]).replace(/\s*\([^)]*\)\s*$/, '').trim(),
      ilce: konum.replace(/\[\[|\]\]/g, '').split('|').pop().trim(),
      adres: adres.replace(/\n/g, ', ').replace(/\[\[|\]\]/g, '').trim(),
      tur: tur.split('\n').map((t) => t.trim()).filter(Boolean),
    });
  }
  return list;
}

const parcala = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// ── Çek (önbellekli) ─────────────────────────────────────
const HAM = path.join(KOK, 'scripts/out/muzeler-ham.json');
let ham;
if (!arg.yenile && fs.existsSync(HAM)) {
  ham = JSON.parse(fs.readFileSync(HAM, 'utf8'));
  console.log(`önbellekten ${ham.length} müze`);
} else {
  const sayfa = await api(WP, { action: 'parse', page: LISTE, prop: 'wikitext|revid' });
  const revid = sayfa.parse.revid;
  ham = satirlar(sayfa.parse.wikitext);
  console.log(`listede ${ham.length} müze (sürüm ${revid})`);

  // Madde → Vikiveri kimliği (yönlendirmeler izlenir)
  const qid = new Map();
  for (const grup of parcala(ham.map((m) => m.madde), 50)) {
    await bekle(BEKLE_MS);
    const r = await api(WP, { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: grup.join('|') });
    const yon = new Map([...(r.query.normalized || []), ...(r.query.redirects || [])].map((x) => [x.from, x.to]));
    const sayfaQ = new Map((r.query.pages || []).map((p) => [p.title, { q: p.pageprops?.wikibase_item, baslik: p.title }]));
    for (const t of grup) {
      let son = t;
      for (let i = 0; i < 3 && yon.has(son); i++) son = yon.get(son);
      if (sayfaQ.get(son)?.q) qid.set(t, sayfaQ.get(son));
    }
  }

  // Vikiveri: koordinat ve resmî site
  const ozellik = new Map();
  for (const grup of parcala([...new Set([...qid.values()].map((x) => x.q))], 50)) {
    await bekle(BEKLE_MS);
    const r = await api(WD, { action: 'wbgetentities', ids: grup.join('|'), props: 'claims' });
    for (const [id, e] of Object.entries(r.entities || {})) {
      const koor = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      const site = e.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
      ozellik.set(id, { lat: koor?.latitude ?? null, lon: koor?.longitude ?? null, resmiSite: site || null });
    }
  }
  ham = ham.map((m) => {
    const q = qid.get(m.madde);
    return { ...m, revid, madde: q?.baslik || m.madde, wikidata: q?.q || null, ...(q ? ozellik.get(q.q) : {}) };
  });
  fs.mkdirSync(path.dirname(HAM), { recursive: true });
  fs.writeFileSync(HAM, JSON.stringify(ham, null, 2));
}

// ── Süz ve dönüştür ──────────────────────────────────────
const kultur = mekanlar.filter((m) => m.tur !== 'atolye');
const maddeOf = (url) => { try { return decodeURIComponent(new URL(url).pathname.split('/wiki/')[1] || '').replace(/_/g, ' '); } catch { return ''; } };
const mevcutMaddeler = new Set(mekanlar.map((m) => maddeOf(m.kaynak)));
const adAnahtari = (s) => s.toLocaleLowerCase('tr').replace(/\(.*?\)|müzesi|müze|[^a-zçğıöşü0-9]/g, '');
const mevcutAdlar = new Set(mekanlar.map((m) => adAnahtari(m.ad)));

function semtBul(n, ilce) {
  let en = null;
  for (const m of kultur) {
    const d = haversine(n, m);
    if (d <= SEMT_YARICAP_M[m.semtId] && SEMT_ILCE[m.semtId] === ilce && (!en || d < en.d)) en = { semtId: m.semtId, d };
  }
  return en?.semtId || null;
}

const slug = (s) => s
  .toLocaleLowerCase('tr')
  .replace(/[çğıöşüâîû]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48);

const sayac = { konumsuz: 0, semtDisi: 0, mevcut: 0 };
const kayitlar = [];
for (const m of ham) {
  if (m.lat == null) { sayac.konumsuz += 1; continue; }
  const semtId = semtBul(m, m.ilce);
  if (!semtId) { sayac.semtDisi += 1; continue; }
  if (mevcutMaddeler.has(m.madde) || mevcutAdlar.has(adAnahtari(m.ad)) || mekanlar.some((x) => haversine(m, x) < AYNI_YER_M && x.tur !== 'atolye')) { sayac.mevcut += 1; continue; }
  const turMetni = m.tur.length ? m.tur.join(', ').toLocaleLowerCase('tr') : null;
  kayitlar.push({
    id: `muze-${slug(m.ad)}`,
    semtId,
    tur: 'muze',
    ad: m.ad,
    lat: Math.round(m.lat * 1e5) / 1e5,
    lon: Math.round(m.lon * 1e5) / 1e5,
    adres: m.adres ? `${m.adres}, ${m.ilce}` : m.ilce,
    kisa: turMetni ? `Müze (${turMetni}). Ziyaret saatleri ve bilet için resmî siteye bakın.` : 'Müze. Ziyaret saatleri ve bilet için resmî siteye bakın.',
    erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: null, not: 'Erişim bilgisi yok; yerinde doğrulanacak.' },
    kaynak: `https://tr.wikipedia.org/wiki/${encodeURIComponent(m.madde.replace(/ /g, '_'))}`,
    resmiSite: m.resmiSite || null,
    wikidata: m.wikidata,
    konumKaynagi: `Vikiveri ${m.wikidata} (P625)`,
    dogrulandi: false,
  });
}
kayitlar.sort((a, b) => a.semtId.localeCompare(b.semtId) || a.ad.localeCompare(b.ad, 'tr'));

const ozet = Object.entries(kayitlar.reduce((t, k) => ({ ...t, [k.semtId]: (t[k.semtId] || 0) + 1 }), {}));
for (const k of kayitlar) console.log(k.semtId.padEnd(12), k.ad.padEnd(52).slice(0, 52), k.resmiSite ? '🌐' : '');
console.log(`${ham.length} müze · konumsuz ${sayac.konumsuz} · semt dışı ${sayac.semtDisi} · zaten var ${sayac.mevcut} · eklenecek ${kayitlar.length}:`, ozet.map(([s, n]) => `${s} ${n}`).join(', '));

if (!arg.kuru) {
  const hedef = path.join(KOK, 'server/src/data/muzeler.js');
  fs.writeFileSync(hedef, `// Demo semtlerindeki müzeler: Vikipedi "${LISTE}" (sürüm ${ham[0]?.revid ?? '?'}, CC BY-SA 4.0)
// ve Vikiveri (CC0). scripts/muzeler.js ile ${new Date().toISOString().slice(0, 10)} tarihinde üretildi; elle düzenlemeyin.
// Yalnızca ad, ilçe, tür, koordinat ve resmî site alındı; açıklama metni kendi kalıbımız.
export const muzeler = ${JSON.stringify(kayitlar, null, 2)};
`);
  console.log('yazıldı:', path.relative(KOK, hedef));
}
