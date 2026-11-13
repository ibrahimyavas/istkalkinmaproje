// Rota geometrisi, mesafe, eğim ve erişilebilirlik analizi.
//
// Kaynak önceliği:
// 1. `server/src/data/routes-geo/<rotaId>.json` — scripts/build-routes.js'in
//    Valhalla ile ürettiği gerçek yürüme geometrisi ve eğim profili.
// 2. Yoksa: duraklar arası kuş uçuşu çizgi ve tahmini mesafe. Yanıtta
//    `geometriKaynagi: 'yaklasik'` döner; arayüz bunu açıkça belirtir.
//
// Canlı sürümde 1. adım yerine doğrudan Valhalla/OTP çağrılacak (aynı çıktı).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { haversine, nearest } from '../utils/geo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const GEO_DIR = path.resolve(here, '..', 'data', 'routes-geo');

// Kuş uçuşu → gerçek yürüme mesafesi için kaba katsayı (sokak dokusu).
const YURUME_KATSAYISI = 1.3;
// Dakikada yürünen metre: normal ve erişilebilir tempo.
const TEMPO = { normal: 75, erisilebilir: 50 };

const ENGEL_ZEMINLER = new Set(['merdiven', 'yokus']);

/** Erişilebilir modda bu durak rotadan çıkarılır mı? (scripts/build-app-routes.js de kullanır) */
export function atlanirMi(mekan) {
  return ENGEL_ZEMINLER.has(mekan.erisilebilirlik?.zemin);
}

function readPrecomputed(rotaId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(GEO_DIR, `${rotaId}.json`), 'utf8'));
  } catch {
    return null;
  }
}

/** Bir durağın erişilebilirlik sorunlarını listeler. */
export function engeller(mekan) {
  const e = mekan.erisilebilirlik || {};
  const list = [];
  if (e.zemin === 'merdiven') list.push('Merdivenli erişim');
  if (e.zemin === 'yokus') list.push('Dik yokuş');
  if (e.zemin === 'arnavut') list.push('Arnavut kaldırımı');
  if (e.basamak) list.push('Girişte basamak');
  if (e.rampa === false) list.push('Rampa yok');
  if (e.rampa === null || e.rampa === undefined) list.push('Rampa bilgisi yok');
  return list;
}

/** Durakların zemin bilgisinden kaba zorluk etiketi (Valhalla verisi yokken). */
export function tahminiZorluk(mekanlar) {
  const zorlar = mekanlar.filter((m) => ENGEL_ZEMINLER.has(m.erisilebilirlik?.zemin)).length;
  const oran = mekanlar.length ? zorlar / mekanlar.length : 0;
  if (oran >= 0.5) return 'dik';
  if (oran > 0) return 'orta';
  // Arnavut kaldırımı tekerlekli sandalye ve bebek arabası için zorlayıcıdır.
  if (mekanlar.some((m) => m.erisilebilirlik?.zemin === 'arnavut')) return 'orta';
  return 'kolay';
}

/**
 * @param rota      rota kaydı
 * @param mekanlar  rotadaki durakların mekan kayıtları (sıralı)
 * @param ctx       { duraklar, toplanma } yakınlık hesapları için
 * @param secenek   { erisilebilir: boolean }
 */
export function buildRoute(rota, mekanlar, ctx, { erisilebilir = false } = {}) {
  const stops = mekanlar.map((m, i) => {
    const sorunlar = engeller(m);
    return {
      ...m,
      sira: i + 1,
      anlatim: rota.duraklar[i]?.anlatim || '',
      engeller: sorunlar,
      // Erişilebilir modda: merdiven veya dik yokuş durağı "atlanabilir" işaretlenir.
      atlanabilir: erisilebilir && atlanirMi(m),
      enYakinDurak: nearest(m, ctx.duraklar),
      enYakinToplanma: nearest(m, ctx.toplanma),
    };
  });

  const aktif = stops.filter((s) => !s.atlanabilir);
  const pre = readPrecomputed(rota.id);
  const mod = erisilebilir ? 'erisilebilir' : 'normal';

  // Önceden hesaplanmış rota, yalnızca aynı durak dizisi için üretildiyse kullanılır
  // (içerik admin panelinden değiştirildiyse eskimiş geometri gösterilmez).
  const beklenen = aktif.map((s) => s.id).join(',');
  const p = pre?.[mod];
  if (p?.geometri && p.durakIdler?.join(',') === beklenen) {
    return {
      geometri: p.geometri,
      geometriKaynagi: 'valhalla',
      mesafeM: p.mesafeM,
      sureDk: p.sureDk,
      egimProfili: p.egimProfili ?? null,
      egimOzeti: p.egimOzeti ?? null,
      merdivenM: p.merdivenM ?? null,
      zorluk: p.zorluk,
      motor: pre.kaynak ? { surum: pre.kaynak.surum, olusturulma: pre.kaynak.olusturulma } : null,
      duraklar: stops,
    };
  }

  let kus = 0;
  for (let i = 1; i < aktif.length; i++) kus += haversine(aktif[i - 1], aktif[i]);
  const mesafeM = Math.round(kus * YURUME_KATSAYISI);

  return {
    geometri: {
      type: 'LineString',
      coordinates: aktif.map((s) => [s.lon, s.lat]),
    },
    geometriKaynagi: 'yaklasik',
    mesafeM,
    sureDk: Math.max(1, Math.round(mesafeM / TEMPO[mod])),
    egimProfili: null,
    zorluk: tahminiZorluk(aktif),
    duraklar: stops,
  };
}
