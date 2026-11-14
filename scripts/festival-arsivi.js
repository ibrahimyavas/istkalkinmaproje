#!/usr/bin/env node
// İstanbul Kültür Yolu Festivali 2026 (26 Eylül – 4 Ekim) programını geçmiş etkinlik arşivi
// olarak içe aktarır. Tek seferlik çalıştırılır; canlı site festival sitesine istek atmaz.
//
//   node scripts/festival-arsivi.js            (ham sayfalar scripts/out'ta önbelleğe alınır)
//   node scripts/festival-arsivi.js --yenile   (festival sitesinden yeniden çek)
//
// Kurallar: yalnızca olgusal alanlar alınır (etkinlik adı, türü, tarihi, yeri, ücretli/ücretsiz,
// festival sayfasına bağlantı). Tanıtım metni ve görsel alınmaz. İstekler 2 sn arayla atılır.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FESTIVAL = 'istanbul-kultur-yolu-festivali-2026';
const LISTE = `https://kulturyolufestivali.com/etkinlikler?Festival=${FESTIVAL}&Gecmis=1`;
const UA = 'Proje404-veri-betigi/1.0 (tek seferlik icerik aktarimi)';
const BEKLE_MS = 2000;
const AZAMI_SAYFA = 30;

const { values: arg } = parseArgs({ options: { yenile: { type: 'boolean', default: false } } });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const varlik = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const coz = (s) => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, k) => {
    if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return varlik[k] ?? m;
  })
  .replace(/[​-‏⁠﻿]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
function tarihCoz(metin) {
  const m = metin.match(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/u);
  if (!m) return null;
  const ay = AYLAR.findIndex((a) => a.toLocaleLowerCase('tr') === m[2].toLocaleLowerCase('tr'));
  if (ay < 0) return null;
  return `${m[3]}-${String(ay + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Festival türleri → uygulamadaki etkinlik türleri (bilinmeyenler 'festival').
const TUR = {
  konser: 'konser', resital: 'konser', dinleti: 'konser',
  tiyatro: 'tiyatro', 'çocuk oyunu': 'tiyatro', müzikal: 'tiyatro', 'çocuk müzikali': 'tiyatro',
  'opera/bale/müzikal': 'tiyatro', opera: 'tiyatro', bale: 'tiyatro', 'çocuk operası': 'tiyatro', dans: 'tiyatro', 'modern dans': 'tiyatro', 'dans/flamenko': 'tiyatro',
  sergi: 'sergi', mapping: 'sergi',
  atölye: 'atolye', workshop: 'atolye', 'çocuk atölyesi': 'atolye', 'model uçak atölyesi': 'atolye', çalıştay: 'atolye',
  söyleşi: 'soylesi', panel: 'soylesi', konferans: 'soylesi',
  gezi: 'yuruyus', gastronomi: 'festival',
};

function kartlar(html) {
  const list = [];
  const parcalar = html.split(/<a href="(https:\/\/kulturyolufestivali\.com\/etkinlik\/[^"]+)"/).slice(1);
  for (let i = 0; i < parcalar.length; i += 2) {
    const link = parcalar[i];
    const g = parcalar[i + 1];
    if (!g.includes('card-activ')) continue;
    const sehir = coz(g.match(/class="city"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
    const ucret = coz(g.match(/class="fee[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '');
    const baslik = coz(g.match(/<h2>([\s\S]*?)<\/h2>/)?.[1] || '');
    // details: tür, tarih ("25 Eylül 2026 (50 g. önce)"), yer; ilk üç <div> yeterli.
    const detaylar = g.slice(g.indexOf('class="details">'));
    const detay = [...detaylar.matchAll(/<div>([\s\S]*?)<\/div>/g)].slice(0, 3).map((m) => coz(m[1].replace(/<span[\s\S]*?<\/span>/g, '')));
    const [turAd = '', tarihMetni = '', yer = ''] = detay;
    list.push({ link, sehir, ucret, baslik, turAd, tarih: tarihCoz(tarihMetni), yer });
  }
  return list;
}

// ── Çek ──────────────────────────────────────────────────
const HAM = path.join(KOK, 'scripts/out/festival-arsivi-ham.json');
let ham;
if (!arg.yenile && fs.existsSync(HAM)) {
  ham = JSON.parse(fs.readFileSync(HAM, 'utf8'));
  console.log(`önbellekten ${ham.length} kart`);
} else {
  ham = [];
  for (let n = 1; n <= AZAMI_SAYFA; n++) {
    if (n > 1) await bekle(BEKLE_MS);
    const yanit = await fetch(`${LISTE}&page=${n}`, { headers: { 'User-Agent': UA } });
    if (!yanit.ok) throw new Error(`Sayfa ${n}: HTTP ${yanit.status}`);
    const yeni = kartlar(await yanit.text()).filter((k) => !ham.some((h) => h.link === k.link));
    if (!yeni.length) break;
    ham.push(...yeni);
    process.stdout.write(`\rsayfa ${n} · ${ham.length} kart`);
  }
  console.log();
  fs.mkdirSync(path.dirname(HAM), { recursive: true });
  fs.writeFileSync(HAM, JSON.stringify(ham, null, 2));
}

// Uygulamada kaydı olan mekanlarda geçen etkinlikler o mekana ve semte bağlanır.
const MEKAN_ESLE = [
  [/Türk ve İslam Eserleri Müzesi/i, { mekanId: 'tiem', semtId: 'sultanahmet' }],
  [/Süreyya Operası/i, { mekanId: 'sureyya-operasi', semtId: 'kadikoy' }],
  [/Barış Manço/i, { mekanId: 'baris-manco-evi', semtId: 'kadikoy' }],
  [/Sait Faik/i, { mekanId: 'sait-faik-muzesi', semtId: 'burgazada' }],
];
const esle = (yer) => MEKAN_ESLE.find(([re]) => re.test(yer || ''))?.[1] || { mekanId: null, semtId: null };

// ── Dönüştür ─────────────────────────────────────────────
const kayitlar = ham
  .filter((k) => k.sehir === 'İstanbul' && k.baslik && k.tarih)
  .sort((a, b) => a.tarih.localeCompare(b.tarih) || a.baslik.localeCompare(b.baslik, 'tr'))
  .map((k) => ({
    id: `kyf-${k.link.split('/').pop().slice(0, 60)}`,
    baslik: k.baslik,
    tur: TUR[k.turAd.toLocaleLowerCase('tr')] || 'festival',
    turAd: k.turAd,
    baslangic: `${k.tarih}T00:00:00+03:00`,
    tumGun: true, // saat bilgisi listede yok
    mekanAd: k.yer || null,
    ...esle(k.yer),
    ucretsiz: /ücretsiz/i.test(k.ucret) ? true : /ücretli/i.test(k.ucret) ? false : null,
    erisilebilir: null,
    festival: 'İstanbul Kültür Yolu Festivali 2026',
    kaynak: k.link,
    gercek: true,
    arsiv: true,
    dogrulandi: false,
    ornek: false,
  }));

const hedef = path.join(KOK, 'server/src/data/festivalArsivi.js');
fs.writeFileSync(hedef, `// İstanbul Kültür Yolu Festivali 2026 programı (26 Eylül – 4 Ekim), geçmiş etkinlik arşivi.
// scripts/festival-arsivi.js ile ${new Date().toISOString().slice(0, 10)} tarihinde üretildi; elle düzenlemeyin.
// Yalnızca ad, tür, tarih, yer ve ücret bilgisi alındı; her kayıt festival sayfasına bağlanır.
export const festivalArsivi = ${JSON.stringify(kayitlar, null, 2)};
`);
console.log(`${ham.length} kart · ${kayitlar.length} İstanbul etkinliği yazıldı: ${path.relative(KOK, hedef)}`);
