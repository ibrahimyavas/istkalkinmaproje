#!/usr/bin/env node
// Türkiye Kültür Yolu Festivali "lezzet noktaları" listesinden (İstanbul) yalnızca demo
// kapsamındaki altı semtte kalan işletmeleri içe aktarır. Tek seferlik çalıştırılır;
// canlı site festival sitesine istek atmaz.
//
//   node scripts/lezzet-noktalari.js            (Photon yerelde :2322'de çalışmalı)
//   node scripts/lezzet-noktalari.js --kuru     (dosya yazmadan özet)
//   node scripts/lezzet-noktalari.js --yenile   (festival sitesinden yeniden çek; yoksa scripts/out önbelleği)
//   LISTE=1 node scripts/lezzet-noktalari.js --kuru   (eşleşen kayıtları adresleriyle listeler)
//
// Kurallar (docs/DEVIR-NOTU.md 5.3):
// - Yalnızca olgusal alanlar alınır: işletme adı ve adres. Festival metni ya da görseli alınmaz.
// - Her kayıtta kaynak bağlantısı vardır ve kayıt "doğrulanacak" (dogrulandi: false) olarak girer.
// - Koordinatlar festivalin Google Haritalar bağlantısından değil, adresten OSM verisiyle
//   (yerel Photon) bulunur. Semte en yakın mevcut mekana uzaklıkla atanır.
// - robots.txt genel taramaya izin veriyor (yalnızca GPTBot engelli). İstekler 2 sn arayla,
//   kendi User-Agent'ımızla atılır.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { mekanlar } from '../server/src/data/mekanlar.js';
import { haversine } from '../server/src/utils/geo.js';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYNAK = 'https://kulturyolufestivali.com/lezzet-noktasi/istanbul';
const API = 'https://kulturyolufestivali.com/lezzet-noktasi/tastes_list/istanbul';
const PHOTON = process.env.PHOTON_URL || 'http://localhost:2322';
const UA = 'Proje404-veri-betigi/1.0 (tek seferlik icerik aktarimi)';
const BEKLE_MS = 2000;
// Bir lezzet noktası, o semtteki bir mekana bu kadar yakınsa semte atanır.
const SEMT_YARICAP_M = { sultanahmet: 900, balat: 900, kuzguncuk: 700, uskudar: 900, kadikoy: 900, burgazada: 1500 };

const { values: arg } = parseArgs({ options: { kuru: { type: 'boolean', default: false }, yenile: { type: 'boolean', default: false } } });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const varlik = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const coz = (s) => s
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, k) => {
    if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return varlik[k] ?? m;
  })
  .replace(/[​-‏⁠﻿]/g, '') // görünmez karakterler (sıfır genişlikli boşluk vb.)
  .replace(/\s+/g, ' ')
  .trim();

// Adres başka bir ilçeyi açıkça anıyorsa kayıt o semte atanmaz (ör. Haliç'in karşısındaki
// Beyoğlu adresleri Balat'a yakın düşer ama Balat değildir).
const SEMT_ILCE = { sultanahmet: 'Fatih', balat: 'Fatih', kuzguncuk: 'Üsküdar', uskudar: 'Üsküdar', kadikoy: 'Kadıköy', burgazada: 'Adalar' };
const ILCELER = ['Fatih', 'Beyoğlu', 'Üsküdar', 'Kadıköy', 'Adalar', 'Beşiktaş', 'Şişli', 'Eyüpsultan', 'Eyüp', 'Zeytinburnu', 'Bakırköy', 'Ataşehir', 'Sarıyer', 'Kağıthane'];
function ilceUyumlu(adres, semtId) {
  const anilan = ILCELER.filter((i) => new RegExp(`(^|[^\\p{L}])${i}([^\\p{L}]|$)`, 'iu').test(adres));
  if (semtId === 'burgazada' && /Burgazada/i.test(adres)) return true;
  return !anilan.length || anilan.includes(SEMT_ILCE[semtId]);
}

