// İstanbul'un 39 ilçe ve mahalle sınırlarını açık kaynak (OSM/TKGM/İBB) GeoJSON kaynaklarından indirir.
// Çıktılar: scripts/.cache/ilceler.geojson ve scripts/.cache/mahalleler.geojson

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Proje404-IstanbulAtlas/1.0', Accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const text = await res.text();
  if (text.startsWith('version https://git-lfs.github.com')) {
    throw new Error('Git LFS pointer (media.githubusercontent.com kullanılmalı)');
  }
  return JSON.parse(text);
}

async function tryUrls(label, urls, minCount = 1) {
  for (const url of urls) {
    try {
      console.log(`[${label}] deneniyor: ${url}`);
      const data = await fetchJson(url);
      if (data?.type === 'FeatureCollection' && Array.isArray(data.features) && data.features.length >= minCount) {
        console.log(`[${label}] OK -> ${data.features.length} özellik`);
        return data;
      }
      console.warn(`[${label}] yetersiz özellik (${data?.features?.length ?? 0})`);
    } catch (err) {
      console.warn(`[${label}] atlandı (${err.message})`);
    }
  }
  return null;
}

async function main() {
  await fs.mkdir(CACHE_DIR, { recursive: true });

  const ilceCache = path.join(CACHE_DIR, 'ilceler.geojson');
  let ilceler = null;
  try {
    ilceler = JSON.parse(await fs.readFile(ilceCache, 'utf8'));
    console.log(`[ilceler] önbellekten yüklendi (${ilceler.features.length} özellik)`);
  } catch {
    ilceler = await tryUrls('ilceler', [
      'https://raw.githubusercontent.com/sahircansurmeli/istanbul-geojson/master/ilce_geojson.json',
      'https://media.githubusercontent.com/media/izzetkalic/geojsons-of-turkey/master/geojsons/istanbul-admin-level-6.geojson',
    ], 35);
  }

  const mahalleler = await tryUrls('mahalleler', [
    'https://media.githubusercontent.com/media/izzetkalic/geojsons-of-turkey/master/geojsons/istanbul-admin-level-8-without-centers.geojson',
    'https://media.githubusercontent.com/media/izzetkalic/geojsons-of-turkey/master/geojsons/istanbul-admin-level-8.geojson',
    'https://media.githubusercontent.com/media/izzetkalic/geojsons-of-turkey/master/geojsons/istanbul-neighbourhood-tkgm.geojson',
  ], 700);

  if (!ilceler) throw new Error('İlçe GeoJSON indirilemedi');
  if (!mahalleler) throw new Error('Mahalle GeoJSON indirilemedi');

  await fs.writeFile(path.join(CACHE_DIR, 'ilceler.geojson'), JSON.stringify(ilceler));
  await fs.writeFile(path.join(CACHE_DIR, 'mahalleler.geojson'), JSON.stringify(mahalleler));

  console.log('\n--- ÖZET ---');
  console.log('İlçe sayısı:', ilceler.features.length);
  console.log('Örnek ilçe özellikleri:', JSON.stringify(ilceler.features[0]?.properties));
  console.log('Mahalle sayısı:', mahalleler.features.length);
  console.log('Örnek mahalle özellikleri:', JSON.stringify(mahalleler.features[0]?.properties));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
