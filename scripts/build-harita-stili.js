#!/usr/bin/env node
// İstanbul PMTiles karoları için MapLibre stilini üretir ve stilin kullandığı yerel
// font (glyph) ve sprite dosyalarını indirir.
//
// Hazırlık (bir kez; proje bağımlılıklarına dokunmaz):
//   npm install --prefix scripts/.harita-arac --no-save --no-package-lock @protomaps/basemaps@5.7.2
//
// Çalıştırma:
//   node scripts/build-harita-stili.js
//   node scripts/build-harita-stili.js --taban https://ornek.com/harita --karo "https://ornek.com/karo/{z}/{x}/{y}"
//
// Çıktılar:
//   infra/harita-stili.json        -> MapLibre stil dosyası (git'e girer)
//   infra/data/harita/fonts/...    -> Noto Sans glyph aralıkları (Protomaps basemaps-assets, OFL)
//   infra/data/harita/sprites/...  -> Protomaps v4 "light" sprite'ı
//
// Stil, Protomaps'in resmi katman tanımlarından (@protomaps/basemaps, BSD-3) üretilir;
// renkler uygulamanın paletine (kâğıt zemin, İznik mavisi vurgu) çevrilir.

import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARAC_KLASORU = path.join(KOK, 'scripts', '.harita-arac');
const STIL_DOSYASI = path.join(KOK, 'infra', 'harita-stili.json');
const VARLIK_KLASORU = path.join(KOK, 'infra', 'data', 'harita');

const VARSAYILAN_TABAN = 'http://localhost:8080'; // infra/docker-compose.yml -> harita (nginx)
const VARSAYILAN_KARO = 'http://localhost:3000/istanbul/{z}/{x}/{y}'; // infra/docker-compose.yml -> martin
const KARO_AZAMI_ZOOM = 15;
const ISTANBUL_SINIRI = [27.95, 40.79, 29.95, 41.6];

const ATIF =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap katkıcıları</a> · ' +
  '<a href="https://protomaps.com" target="_blank">Protomaps</a>';

const VARLIK_KAYNAGI = 'https://protomaps.github.io/basemaps-assets';
const FONTLAR = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
// Latin (Türkçe dahil), Yunanca, Kiril, Ermenice, İbranice, Arapça ve noktalama aralıkları.
// İstanbul'daki etiketlerin tamamı bu aralıklarda; diğer yazı sistemleri gerekmez.
const GLYPH_ARALIKLARI = Array.from({ length: 48 }, (_, i) => `${i * 256}-${i * 256 + 255}`);
const SPRITE_DOSYALARI = ['light.json', 'light.png', 'light@2x.json', 'light@2x.png'];

// ---------------------------------------------------------------------------
// Palet
// ---------------------------------------------------------------------------
const KAGIT = '#F7F4EE';
const IZNIK = '#174C9E';

const PALET = {
  background: KAGIT,
  earth: KAGIT,
  water: '#CAD8EA',
  buildings: '#E9E3D8',
  pier: '#ECE7DE',

  park_a: '#E5EBDC',
  park_b: '#DAE4CE',
  wood_a: '#E3E9D9',
  wood_b: '#D6E1CA',
  scrub_a: '#E8ECDF',
  scrub_b: '#DCE4D1',
  zoo: '#E5EBDC',
  hospital: '#F1E8E4',
  industrial: '#EEEBE5',
  school: '#F1ECE2',
  pedestrian: '#F0ECE4',
  sand: '#F1ECDD',
  beach: '#F2EDDB',
  aerodrome: '#EDEBE6',
  runway: '#E4E0D8',
  military: '#ECE8E1',
  glacier: '#FFFFFF',

  other: '#F2EEE7',
  minor_service: '#F4F1EB',
  minor_a: '#F4F1EB',
  minor_b: '#FFFFFF',
  link: '#FFFFFF',
  major: '#FFFFFF',
  highway: '#FFFFFF',
  railway: '#B4ADA1',
  boundaries: '#B8B0A3',

  roads_label_minor: '#8C8579',
  roads_label_minor_halo: '#FFFFFF',
  roads_label_major: '#787165',
  roads_label_major_halo: '#FFFFFF',
  ocean_label: IZNIK,
  subplace_label: '#7A746A',
  subplace_label_halo: KAGIT,
  city_label: '#2E2B26',
  city_label_halo: KAGIT,
  state_label: '#A39C90',
  state_label_halo: KAGIT,
  country_label: '#8E877B',
  address_label: '#A39C90',
  address_label_halo: '#FFFFFF',

  pois: {
    blue: IZNIK,
    lapis: IZNIK,
    turquoise: '#2F6DB5',
    green: '#56785A',
    pink: '#9E4A5B',
    red: '#9E4A5B',
    slategray: '#6E6878',
    tangerine: '#93693A',
  },
  landcover: {
    grassland: 'rgba(226, 234, 216, 1)',
    barren: 'rgba(242, 236, 222, 1)',
    urban_area: 'rgba(240, 236, 228, 1)',
    farmland: 'rgba(232, 236, 220, 1)',
    glacier: 'rgba(255, 255, 255, 1)',
    scrub: 'rgba(234, 237, 222, 1)',
    forest: 'rgba(218, 228, 206, 1)',
  },
};

