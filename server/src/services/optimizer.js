// Seçilen mekanlar için yürüme sırası optimizasyonu (açık uçlu gezgin satıcı problemi).
//
// n küçük (≤ 20) olduğu için: her olası başlangıçtan en yakın komşu + 2-opt iyileştirme,
// en kısa sonuç seçilir. Mesafe matrisi kuş uçuşu × yürüme katsayısıdır; farklı
// yakalar (Avrupa / Anadolu / Adalar) arası geçişlere ceza eklenir ki aynı yakadaki
// duraklar art arda gelsin (yakalar arası vapur/Marmaray ile geçilir).
import { haversine } from '../utils/geo.js';

export const YURUME_KATSAYISI = 1.3;
export const YAKA_GECIS_CEZASI_M = 8000;
// Bu mesafenin üstündeki aynı yaka bacakları için toplu taşıma önerilir.
export const YURUME_SINIRI_M = 2500;

export const ZIYARET_DK = { miras: 45, muze: 60, carsi: 45, film: 15, edebiyat: 30, sahne: 20, mekan: 20, lezzet: 60 };
export const ziyaretSuresi = (m) => (m.tur === 'atolye' ? m.deneyim?.sureDk ?? 60 : ZIYARET_DK[m.tur] ?? 30);

export function mesafeMatrisi(noktalar) {
  return noktalar.map((a) =>
    noktalar.map((b) => {
      if (a === b) return 0;
      const ceza = a.yaka && b.yaka && a.yaka !== b.yaka ? YAKA_GECIS_CEZASI_M : 0;
      return haversine(a, b) * YURUME_KATSAYISI + ceza;
    }),
  );
}

const yolUzunlugu = (sira, d) => sira.reduce((t, n, i) => (i ? t + d[sira[i - 1]][n] : 0), 0);

function enYakinKomsu(baslangic, d) {
  const n = d.length;
  const sira = [baslangic];
  const ziyaret = new Set(sira);
  while (sira.length < n) {
    const son = sira[sira.length - 1];
    let en = -1;
    for (let j = 0; j < n; j++) if (!ziyaret.has(j) && (en === -1 || d[son][j] < d[son][en])) en = j;
    sira.push(en);
    ziyaret.add(en);
  }
  return sira;
}

/** Açık yol için 2-opt: bir parçayı ters çevirmek yolu kısaltıyorsa uygular. */
export function ikiOpt(sira, d, sabitBaslangic = false) {
  let s = sira.slice();
  let iyilesti = true;
  while (iyilesti) {
    iyilesti = false;
    for (let i = sabitBaslangic ? 1 : 0; i < s.length - 1; i++) {
      for (let k = i + 1; k < s.length; k++) {
        const aday = [...s.slice(0, i), ...s.slice(i, k + 1).reverse(), ...s.slice(k + 1)];
        if (yolUzunlugu(aday, d) + 1e-6 < yolUzunlugu(s, d)) {
          s = aday;
          iyilesti = true;
        }
      }
    }
  }
  return s;
}

/**
 * @param noktalar [{id, lat, lon, yaka}]
 * @param baslangicId isteğe bağlı sabit başlangıç
 * @returns sıralı indeksler
 */
export function sirala(noktalar, { baslangicId } = {}) {
  if (noktalar.length <= 2) return noktalar.map((_, i) => i);
  const d = mesafeMatrisi(noktalar);
  const sabit = noktalar.findIndex((p) => p.id === baslangicId);
  const adaylar = sabit >= 0 ? [sabit] : noktalar.map((_, i) => i);
  let en = null;
  for (const b of adaylar) {
    const s = ikiOpt(enYakinKomsu(b, d), d, sabit >= 0);
    const u = yolUzunlugu(s, d);
    if (!en || u < en.u) en = { s, u };
  }
  return en.s;
}

/** Ardışık duraklar arası bacakları çıkarır ve ulaşım türünü belirler. */
export function bacaklar(sirali) {
  const list = [];
  for (let i = 1; i < sirali.length; i++) {
    const a = sirali[i - 1];
    const b = sirali[i];
    const kus = haversine(a, b);
    const yakaDegisir = a.yaka && b.yaka && a.yaka !== b.yaka;
    const yurume = Math.round(kus * YURUME_KATSAYISI);
    list.push({
      neredenId: a.id,
      nereyeId: b.id,
      tur: yakaDegisir || yurume > YURUME_SINIRI_M ? 'toplu-tasima' : 'yurume',
      yakaDegisir: Boolean(yakaDegisir),
      tahminiMesafeM: yurume,
    });
  }
  return list;
}
