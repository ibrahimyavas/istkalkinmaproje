// Demo deposu: bütün veri bellekte tutulur. Yerelde her yazmadan sonra
// `server/.data/store.json` dosyasına kaydedilir; Vercel'de (salt okunur dosya
// sistemi) yalnızca bellekte kalır ve her soğuk başlangıçta sıfırlanır.
//
// Postgres'e geçişte yalnızca bu dosya ve repositories/index.js değişir;
// routes/ ve services/ aynı async arayüzü kullanmaya devam eder.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { semtler } from '../data/semtler.js';
import { mekanlar } from '../data/mekanlar.js';
import { rotalar } from '../data/rotalar.js';
import { duraklar, toplanmaAlanlari } from '../data/ulasim.js';
import { siirler } from '../data/siirler.js';
import { etkinlikler } from '../data/etkinlikler.js';
import { dunBugun } from '../data/dunbugun.js';
import { ornekGruplar } from '../data/gruplar.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.STORE_DIR || path.resolve(here, '..', '..', '.data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const PERSIST = !process.env.VERCEL && process.env.NODE_ENV !== 'test';

const clone = (v) => JSON.parse(JSON.stringify(v));

export function seedState() {
  return {
    semtler: clone(semtler),
    mekanlar: clone(mekanlar),
    rotalar: clone(rotalar),
    duraklar: clone(duraklar),
    toplanma: clone(toplanmaAlanlari),
    siirler: clone(siirler),
    etkinlikler: clone(etkinlikler),
    dunBugun: clone(dunBugun),
    planlar: [],
    gruplar: clone(ornekGruplar),
    bildirimler: [],
    talepler: [],
    olaylar: [],
    fotograflar: [],
    fotoDosyalari: {}, // id → { mime, base64 }
    uzmanlar: [],
    ayarlar: { ai: { saglayici: '', model: '', apiAnahtari: '' }, here: { apiAnahtari: '' } },
  };
}

// Tohum verisi olan içerik koleksiyonları: koddaki yeni alanlar kayıtlı veriye eklenir.
export const ICERIK_KOLEKSIYONLARI = ['semtler', 'mekanlar', 'rotalar', 'duraklar', 'toplanma', 'siirler', 'etkinlikler', 'dunBugun'];

/** Kayıtlı kayıtta olmayan alanları tohumdan doldurur; kayıtlı değerler korunur. */
function tohumlaBirlestir(saved, tohum) {
  const sonuc = { ...tohum, ...saved };
  for (const k of ICERIK_KOLEKSIYONLARI) {
    if (!Array.isArray(saved[k])) continue;
    sonuc[k] = saved[k].map((item) => {
      const t = tohum[k].find((x) => x.id === item.id);
      return t ? { ...t, ...item } : item;
    });
  }
  return sonuc;
}

function load() {
  if (!PERSIST) return seedState();
  try {
    const saved = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    // Yeni koleksiyonlar ve koddaki yeni alanlar (ör. mekan.detay) tohumdan gelir.
    return tohumlaBirlestir(saved, seedState());
  } catch {
    return seedState();
  }
}

let state = load();

export function getState() {
  return state;
}

export function resetState(next = seedState()) {
  state = next;
}

export function persist() {
  if (!PERSIST) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('[store] kayıt yazılamadı:', err.message);
  }
}
