#!/usr/bin/env node
// Photon'un Türkiye JSONL dökümünü yalnızca İstanbul ili kayıtlarına indirger.
//
//   node scripts/photon-istanbul.js
//   node scripts/photon-istanbul.js --in <turkiye.jsonl.zst> --out <istanbul.jsonl>
//
// Girdi:  infra/data/photon/photon-dump-turkey-1.0-latest.jsonl.zst
//         (https://download1.graphhopper.com/public/europe/turkey/, ~143 MB, zstd)
// Çıktı:  infra/data/photon/photon-istanbul.jsonl (düz JSONL; photon import -import-file ile okunur)
//
// Süzme ölçütü: address.state === 'İstanbul'. İl sınırına bağlı olduğu için bbox'tan doğrudur
// (bbox Kocaeli ve Tekirdağ'dan parçalar içerir). Adresinde il bilgisi olmayan kayıtlar (ör. ilin
// kendisi) merkez noktası İstanbul kutusundaysa alınır. Başlık satırları (NominatimDumpFile,
// CountryInfo) olduğu gibi korunur. Node 22.15+ (yerleşik zstd) gerekir.

import { createReadStream, createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { createZstdDecompress } from 'node:zlib';
import { parseArgs } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IL = 'İstanbul';
const KUTU = { minLon: 27.95, minLat: 40.79, maxLon: 29.95, maxLat: 41.6 };

// readline U+2028/U+2029'u da satır sonu sayar; bu karakterler bazı OSM adlarında geçtiği için
// satırlar yalnızca '\n' karakterinde bölünür.
async function* satirlaraBol(akis) {
  akis.setEncoding('utf8');
  let artan = '';
  for await (const parca of akis) {
    const satirlar = (artan + parca).split('\n');
    artan = satirlar.pop();
    yield* satirlar;
  }
  if (artan) yield artan;
}

function istanbulMu(yer) {
  const il = yer.address?.state;
  if (il) return il === IL;
  const [lon, lat] = yer.centroid || [];
  return lon >= KUTU.minLon && lon <= KUTU.maxLon && lat >= KUTU.minLat && lat <= KUTU.maxLat;
}

async function main() {
  const { values } = parseArgs({
    options: {
      in: { type: 'string', default: path.join(KOK, 'infra/data/photon/photon-dump-turkey-1.0-latest.jsonl.zst') },
      out: { type: 'string', default: path.join(KOK, 'infra/data/photon/photon-istanbul.jsonl') },
    },
  });

  const girdi = createReadStream(values.in);
  girdi.on('error', (h) => {
    console.error(`HATA: ${values.in} okunamadı (${h.code}). İndirme komutu: infra/README.md, Photon adımı.`);
    process.exit(1);
  });
  const satirlar = satirlaraBol(girdi.pipe(createZstdDecompress()));
  const cikti = createWriteStream(values.out);

  let okunan = 0;
  let yazilan = 0;
  for await (const satir of satirlar) {
    if (!satir.trim()) continue;
    const kayit = JSON.parse(satir);
    let yaz = null;
    if (kayit.type !== 'Place') {
      yaz = satir;
    } else {
      okunan++;
      const secilen = kayit.content.filter(istanbulMu);
      if (secilen.length === kayit.content.length) yaz = satir;
      else if (secilen.length > 0) yaz = JSON.stringify({ ...kayit, content: secilen });
      if (yaz) yazilan++;
    }
    if (yaz && !cikti.write(yaz.trimStart() + '\n')) await once(cikti, 'drain');
  }
  cikti.end();
  await once(cikti, 'finish');

  if (yazilan === 0) {
    console.error('HATA: İstanbul kaydı bulunamadı; girdi dosyası Türkiye dökümü mü?');
    process.exit(1);
  }
  console.log(`${okunan} kayıttan ${yazilan} İstanbul kaydı yazıldı: ${values.out}`);
}

main().catch((hata) => {
  console.error(`HATA: ${hata.message}`);
  process.exit(1);
});