async function sayfa(n) {
  const yanit = await fetch(n > 1 ? `${API}?page=${n}` : API, {
    headers: { 'User-Agent': UA, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!yanit.ok) throw new Error(`Sayfa ${n}: HTTP ${yanit.status}`);
  return yanit.json();
}

function kartlar(htmlParca) {
  const list = [];
  for (const kart of htmlParca.split('class="card-flavor').slice(1)) {
    const ad = kart.match(/<h3>([\s\S]*?)<\/h3>/)?.[1];
    const adres = kart.match(/<h6>[\s\S]*?<\/h6>\s*<p>([\s\S]*?)<\/p>/)?.[1];
    if (ad) list.push({ ad: coz(ad), adres: adres ? coz(adres) : '' });
  }
  return list;
}

/** Adresi Photon'un anlayacağı biçime getirir: posta kodu, kapı numarası ve kısaltmalar. */
function temizle(adres) {
  return adres
    .replace(/\b34\d{3}\b/g, ' ')
    .replace(/\/?\s*İstanbul\b|\bTürkiye\b/gi, ' ')
    .replace(/\b(No|Kat|D|Daire)\s*[:.]?\s*[\w/-]+/gi, ' ')
    .replace(/\bMah\.?(?=\s|,|$)/gi, 'Mahallesi')
    .replace(/\bCad\.?(?=\s|,|$)|\bCd\.?(?=\s|,|$)/gi, 'Caddesi')
    .replace(/\bSok\.?(?=\s|,|$)|\bSk\.?(?=\s|,|$)/gi, 'Sokak')
    .replace(/\//g, ', ')
    .replace(/\s*,\s*(,\s*)*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '');
}

async function photon(q) {
  const yanit = await fetch(`${PHOTON}/api?q=${encodeURIComponent(`${q}, İstanbul`)}&limit=1&lang=tr&lat=41.02&lon=28.99`);
  if (!yanit.ok) return null;
  const f = (await yanit.json()).features?.[0];
  if (!f || f.properties?.state !== 'İstanbul') return null;
  const [lon, lat] = f.geometry.coordinates;
  return { lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lon * 1e5) / 1e5, tur: f.properties.type, osm: `${f.properties.osm_type}${f.properties.osm_id}` };
}

// Önce tam adres, sonra sokak + ilçe, sonra ilk parça + ilçe. Mahalle/ilçe düzeyindeki sonuçlar
// (bölge merkezine düşer) kabul edilmez: yanlış semte atanmasınlar.
const KABA = new Set(['city', 'district', 'county', 'state', 'locality']);
async function konumBul(adres) {
  const t = temizle(adres);
  const parca = t.split(', ').filter(Boolean);
  const adaylar = [...new Set([t, parca.length > 2 ? `${parca[1]}, ${parca.at(-1)}` : null, `${parca[0]}, ${parca.at(-1)}`].filter(Boolean))];
  for (const q of adaylar) {
    const k = await photon(q);
    if (k && !KABA.has(k.tur)) return k;
  }
  return null;
}

function semtBul(nokta) {
  let en = null;
  for (const m of mekanlar) {
    if (m.tur === 'lezzet') continue; // semt sınırı yalnızca kültür mekanlarından
    const d = haversine(nokta, m);
    if (d <= SEMT_YARICAP_M[m.semtId] && (!en || d < en.d)) en = { semtId: m.semtId, d };
  }
  return en?.semtId || null;
}

const slug = (s) => s
  .toLocaleLowerCase('tr')
  .replace(/[çğıöşüâî]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' })[c])
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 48);

// ── Çek ──────────────────────────────────────────────────
// Ham liste scripts/out'ta saklanır; --yenile verilmezse siteye yeniden gidilmez.
const HAM = path.join(KOK, 'scripts/out/lezzet-ham.json');
let hepsi;
if (!arg.yenile && fs.existsSync(HAM)) {
  hepsi = JSON.parse(fs.readFileSync(HAM, "utf8")).map((k) => ({ ad: coz(k.ad), adres: coz(k.adres) }));
  console.log(`önbellekten ${hepsi.length} kayıt (${path.relative(KOK, HAM)})`);
} else {
  const ilk = await sayfa(1);
  const sonSayfa = Math.max(1, ...[...(ilk.pagination || '').matchAll(/page=(\d+)/g)].map((m) => Number(m[1])));
  hepsi = kartlar(ilk.cards || '');
  for (let n = 2; n <= sonSayfa; n++) {
    await bekle(BEKLE_MS);
    hepsi.push(...kartlar((await sayfa(n)).cards || ''));
    process.stdout.write(`\rsayfa ${n}/${sonSayfa} · ${hepsi.length} kayıt`);
  }
  console.log();
  fs.mkdirSync(path.dirname(HAM), { recursive: true });
  fs.writeFileSync(HAM, JSON.stringify(hepsi, null, 2));
}

// ── Konumla ve süz ───────────────────────────────────────
const secilen = [];
let konumsuz = 0;
for (const k of hepsi) {
  const konum = k.adres ? await konumBul(k.adres) : null;
  if (!konum) { konumsuz += 1; continue; }
  const semtId = semtBul(konum);
  if (!semtId || !ilceUyumlu(k.adres, semtId)) continue;
  secilen.push({ ...k, ...konum, semtId });
}

const kullanilan = new Set();
const kayitlar = secilen
  .sort((a, b) => a.semtId.localeCompare(b.semtId) || a.ad.localeCompare(b.ad, 'tr'))
  .map((k) => {
    let id = `lezzet-${slug(k.ad)}`;
    while (kullanilan.has(id)) id += '-2';
    kullanilan.add(id);
    return {
      id,
      semtId: k.semtId,
      tur: 'lezzet',
      ad: k.ad,
      adres: k.adres,
      lat: k.lat,
      lon: k.lon,
      kisa: 'Türkiye Kültür Yolu Festivali 2026 listesindeki lezzet noktalarından.',
      erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: null, not: 'Erişim bilgisi yok; yerinde doğrulanacak.' },
      kaynak: KAYNAK,
      konumKaynagi: `OSM / Photon (${k.osm}, ${k.tur})`,
      dogrulandi: false,
    };
  });

const ozet = Object.entries(kayitlar.reduce((t, k) => ({ ...t, [k.semtId]: (t[k.semtId] || 0) + 1 }), {}));
if (process.env.LISTE) for (const k of kayitlar) console.log(k.semtId.padEnd(12), k.ad.slice(0,34).padEnd(35), k.adres.slice(0,70), k.konumKaynagi.split(', ')[1]);
console.log(`${hepsi.length} kayıt · ${konumsuz} adres bulunamadı · ${kayitlar.length} kayıt semtlere düştü:`, ozet.map(([s, n]) => `${s} ${n}`).join(', '));

if (!arg.kuru) {
  const hedef = path.join(KOK, 'server/src/data/lezzetNoktalari.js');
  const bugun = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(hedef, `// Türkiye Kültür Yolu Festivali lezzet noktaları (İstanbul), yalnızca demo semtlerinde kalanlar.
// scripts/lezzet-noktalari.js ile ${bugun} tarihinde üretildi; elle düzenlemeyin, betiği yeniden çalıştırın.
// Yalnızca ad ve adres alındı (olgusal bilgi); açıklama kendi metnimiz. Kaynak: ${KAYNAK}
// Koordinatlar adresten OSM verisiyle bulundu, yaklaşıktır. Hepsi "doğrulanacak".
export const lezzetNoktalari = ${JSON.stringify(kayitlar, null, 2)};
`);
  console.log('yazıldı:', path.relative(KOK, hedef));
}
