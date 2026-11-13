import React, { useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import MekanKarti from '../components/mekan/MekanKarti.jsx';
import { ZANAAT } from '../lib/harita.js';

const basamaksiz = (m) => {
  const e = m.erisilebilirlik || {};
  return e.basamak === false && e.zemin !== 'merdiven';
};

export default function AtolyelerSayfasi() {
  const { erisilebilir } = useTercihler();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.mekanlar({ tur: 'atolye' }), []);
  const [zanaat, setZanaat] = useState('');

  const liste = useMemo(() => {
    let l = veri || [];
    if (zanaat) l = l.filter((m) => m.zanaat === zanaat);
    if (erisilebilir) l = l.filter(basamaksiz);
    return l;
  }, [veri, zanaat, erisilebilir]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">Yaratıcı ekonomi</p>
      <h1 className="mt-2 text-4xl font-bold">Zanaat atölyeleri</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">
        İstanbul'un yaşayan el sanatlarını ustalarının yanında deneyimleyin. Talepler doğrudan atölyeye iletilir.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="zanaat" className="etiket">Zanaat</label>
          <select id="zanaat" className="girdi w-56" value={zanaat} onChange={(e) => setZanaat(e.target.value)}>
            <option value="">Tümü</option>
            {Object.entries(ZANAAT).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
          </select>
        </div>
        {erisilebilir && <p className="pb-3 text-sm font-semibold text-accent">Erişilebilir mod: yalnızca basamaksız girişli atölyeler</p>}
      </div>

      {yukleniyor && <Yukleniyor />}
      {hata && <HataKutusu metin={hata} yenile={yenile} />}
      {veri && (
        <ul className="mt-6 grid gap-3 md:grid-cols-2" aria-live="polite">
          {liste.map((m) => <li key={m.id}><MekanKarti m={m} /></li>)}
          {liste.length === 0 && <li className="text-ink-muted">Bu seçime uyan atölye yok.</li>}
        </ul>
      )}
    </div>
  );
}