// Anahtar adına göre toplu renkler (yol kenarları, tüneller, köprüler).
function paletiUygula(flavor) {
  const sonuc = { ...flavor };
  for (const anahtar of Object.keys(flavor)) {
    if (anahtar.includes('casing')) sonuc[anahtar] = anahtar.includes('highway') ? '#D8D1C3' : '#E2DCD0';
    if (anahtar.startsWith('tunnel_') && !anahtar.includes('casing')) sonuc[anahtar] = '#EEEAE3';
    if (anahtar.startsWith('bridges_') && !anahtar.includes('casing')) sonuc[anahtar] = '#FFFFFF';
  }
  for (const [anahtar, deger] of Object.entries(PALET)) {
    sonuc[anahtar] = typeof deger === 'object' ? { ...flavor[anahtar], ...deger } : deger;
  }
  return sonuc;
}

// Protomaps'in 'tr' ayarı name:tr yoksa name:en'e düşer. İstanbul'da OSM `name` zaten
// Türkçe olduğundan etiketler önce name:tr, sonra name alanından okunur.
const TURKCE_ETIKET = ['coalesce', ['get', 'name:tr'], ['get', 'name']];

function etiketleriTurkceYap(katmanlar) {
  for (const katman of katmanlar) {
    const alan = katman.layout?.['text-field'];
    if (alan && JSON.stringify(alan).includes('"name:tr"')) katman.layout['text-field'] = TURKCE_ETIKET;
  }
  return katmanlar;
}

// ---------------------------------------------------------------------------

async function basemapsYukle() {
  try {
    const require = createRequire(path.join(ARAC_KLASORU, 'package.json'));
    const giris = require.resolve('@protomaps/basemaps');
    const esm = giris.replace(/dist[\\/]cjs[\\/]index\.cjs$/, path.join('dist', 'esm', 'index.js'));
    return await import(pathToFileURL(esm).href);
  } catch {
    throw new Error(
      '@protomaps/basemaps bulunamadı. Önce şunu çalıştırın:\n' +
        '  npm install --prefix scripts/.harita-arac --no-save --no-package-lock @protomaps/basemaps@5.7.2',
    );
  }
}

async function varMi(dosya) {
  try {
    await access(dosya);
    return true;
  } catch {
    return false;
  }
}

async function indir(url, hedef) {
  if (await varMi(hedef)) return 'var';
  const yanit = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (yanit.status === 404) return 'yok';
  if (!yanit.ok) throw new Error(`${url} indirilemedi: HTTP ${yanit.status}`);
  await mkdir(path.dirname(hedef), { recursive: true });
  await writeFile(hedef, Buffer.from(await yanit.arrayBuffer()));
  return 'indi';
}

async function varliklariIndir() {
  const isler = [];
  for (const font of FONTLAR) {
    for (const aralik of GLYPH_ARALIKLARI) {
      isler.push([
        `${VARLIK_KAYNAGI}/fonts/${encodeURIComponent(font)}/${aralik}.pbf`,
        path.join(VARLIK_KLASORU, 'fonts', font, `${aralik}.pbf`),
      ]);
    }
  }
  for (const dosya of SPRITE_DOSYALARI) {
    isler.push([`${VARLIK_KAYNAGI}/sprites/v4/${dosya}`, path.join(VARLIK_KLASORU, 'sprites', dosya)]);
  }
  const sayac = { var: 0, indi: 0, yok: 0 };
  // Aynı anda 8 istek.
  for (let i = 0; i < isler.length; i += 8) {
    const sonuclar = await Promise.all(isler.slice(i, i + 8).map(([url, hedef]) => indir(url, hedef)));
    for (const s of sonuclar) sayac[s]++;
  }
  console.log(`Fontlar/sprite: ${sayac.indi} indirildi, ${sayac.var} zaten vardı, ${sayac.yok} kaynakta yok -> ${VARLIK_KLASORU}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      taban: { type: 'string', default: VARSAYILAN_TABAN },
      karo: { type: 'string', default: VARSAYILAN_KARO },
      varliksiz: { type: 'boolean', default: false },
    },
  });
  const taban = values.taban.replace(/\/$/, '');
  const { layers, namedFlavor } = await basemapsYukle();

  const katmanlar = etiketleriTurkceYap(layers('protomaps', paletiUygula(namedFlavor('light')), { lang: 'tr' }));

  const stil = {
    version: 8,
    name: 'Proje 404 — İstanbul kâğıt',
    metadata: {
      'proje404:palet': { kagit: KAGIT, iznik: IZNIK },
      'proje404:kaynak': '@protomaps/basemaps 5 (light) + Protomaps günlük derleme, İstanbul kesiti',
    },
    center: [28.98, 41.03],
    zoom: 11,
    glyphs: `${taban}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${taban}/sprites/light`,
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [values.karo],
        minzoom: 0,
        maxzoom: KARO_AZAMI_ZOOM,
        bounds: ISTANBUL_SINIRI,
        attribution: ATIF,
      },
    },
    layers: katmanlar,
  };

  await writeFile(STIL_DOSYASI, JSON.stringify(stil, null, 2) + '\n', 'utf8');
  console.log(`Stil yazıldı: ${STIL_DOSYASI} (${katmanlar.length} katman)`);
  if (!values.varliksiz) await varliklariIndir(); // --varliksiz: yalnızca stili yaz
}

main().catch((hata) => {
  console.error(`HATA: ${hata.message}`);
  process.exit(1);
});
