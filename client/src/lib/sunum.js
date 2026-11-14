// Tasarımdaki kartların ortak sunum yardımcıları (ikon, etiket, süre ve erişim özetleri).
import { MEKAN_TURU, ZANAAT } from './harita.js';

export const TUR_SIMGE = {
  atolye: 'palette', miras: 'account_balance', muze: 'museum', carsi: 'storefront',
  film: 'movie', edebiyat: 'menu_book', sahne: 'theater_comedy', mekan: 'park',
};
export const ZANAAT_SIMGE = {
  ebru: 'water_drop', bakircilik: 'hardware', sedef: 'diamond', ahsap: 'carpenter',
  cini: 'local_florist', hat: 'draw', seramik: 'emoji_food_beverage',
};
export const SEMT_SIMGE = {
  sultanahmet: 'mosque', balat: 'church', kuzguncuk: 'cottage', uskudar: 'light', kadikoy: 'directions_boat', burgazada: 'sailing',
  eyup: 'gondola_lift', beyoglu: 'tram', bogaz: 'castle',
};

export const simgeOf = (m) => (m.tur === 'atolye' && ZANAAT_SIMGE[m.zanaat]) || TUR_SIMGE[m.tur] || 'place';
export const turEtiketi = (m) => (m.tur === 'atolye' && m.zanaat ? ZANAAT[m.zanaat] : MEKAN_TURU[m.tur] || m.tur);
export const yakaEtiketi = (yaka) => (yaka === 'Adalar' ? 'Adalar' : `${yaka} yakası`);

// Tasarımdaki tür filtreleri → mekan türleri
export const TUR_GRUPLARI = {
  atolye: { ad: 'Atölye', turler: ['atolye'] },
  tarihi: { ad: 'Tarihi miras', turler: ['miras', 'muze', 'carsi', 'sahne', 'mekan'] },
  dizi: { ad: 'Dizi/film/edebiyat', turler: ['film', 'edebiyat'] },
};

// Sunucudaki optimizer.js ile aynı ziyaret süreleri
const ZIYARET_DK = { miras: 45, muze: 60, carsi: 45, film: 15, edebiyat: 30, sahne: 20, mekan: 20 };
export const ziyaretDk = (m) => (m.tur === 'atolye' ? m.deneyim?.sureDk ?? 60 : ZIYARET_DK[m.tur] ?? 30);

/** Kart altındaki tek satırlık erişim özeti ve uyarı durumu. */
export function erisimOzeti(e = {}) {
  if (e.zemin === 'merdiven') return { metin: 'Merdivenli erişim', uyari: true };
  if (e.zemin === 'yokus') return { metin: 'Dik yokuş', uyari: true };
  if (e.basamak === false && e.rampa) return { metin: 'Basamaksız, rampalı giriş', uyari: false };
  if (e.basamak === false) return { metin: 'Basamaksız giriş', uyari: false };
  if (e.basamak) return { metin: e.zemin === 'arnavut' ? 'Girişte basamak, Arnavut kaldırımı' : 'Girişte basamak', uyari: true };
  if (e.zemin === 'arnavut') return { metin: 'Arnavut kaldırımı', uyari: true };
  return { metin: 'Düz zemin', uyari: false };
}

export function sureYaz(dk) {
  const h = Math.floor(dk / 60);
  const m = Math.round(dk % 60);
  if (!h) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

export const mesafeYazTr = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
export const saatYaz = (dk) => `${String(Math.floor(dk / 60) % 24).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;
