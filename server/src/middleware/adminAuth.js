import crypto from 'node:crypto';

export const COOKIE = 'p404_admin';
const SURE_MS = 8 * 60 * 60 * 1000; // 8 saat

export function parolaDogruMu(girilen) {
  const beklenen = process.env.ADMIN_PASSWORD;
  // Canlıda imza anahtarı yoksa her örnek farklı anahtar üretir; girişi tamamen kapat.
  const uretim = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (uretim && !process.env.SESSION_SECRET) return false;
  if (!beklenen || typeof girilen !== 'string') return false;
  const a = Buffer.from(girilen);
  const b = Buffer.from(beklenen);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function oturumAc(res) {
  res.cookie(COOKIE, String(Date.now() + SURE_MS), {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SURE_MS,
  });
}

export function oturumKapat(res) {
  res.clearCookie(COOKIE);
}

/** İstek geçerli bir admin oturumuyla mı geliyor? */
export function adminMi(req) {
  const bitis = Number(req.signedCookies?.[COOKIE]);
  return Boolean(bitis && bitis > Date.now());
}

export function requireAdmin(req, res, next) {
  if (adminMi(req)) return next();
  res.status(401).json({ hata: 'Yönetici girişi gerekli' });
}
