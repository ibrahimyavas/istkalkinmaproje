// Uzman (usta, atölye sahibi) oturumu. Admin oturumuyla aynı desen: imzalı, httpOnly çerez.
// Çerez değeri `${uzmanId}.${bitisMs}`; her istekte uzmanın hâlâ 'onayli' olduğu kontrol edilir
// (admin askıya alırsa oturum hemen geçersizleşir).
import { uzmanRepo } from '../repositories/index.js';

export const UZMAN_COOKIE = 'p404_uzman';
const SURE_MS = 12 * 60 * 60 * 1000; // 12 saat

const uretim = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

/** Canlıda imza anahtarı yoksa uzman girişi kapalıdır (admin girişiyle aynı kural). */
export const uzmanGirisiAcik = () => !(uretim() && !process.env.SESSION_SECRET);

export function uzmanOturumAc(res, uzmanId) {
  res.cookie(UZMAN_COOKIE, `${uzmanId}.${Date.now() + SURE_MS}`, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SURE_MS,
  });
}

export function uzmanOturumKapat(res) {
  res.clearCookie(UZMAN_COOKIE);
}

/** Çerezden uzman kimliğini çözer; geçersiz ya da süresi dolmuşsa null. */
export function cerezUzmanId(req) {
  const deger = req.signedCookies?.[UZMAN_COOKIE];
  if (typeof deger !== 'string') return null;
  const nokta = deger.lastIndexOf('.');
  const id = deger.slice(0, nokta);
  const bitis = Number(deger.slice(nokta + 1));
  return id && bitis > Date.now() ? id : null;
}

export async function requireUzman(req, res, next) {
  try {
    const id = cerezUzmanId(req);
    const uzman = id ? await uzmanRepo.get(id) : null;
    if (!uzman || uzman.durum !== 'onayli') {
      return res.status(401).json({ hata: 'Uzman girişi gerekli' });
    }
    req.uzman = uzman;
    next();
  } catch (err) {
    next(err);
  }
}
