// scripts/.cache/ilceler.geojson ve mahalleler.geojson dosyalarını işleyip:
// 1) client/public/geo/istanbul-ilceler.json (39 ilçe SVG yolları + bbox + etiket merkezleri)
// 2) client/public/geo/mahalle/<ilce>.json (ilçe bazlı tembel yüklenen mahalle SVG yolları)
// 3) server/src/data/atlas-bolgeler.json (sunucu tarafı nokta-içinde-poligon + kenar yakınlığı eşleştirme verisi)
// dosyalarını üretir.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mekanlar } from '../server/src/data/mekanlar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.cache');
const PUBLIC_GEO = path.join(ROOT, 'client', 'public', 'geo');
const MAHALLE_DIR = path.join(PUBLIC_GEO, 'mahalle');
const OSM_DIR = path.join(PUBLIC_GEO, 'osm');
const OSM_MAHALLE_DIR = path.join(OSM_DIR, 'mahalle');
const SERVER_GEO = path.join(ROOT, 'server', 'src', 'data', 'atlas-bolgeler.json');

const ANADOLU = new Set([
  'adalar', 'atasehir', 'beykoz', 'cekmekoy', 'kadikoy', 'kartal', 'maltepe',
  'pendik', 'sancaktepe', 'sultanbeyli', 'sile', 'tuzla', 'umraniye', 'uskudar',
]);

// Düz projeksiyon (İstanbul enlemi 41.05°N için en-boy oranı korunur).
const COS_LAT = Math.cos((41.05 * Math.PI) / 180);
const LON0 = 27.95;
const LAT0 = 41.62;
const SCALE = 1000;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 1e4) / 1e4;

const proj = ([lon, lat]) => [
  round1((lon - LON0) * COS_LAT * SCALE),
  round1((LAT0 - lat) * SCALE),
];

export function slugifyTr(s) {
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanMahalleAd(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+Mahallesi$/i, '')
    .replace(/\s+Mah\.?$/i, '')
    .trim();
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function rdp(pts, eps) {
  if (pts.length <= 4) return pts;
  let maxD = 0;
  let idx = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(pts[i], pts[0], pts[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdp(pts.slice(0, idx + 1), eps);
    const right = rdp(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[end]];
}

function simplifyRing(ring, eps) {
  if (ring.length <= 5) return ring;
  const mid = Math.floor(ring.length / 2);
  const a = rdp(ring.slice(0, mid + 1), eps);
  const b = rdp(ring.slice(mid), eps);
  const out = a.slice(0, -1).concat(b);
  return out.length >= 4 ? out : ring;
}

function extractPolygons(geom) {
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates];
  if (geom.type === 'MultiPolygon') return geom.coordinates;
  if (geom.type === 'GeometryCollection') return geom.geometries.flatMap(extractPolygons);
  return [];
}

function ringAreaAndCentroid(ring) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    area2 += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if (Math.abs(area2) < 1e-9) {
    const avgX = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const avgY = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return { area: 0, cx: avgX, cy: avgY };
  }
  return { area: Math.abs(area2) / 2, cx: cx / (3 * area2), cy: cy / (3 * area2) };
}

function pointInRing(pt, ring) {
  let inside = false;
  const [x, y] = pt;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(pt, poly) {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) {
    if (pointInRing(pt, poly[i])) return false;
  }
  return true;
}

function pointInPolygons(pt, polys) {
  return polys.some((poly) => pointInPolygon(pt, poly));
}

function pointToSegDistSq(pt, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return (pt[0] - a[0]) ** 2 + (pt[1] - a[1]) ** 2;
  let t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  return (pt[0] - px) ** 2 + (pt[1] - py) ** 2;
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

function bboxOfPolys(polys, roundFn = round1) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return [roundFn(minX), roundFn(minY), roundFn(maxX - minX), roundFn(maxY - minY)];
}

function mergeBbox(boxes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, w, h] of boxes) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  return [round1(minX), round1(minY), round1(maxX - minX), round1(maxY - minY)];
}

