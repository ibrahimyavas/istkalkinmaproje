import React, { useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import EtkinlikKarti from '../components/kultur/EtkinlikKarti.jsx';

export default function EtkinliklerSayfasi() {
  const { erisilebilir } = useTercihler();
  const etk = useApi(() => api.etkinlikler(), []);
  const semtler = useApi(() => api.semtler(), []);
  const [semtId, setSemtId] = useState('');
  const [ucretsiz, setUcretsiz] = useState(false);

  const liste = useMemo(
    () =>
      (etk.veri || []).filter(
        (e) => (!semtId || e.semtId === semtId) && (!ucretsiz || e.ucretsiz) && (!erisilebilir || e.erisilebilir),
      ),
    [etk.veri, semtId, ucretsiz, erisilebilir],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">Etkinlik takvimi</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">Atölyeler, yürüyüşler, konserler ve okuma günleri.</p>
      <p className="mt-2 text-sm text-warning">Demo sürümde listelenen etkinlikler örnektir.</p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="semt" className="etiket">Semt</label>
          <select id="semt" className="girdi w-56" value={semtId} onChange={(e) => setSemtId(e.target.value)}>
            <option value="">Tüm semtler</option>
            {(semtler.veri || []).map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={ucretsiz} onChange={(e) => setUcretsiz(e.target.checked)} />
          Yalnızca ücretsiz
        </label>
        {erisilebilir && <p className="pb-3 text-sm font-semibold text-accent">Erişilebilir mod: yalnızca erişilebilir etkinlikler</p>}
      </div>

      {etk.yukleniyor && <Yukleniyor />}
      {etk.hata && <HataKutusu metin={etk.hata} yenile={etk.yenile} />}
      {etk.veri && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
          {liste.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
          {liste.length === 0 && <p className="text-ink-muted">Bu seçime uyan etkinlik yok.</p>}
        </div>
      )}
    </div>
  );
}
