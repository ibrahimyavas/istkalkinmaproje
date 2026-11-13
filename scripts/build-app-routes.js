#!/usr/bin/env node
// Uygulamanın rotalarını (server/src/data/rotalar.js) yerel Valhalla ile hesaplar ve
// server/src/data/routes-geo/<rotaId>.json olarak yazar. mapService bu dosyaları okur.
//
//   node scripts/build-app-routes.js [--valhalla http://localhost:8002]
//
// Uygulamanın erişilebilir modu merdivenli/dik yokuşlu DURAKLARI rotadan çıkarır;
// build-routes.js ise erişilebilir profili aynı duraklar üzerinde çalıştırır. Bu yüzden
// her rota iki kez hesaplanır:
//   <id>          → tüm duraklar, NORMAL profil
//   <id>--eris    → atlanmayan duraklar, ERİŞİLEBİLİR profil
// Hesaplama build-routes.js'e bırakılır (Valhalla yoksa orada hata verir, sahte veri yazılmaz).
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { rotalar } from '../server/src/data/rotalar.js';
import { mekanlar } from '../server/src/data/mekanlar.js';
import { atlanirMi } from '../server/src/services/mapService.js';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GECICI = path.join(kok, 'scripts', 'out', 'app');
const HEDEF = path.join(kok, 'server', 'src', 'data', 'routes-geo');
const ERIS = '--eris';

const { values } = parseArgs({ options: { valhalla: { type: 'string' } } });

const mekan = (id) => {
  const m = mekanlar.find((x) => x.id === id);
  if (!m) throw new Error(`Rotada bilinmeyen mekan: ${id}`);
  return m;
};
const durak = (m) => ({ id: m.id, ad: m.ad, lat: m.lat, lon: m.lon });

const girdiler = [];
for (const r of rotalar) {
  const tum = r.duraklar.map((d) => mekan(d.mekanId));
  const aktif = tum.filter((m) => !atlanirMi(m));
  girdiler.push({ id: r.id, ad: r.ad, duraklar: tum.map(durak) });
  if (aktif.length >= 2) girdiler.push({ id: r.id + ERIS, ad: `${r.ad} (erişilebilir)`, duraklar: aktif.map(durak) });
  else console.warn(`! ${r.id}: erişilebilir modda ${aktif.length} durak kalıyor; erişilebilir rota hesaplanmayacak.`);
}

await mkdir(GECICI, { recursive: true });
const girdiYolu = path.join(GECICI, 'girdi.json');
await writeFile(girdiYolu, JSON.stringify({ rotalar: girdiler }, null, 2));

const args = [path.join(kok, 'scripts', 'build-routes.js'), '--in', girdiYolu, '--out', GECICI];
if (values.valhalla) args.push('--valhalla', values.valhalla);
const sonuc = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (sonuc.status !== 0) process.exit(sonuc.status ?? 1);

const oku = async (id) => JSON.parse(await readFile(path.join(GECICI, `${id}.json`), 'utf8'));

// build-routes.js çıktısındaki bir profili uygulama biçimine çevirir.
const profil = (cikti, hangi) => {
  const o = hangi === 'normal' ? cikti : cikti.erisilebilirOzet;
  return {
    durakIdler: cikti.duraklar.map((d) => d.id),
    geometri: cikti[hangi],
    mesafeM: o.mesafeM,
    sureDk: o.sureDk,
    egimProfili: o.egimProfili,
    egimOzeti: o.egimOzeti,
    zorluk: o.zorluk,
    merdivenM: o.merdivenM,
  };
};

await mkdir(HEDEF, { recursive: true });
for (const r of rotalar) {
  const normal = await oku(r.id);
  const eris = girdiler.some((g) => g.id === r.id + ERIS) ? await oku(r.id + ERIS) : null;
  const dosya = {
    id: r.id,
    normal: profil(normal, 'normal'),
    erisilebilir: eris ? profil(eris, 'erisilebilir') : null,
    kaynak: normal.kaynak,
  };
  await writeFile(path.join(HEDEF, `${r.id}.json`), JSON.stringify(dosya));
  const e = dosya.erisilebilir;
  console.log(
    `✓ ${r.id}: normal ${dosya.normal.mesafeM} m (${dosya.normal.zorluk}, merdiven ${dosya.normal.merdivenM} m)` +
      (e ? ` · erişilebilir ${e.mesafeM} m (${e.zorluk}, merdiven ${e.merdivenM} m)` : ''),
  );
}
console.log(`\nYazıldı: ${path.relative(kok, HEDEF)}`);
