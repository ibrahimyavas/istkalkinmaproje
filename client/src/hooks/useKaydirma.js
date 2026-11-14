import { useEffect, useState } from 'react';

/**
 * Sayfa `esik` pikselden fazla aşağı kaydırıldı mı? Pasif dinleyici; değer yalnızca
 * eşik geçildiğinde değişir, React aynı değerde yeniden çizmez.
 */
export function useKaydirma(esik = 160) {
  const [gecti, setGecti] = useState(() => typeof window !== 'undefined' && window.scrollY > esik);
  useEffect(() => {
    const olc = () => setGecti(window.scrollY > esik);
    olc();
    window.addEventListener('scroll', olc, { passive: true });
    return () => window.removeEventListener('scroll', olc);
  }, [esik]);
  return gecti;
}
