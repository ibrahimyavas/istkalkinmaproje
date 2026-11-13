// Gezinti grupları: aynı rotayı yürümek isteyenlerin buluşması.
//
// Gizlilik ve güvenlik kuralları:
// - Kullanıcı hesabı yok. Grubu açan kişiye bir kez gösterilen bir yönetim anahtarı verilir;
//   sunucuda yalnızca SHA-256 özeti saklanır.
// - Katılımcıların iletişim bilgisi (isteğe bağlı) yalnızca yönetim anahtarıyla görülür;
//   herkese açık yanıtta yalnızca rumuzlar ve sayılar vardır.
// - Buluşma noktası her zaman rotanın ilk durağıdır (kamuya açık bir mekan).
import crypto from 'node:crypto';

export const KAPASITE = { min: 2, max: 30 };
export const DILLER = ['tr', 'en', 'tr-en'];

export const anahtarUret = () => crypto.randomBytes(24).toString('base64url');
export const anahtarOzeti = (a) => crypto.createHash('sha256').update(String(a)).digest('hex');

export function anahtarDogruMu(grup, anahtar) {
  if (!anahtar || !grup?.yonetimOzeti) return false;
  const a = Buffer.from(anahtarOzeti(anahtar));
  const b = Buffer.from(grup.yonetimOzeti);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const metin = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Grup oluşturma girdisini doğrular. Hata varsa { hata } döner. */
export function grupGirdisi(b, simdi = new Date()) {
  const baslik = metin(b.baslik, 80);
  const rumuz = metin(b.rumuz, 30);
  const aciklama = metin(b.aciklama, 600);
  const kapasite = Number(b.kapasite);
  const baslangic = new Date(b.baslangic);
  if (baslik.length < 5) return { hata: 'Başlık en az 5 karakter olmalı' };
  if (rumuz.length < 2) return { hata: 'Rumuz en az 2 karakter olmalı' };
  if (!Number.isInteger(kapasite) || kapasite < KAPASITE.min || kapasite > KAPASITE.max) {
    return { hata: `Kişi sınırı ${KAPASITE.min}–${KAPASITE.max} arası olmalı` };
  }
  if (Number.isNaN(baslangic.getTime()) || baslangic < simdi) return { hata: 'Gelecekte bir tarih ve saat seçin' };
  if (baslangic - simdi > 90 * 24 * 3600e3) return { hata: 'En fazla 90 gün sonrası için grup açılabilir' };
  if (!b.planId && !b.rotaId) return { hata: 'Bir rota ya da plan seçin' };
  return {
    veri: {
      baslik,
      aciklama,
      rumuz,
      kapasite,
      baslangic: baslangic.toISOString(),
      dil: DILLER.includes(b.dil) ? b.dil : 'tr',
      erisilebilir: Boolean(b.erisilebilir),
      planId: b.planId ? metin(b.planId, 60) : null,
      rotaId: b.rotaId ? metin(b.rotaId, 60) : null,
    },
  };
}

/** Herkese açık grup görünümü (iletişim bilgisi ve anahtar özeti çıkarılır). */
export function publicGrup(g) {
  const { yonetimOzeti, katilimcilar = [], ...rest } = g;
  return {
    ...rest,
    katilimciSayisi: katilimcilar.length + 1, // açan kişi dahil
    katilimcilar: [g.rumuz, ...katilimcilar.map((k) => k.rumuz)],
    dolu: katilimcilar.length + 1 >= g.kapasite,
  };
}

/** Yönetim görünümü: iletişim bilgileri dahil. */
export function yonetimGrup(g) {
  const { yonetimOzeti, ...rest } = g;
  return rest;
}

export function katilabilirMi(g, simdi = new Date()) {
  if (g.durum !== 'aktif') return 'Bu grup iptal edildi';
  if (new Date(g.baslangic) < simdi) return 'Bu gezinti başladı ya da sona erdi';
  if ((g.katilimcilar?.length || 0) + 1 >= g.kapasite) return 'Grup dolu';
  return null;
}