function visualCenter(polys) {
  let bestRing = polys[0][0];
  let bestInfo = ringAreaAndCentroid(bestRing);
  for (const poly of polys) {
    const info = ringAreaAndCentroid(poly[0]);
    if (info.area > bestInfo.area) {
      bestInfo = info;
      bestRing = poly[0];
    }
  }
  const c = [bestInfo.cx, bestInfo.cy];
  if (pointInPolygons(c, polys)) {
    return { label: [round1(c[0]), round1(c[1])], area: round2(bestInfo.area) };
  }
  const [bx, by, , bh] = bboxOfPolys([[bestRing]], (n) => n);
  let bestPt = c;
  let bestSpan = -1;
  for (let row = 1; row <= 9; row++) {
    const y = by + (bh * row) / 10;
    const xs = [];
    for (let i = 0, j = bestRing.length - 1; i < bestRing.length; j = i++) {
      const [x0, y0] = bestRing[j];
      const [x1, y1] = bestRing[i];
      if ((y0 > y) !== (y1 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const span = xs[k + 1] - xs[k];
      if (span > bestSpan) {
        bestSpan = span;
        bestPt = [(xs[k] + xs[k + 1]) / 2, y];
      }
    }
  }
  return { label: [round1(bestPt[0]), round1(bestPt[1])], area: round2(bestInfo.area) };
}

function polysToSvgPath(polys) {
  const parts = [];
  for (const poly of polys) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      let s = `M${ring[0][0]} ${ring[0][1]}`;
      for (let i = 1; i < ring.length - 1; i++) s += `L${ring[i][0]} ${ring[i][1]}`;
      s += 'Z';
      parts.push(s);
    }
  }
  return parts.join('');
}

function roundLonLatPolys(polys, epsDeg) {
  return polys.map((poly) =>
    poly.map((ring) => simplifyRing(ring, epsDeg).map(([lon, lat]) => [round4(lon), round4(lat)])),
  );
}

function minDistToBbox(pt, [x, y, w, h]) {
  const dx = Math.max(x - pt[0], 0, pt[0] - (x + w));
  const dy = Math.max(y - pt[1], 0, pt[1] - (y + h));
  return Math.hypot(dx, dy);
}

function bboxOverlaps(a, b) {
  return a[0] <= b[0] + b[2] && a[0] + a[2] >= b[0] && a[1] <= b[1] + b[3] && a[1] + a[3] >= b[1];
}

