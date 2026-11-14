// Etkinlik kartı, takvim ve ayrıntı sayfasının ortak sunum yardımcıları.

export const ETKINLIK_TURU = {
  atolye: 'Atölye', yuruyus: 'Yürüyüş', konser: 'Konser', edebiyat: 'Edebiyat', soylesi: 'Söyleşi',
  sergi: 'Sergi', tiyatro: 'Sahne', festival: 'Festival',
};

const TZ = 'Europe/Istanbul';
const gun = (iso, yil = true) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', ...(yil ? { year: 'numeric' } : {}), timeZone: TZ });
const saatli = (iso, uzun) => new Date(iso).toLocaleString('tr-TR', {
  weekday: uzun ? 'long' : 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: TZ,
});

/** "29 Eylül 2026 – 31 Ocak 2027", "25 Eylül 2026" ya da saatli tek tarih. */
export function tarihMetni(e, uzun = false) {
  if (e.bitis) {
    const ayniYil = new Date(e.baslangic).getFullYear() === new Date(e.bitis).getFullYear();
    return `${gun(e.baslangic, !ayniYil)} – ${gun(e.bitis)}`;
  }
  if (e.bitisNotu) return `${gun(e.baslangic)}’den beri · ${e.bitisNotu}`;
  if (e.tumGun) return gun(e.baslangic);
  return saatli(e.baslangic, uzun);
}

export const ucretMetni = (e) => e.ucret || (e.ucretsiz === true ? 'Ücretsiz' : e.ucretsiz === false ? 'Ücretli' : 'Bilgi yok, kaynağa bakın');
export const yerMetni = (e, mekan) => mekan?.ad || e.mekanAd || e.konumAd || '—';
