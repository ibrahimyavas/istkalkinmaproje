// İstek sınırı. Sayaç repository'de tutulur: Postgres'te bütün sunucu örnekleri ortak sayar
// (Vercel'de her örneğin kendi belleği olduğu için bellek içi sayaç yetmez).
import { hizRepo } from '../repositories/index.js';

export function hizSiniri({ ad, pencereMs, azami, mesaj = 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' }) {
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test' && !process.env.HIZ_SINIRI_TEST) return next();
    try {
      const n = await hizRepo.sayacArtir(`${ad}:${req.ip}`, pencereMs);
      if (n > azami) return res.status(429).json({ hata: mesaj });
      next();
    } catch (err) {
      // Sayaç çalışmazsa isteği engellemeyiz; hata kaydedilir.
      console.error('[hiz-siniri]', err.message);
      next();
    }
  };
}