/** Mahallenin iç örnek noktalarını ilçelerle oylayarak en doğru ilçeyi bulur. */
function findParentIlce(rawPolys, llCenter, ilceGeoList) {
  const mBox = bboxOfPolys(rawPolys, (n) => n);
  const candidates = ilceGeoList.filter((i) => bboxOverlaps(mBox, i.llBbox));
  if (candidates.length === 1) return candidates[0].slug;

  // Görsel merkez + içe çekilmiş köşe örnekleri ile çoğunluk oyu
  const ring = rawPolys[0][0];
  const samples = [llCenter];
  const step = Math.max(1, Math.floor(ring.length / 16));
  for (let i = 0; i < ring.length; i += step) {
    // Köşeyi merkeze doğru %15 içeri çekerek ortak sınır üzerindeki belirsizliği azalt
    samples.push([
      ring[i][0] * 0.85 + llCenter[0] * 0.15,
      ring[i][1] * 0.85 + llCenter[1] * 0.15,
    ]);
  }

  const votes = new Map();
  for (const pt of samples) {
    for (const c of candidates) {
      const [x, y, w, h] = c.llBbox;
      if (pt[0] < x || pt[0] > x + w || pt[1] < y || pt[1] > y + h) continue;
      if (pointInPolygons(pt, c.rawPolys)) {
        votes.set(c.slug, (votes.get(c.slug) || 0) + (pt === llCenter ? 3 : 1));
        break;
      }
    }
  }
  if (votes.size > 0) {
    return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // Fallback: kenara en yakın ilçe
  let bestSlug = null;
  let bestDist = Infinity;
  for (const c of ilceGeoList) {
    if (minDistToBbox(llCenter, c.llBbox) > bestDist) continue;
    const d = pointToPolysDist(llCenter, c.rawPolys);
    if (d < bestDist) {
      bestDist = d;
      bestSlug = c.slug;
    }
  }
  return bestDist < 0.05 ? bestSlug : null;
}

async function main() {
  const rawIlce = JSON.parse(await fs.readFile(path.join(CACHE_DIR, 'ilceler.geojson'), 'utf8'));
  const rawMah = JSON.parse(await fs.readFile(path.join(CACHE_DIR, 'mahalleler.geojson'), 'utf8'));

  await fs.mkdir(MAHALLE_DIR, { recursive: true });
  await fs.mkdir(OSM_MAHALLE_DIR, { recursive: true });

  // 1. İlçeleri işle
  const ilceler = [];
  const ilceServer = [];
  const ilceGeoList = [];
  const osmIlceFeatures = [];

  for (const f of rawIlce.features) {
    const ad = (f.properties?.display_name || f.properties?.name || '').split(',')[0].trim();
    const slug = slugifyTr(ad);
    if (!slug) continue;
    const rawPolys = extractPolygons(f.geometry);
    if (!rawPolys.length) continue;

    // İlçe genel görünümünde 0.75 SVG birimi ≈ 75m (hem keskin hem hafif)
    const projPolys = rawPolys.map((poly) =>
      poly.map((ring) => simplifyRing(ring.map(proj), 0.75)),
    );
    const d = polysToSvgPath(projPolys);
    const bbox = bboxOfPolys(projPolys);
    const { label, area } = visualCenter(projPolys);
    const yaka = ANADOLU.has(slug) ? 'anadolu' : 'avrupa';

    ilceler.push({ slug, ad, yaka, d, bbox, label, area });

    const llPolys = roundLonLatPolys(rawPolys, 0.0006);
    const llBbox = bboxOfPolys(llPolys, round4);
    const llLabel = visualCenter(rawPolys).label.map(round4);
    ilceServer.push({ slug, ad, yaka, bbox: llBbox, polys: llPolys });
    ilceGeoList.push({ slug, ad, yaka, rawPolys, llBbox });
    osmIlceFeatures.push({
      type: 'Feature',
      id: osmIlceFeatures.length + 1,
      properties: {
        slug,
        ad,
        yaka,
        bbox: [llBbox[0], llBbox[1], round4(llBbox[0] + llBbox[2]), round4(llBbox[1] + llBbox[3])],
        label: llLabel,
      },
      geometry: llPolys.length === 1
        ? { type: 'Polygon', coordinates: llPolys[0] }
        : { type: 'MultiPolygon', coordinates: llPolys },
    });
  }

  ilceler.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const avrupaBox = mergeBbox(ilceler.filter((x) => x.yaka === 'avrupa').map((x) => x.bbox));
  const anadoluBox = mergeBbox(ilceler.filter((x) => x.yaka === 'anadolu').map((x) => x.bbox));
  const istanbulBox = mergeBbox([avrupaBox, anadoluBox]);

  // 2. Mahalleleri işle ve ilçelere eşleştir
  const mahByIlce = new Map(ilceler.map((x) => [x.slug, []]));
  const osmMahByIlce = new Map(ilceler.map((x) => [x.slug, []]));
  const mahServer = [];
  let unmatched = 0;

  for (const f of rawMah.features) {
    const rawAd = f.properties?.name || f.properties?.text || '';
    const ad = cleanMahalleAd(rawAd);
    if (!ad) continue;
    const rawPolys = extractPolygons(f.geometry);
    if (!rawPolys.length) continue;

    const llCenter = visualCenter(rawPolys).label;
    const ilceSlug = findParentIlce(rawPolys, llCenter, ilceGeoList);
    if (!ilceSlug) {
      unmatched++;
      continue;
    }

    const projPolys = rawPolys.map((poly) =>
      poly.map((ring) => simplifyRing(ring.map(proj), 0.22)),
    );
    const d = polysToSvgPath(projPolys);
    const bbox = bboxOfPolys(projPolys);
    const { label, area } = visualCenter(projPolys);

    const list = mahByIlce.get(ilceSlug);
    const baseSlug = slugifyTr(ad);
    let slug = baseSlug;
    let suffix = 2;
    while (list.some((m) => m.slug === slug)) slug = `${baseSlug}-${suffix++}`;

    list.push({ slug, ad, d, bbox, label, area });

    const llPolys = roundLonLatPolys(rawPolys, 0.0005);
    const llBbox = bboxOfPolys(llPolys, round4);
    mahServer.push({ slug, ad, ilce: ilceSlug, bbox: llBbox, polys: llPolys });
    const osmList = osmMahByIlce.get(ilceSlug);
    osmList.push({
      type: 'Feature',
      id: osmList.length + 1,
      properties: {
        slug,
        ad,
        ilce: ilceSlug,
        bbox: [llBbox[0], llBbox[1], round4(llBbox[0] + llBbox[2]), round4(llBbox[1] + llBbox[3])],
        label: llCenter.map(round4),
      },
      geometry: llPolys.length === 1
        ? { type: 'Polygon', coordinates: llPolys[0] }
        : { type: 'MultiPolygon', coordinates: llPolys },
    });
  }

  // 3. Dosyaları yaz
  const ilceBundle = {
    surum: 1,
    kaynak: 'OpenStreetMap (ODbL)',
    bbox: istanbulBox,
    yakalar: {
      avrupa: {
        ad: 'Avrupa Yakası',
        bbox: avrupaBox,
        label: [round1(avrupaBox[0] + avrupaBox[2] * 0.56), round1(avrupaBox[1] + avrupaBox[3] * 0.52)],
      },
      anadolu: {
        ad: 'Anadolu Yakası',
        bbox: anadoluBox,
        label: [round1(anadoluBox[0] + anadoluBox[2] * 0.44), round1(anadoluBox[1] + anadoluBox[3] * 0.52)],
      },
    },
    ilceler,
  };
  await fs.writeFile(path.join(PUBLIC_GEO, 'istanbul-ilceler.json'), JSON.stringify(ilceBundle));
  await fs.writeFile(
    path.join(OSM_DIR, 'istanbul-ilceler.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features: osmIlceFeatures }),
  );

  let totalMah = 0;
  for (const ilce of ilceler) {
    const list = mahByIlce.get(ilce.slug) || [];
    list.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    totalMah += list.length;
    await fs.writeFile(
      path.join(MAHALLE_DIR, `${ilce.slug}.json`),
      JSON.stringify({ ilce: ilce.slug, ad: ilce.ad, bbox: ilce.bbox, mahalleler: list }),
    );
    const osmList = osmMahByIlce.get(ilce.slug) || [];
    await fs.writeFile(
      path.join(OSM_MAHALLE_DIR, `${ilce.slug}.geojson`),
      JSON.stringify({ type: 'FeatureCollection', features: osmList }),
    );
  }

  await fs.writeFile(SERVER_GEO, JSON.stringify({ ilceler: ilceServer, mahalleler: mahServer }));

  // 4. Mevcut 86 mekanı kenar-yakınlığı yedeğiyle test et
  let eslesenIlce = 0;
  let eslesenMah = 0;
  const ilceSayim = {};
  for (const m of mekanlar) {
    const pt = [m.lon, m.lat];
    let ilce = ilceServer.find((i) => {
      const [x, y, w, h] = i.bbox;
      return pt[0] >= x && pt[0] <= x + w && pt[1] >= y && pt[1] <= y + h && pointInPolygons(pt, i.polys);
    });
    if (!ilce) {
      let bestD = Infinity;
      for (const i of ilceServer) {
        if (minDistToBbox(pt, i.bbox) > bestD) continue;
        const d = pointToPolysDist(pt, i.polys);
        if (d < bestD) { bestD = d; ilce = i; }
      }
    }
    if (ilce) {
      eslesenIlce++;
      ilceSayim[ilce.ad] = (ilceSayim[ilce.ad] || 0) + 1;
      const ilceMahs = mahServer.filter((mh) => mh.ilce === ilce.slug);
      let mah = ilceMahs.find((mh) => {
        const [x, y, w, h] = mh.bbox;
        return pt[0] >= x && pt[0] <= x + w && pt[1] >= y && pt[1] <= y + h && pointInPolygons(pt, mh.polys);
      });
      if (!mah && ilceMahs.length) {
        let bestD = Infinity;
        for (const mh of ilceMahs) {
          if (minDistToBbox(pt, mh.bbox) > bestD) continue;
          const d = pointToPolysDist(pt, mh.polys);
          if (d < bestD) { bestD = d; mah = mh; }
        }
      }
      if (mah) eslesenMah++;
    }
  }

  const ilceStat = await fs.stat(path.join(PUBLIC_GEO, 'istanbul-ilceler.json'));
  const srvStat = await fs.stat(SERVER_GEO);

  console.log('=== İSTANBUL ATLAS ÜRETİLDİ ===');
  console.log(`İlçeler: ${ilceler.length} (${(ilceStat.size / 1024).toFixed(1)} KB)`);
  console.log(`Mahalleler: ${totalMah} (eşleşmeyen: ${unmatched})`);
  console.log(`Sunucu sınır dosyası: ${(srvStat.size / 1024).toFixed(1)} KB`);
  console.log(`Mevcut mekan eşleşmesi: ${eslesenIlce}/${mekanlar.length} ilçe, ${eslesenMah}/${mekanlar.length} mahalle`);
  console.log('İlçelere göre mekan dağılımı:', ilceSayim);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
