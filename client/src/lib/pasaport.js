// Dijital semt pasaportu. Demoda kullanıcı hesabı olmadığı için damgalar
// tarayıcıda saklanır. Canlı sürümde kullanıcı hesabına taşınacak.
const ANAHTAR = 'p404_pasaport';

// Bir semtte rozet kazanmak için gereken damga sayısı.
export const ROZET_ESIGI = 2;

export function damgalariOku() {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Damgayı ekler; aynı mekan ikinci kez eklenmez. Yeni eklendiyse true döner. */
export function damgaEkle({ mekanId, mekanAd, semtId, semtAd }) {
  const list = damgalariOku();
  if (list.some((d) => d.mekanId === mekanId)) return false;
  list.push({ mekanId, mekanAd, semtId, semtAd, tarih: new Date().toISOString() });
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify(list));
  } catch {
    return false;
  }
  return true;
}

/** Semt bazında damga sayısı ve rozet durumu. */
export function rozetler(damgalar, semtler) {
  return semtler.map((s) => {
    const adet = damgalar.filter((d) => d.semtId === s.id).length;
    return { semtId: s.id, ad: s.ad, adet, kazanildi: adet >= ROZET_ESIGI };
  });
}
