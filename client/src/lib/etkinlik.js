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

// Yıldan sonra gelen ayrılma eki: 2026’dan, 2025’ten, 2027’den (son rakamın okunuşuna göre).
const EK = { 0: 'dan', 1: 'den', 2: 'den', 3: 'ten', 4: 'ten', 5: 'ten', 6: 'dan', 7: 'den', 8: 'den', 9: 'dan' };
const ONLUK = { 1: 'dan', 2: 'den', 3: 'dan', 4: 'tan', 5: 'den', 6: 'tan', 7: 'ten', 8: 'den', 9: 'dan' };
function yilEki(iso) {
  const y = Number(new Date(iso).toLocaleDateString('tr-TR', { year: 'numeric', timeZone: TZ }));
  if (y % 10) return EK[y % 10];
  if (y % 100) return ONLUK[(y % 100) / 10];
  return y % 1000 ? 'den' : 'den'; // yüz → yüzden, bin → binden
}

/** "29 Eylül 2026 – 31 Ocak 2027", "25 Eylül 2026" ya da saatli tek tarih. */
export function tarihMetni(e, uzun = false) {
  if (e.bitis) {
    const ayniYil = new Date(e.baslangic).getFullYear() === new Date(e.bitis).getFullYear();
    return `${gun(e.baslangic, !ayniYil)} – ${gun(e.bitis)}`;
  }
  if (e.bitisNotu) return `${gun(e.baslangic)}’${yilEki(e.baslangic)} beri · ${e.bitisNotu}`;
  if (e.tumGun) return gun(e.baslangic);
  return saatli(e.baslangic, uzun);
}

export const ucretMetni = (e) => e.ucret || (e.ucretsiz === true ? 'Ücretsiz' : e.ucretsiz === false ? 'Ücretli' : 'Bilgi yok, kaynağa bakın');
export const yerMetni = (e, mekan) => mekan?.ad || e.mekanAd || e.konumAd || '—';
