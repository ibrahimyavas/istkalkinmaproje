import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, hataMesaji } from '../services/api.js';
import { kesfetOku, kesfetYaz } from '../lib/yerel.js';

// Keşfet ekranının tüm mantığı. Görünümden bağımsızdır; tasarım değişince
// yalnızca bileşenler değişir, bu kanca aynı kalır.
//
// Döner: { kartlar (kalan deste), siradaki, begenilenler (mekan nesneleri), karar(mekan, 'begen'|'gec'),
//          geriAl(), sifirla(), cikar(id), yukleniyor, hata }
export function useKesfet(filtre) {
  const [tum, setTum] = useState([]);
  const [durum, setDurum] = useState({ yukleniyor: true, hata: null });
  const [secim, setSecim] = useState(kesfetOku);
  const [gecmis, setGecmis] = useState([]); // geri alma yığını: [{ id, karar }]

  const anahtar = JSON.stringify(filtre);
  useEffect(() => {
    let iptal = false;
    setDurum({ yukleniyor: true, hata: null });
    api
      .kesfet(filtre)
      .then((k) => !iptal && (setTum(k), setDurum({ yukleniyor: false, hata: null })))
      .catch((e) => !iptal && setDurum({ yukleniyor: false, hata: hataMesaji(e) }));
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  useEffect(() => kesfetYaz(secim), [secim]);

  const karar = useCallback((mekan, k) => {
    setSecim((s) => ({
      begenilen: k === 'begen' ? [...new Set([...s.begenilen, mekan.id])] : s.begenilen.filter((x) => x !== mekan.id),
      gecilen: k === 'gec' ? [...new Set([...s.gecilen, mekan.id])] : s.gecilen.filter((x) => x !== mekan.id),
    }));
    setGecmis((g) => [...g, { id: mekan.id, karar: k }]);
    api.kesfetOlay(mekan.id, k);
  }, []);

  const geriAl = useCallback(() => {
    setGecmis((g) => {
      const son = g[g.length - 1];
      if (!son) return g;
      setSecim((s) => ({
        begenilen: s.begenilen.filter((x) => x !== son.id),
        gecilen: s.gecilen.filter((x) => x !== son.id),
      }));
      return g.slice(0, -1);
    });
  }, []);

  const cikar = useCallback((id) => {
    setSecim((s) => ({ ...s, begenilen: s.begenilen.filter((x) => x !== id) }));
  }, []);

  const sifirla = useCallback(() => {
    setSecim({ begenilen: [], gecilen: [] });
    setGecmis([]);
  }, []);

  const kartlar = useMemo(
    () => tum.filter((m) => !secim.begenilen.includes(m.id) && !secim.gecilen.includes(m.id)),
    [tum, secim],
  );
  // Beğenilenler filtreden bağımsız tutulur; nesneler yüklenen listeden ya da önbellekten gelir.
  const [onbellek, setOnbellek] = useState({});
  useEffect(() => setOnbellek((o) => ({ ...o, ...Object.fromEntries(tum.map((m) => [m.id, m])) })), [tum]);
  const begenilenler = secim.begenilen.map((id) => onbellek[id]).filter(Boolean);

  return {
    kartlar,
    siradaki: kartlar[0] || null,
    begenilenler,
    begenilenIdler: secim.begenilen,
    toplam: tum.length,
    karar,
    geriAl,
    geriAlinabilir: gecmis.length > 0,
    sonKarar: gecmis[gecmis.length - 1] || null, // { id, karar } — geri alma animasyonunun yönü için
    cikar,
    sifirla,
    ...durum,
  };
}
