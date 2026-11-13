import { useCallback, useEffect, useState } from 'react';
import { hataMesaji } from '../services/api.js';

/** Basit veri yükleme kancası: { veri, yukleniyor, hata, yenile }. */
export function useApi(fn, deps = []) {
  const [durum, setDurum] = useState({ veri: null, yukleniyor: true, hata: null });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calistir = useCallback(fn, deps);

  const yenile = useCallback(() => {
    let iptal = false;
    setDurum((d) => ({ ...d, yukleniyor: true, hata: null }));
    calistir()
      .then((veri) => !iptal && setDurum({ veri, yukleniyor: false, hata: null }))
      .catch((err) => !iptal && setDurum({ veri: null, yukleniyor: false, hata: hataMesaji(err) }));
    return () => {
      iptal = true;
    };
  }, [calistir]);

  useEffect(() => yenile(), [yenile]);

  return { ...durum, yenile };
}
