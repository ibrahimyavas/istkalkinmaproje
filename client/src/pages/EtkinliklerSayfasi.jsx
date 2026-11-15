import React, { useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import { IskeletKartlar, HataKutusu } from '../components/common/Yukleniyor.jsx';
import EtkinlikKarti from '../components/kultur/EtkinlikKarti.jsx';

export default function EtkinliklerSayfasi() {
  const { erisilebilir } = useTercihler();
  const etk = useApi(() => api.etkinlikler(), []);
  const semtler = useApi(() => api.semtler(), []);
  const [semtId, setSemtId] = useState('');
  const [ucretsiz, setUcretsiz] = useState(false);

  // Erişim bilgisi olmayan (null) etkinlikler erişilebilir modda gizlenmez, "bilgi yok" olarak kalır.
  const uygun = (e) => (!semtId || e.semtId === semtId) && (!ucretsiz || e.ucretsiz === true) && (!erisilebilir || e.erisilebilir !== false);
  const { sergiler, digerleri } = useMemo(() => {
    const l = (etk.veri || []).filter(uygun);
    return { sergiler: l.filter((e) => e.tur === 'sergi' && e.gercek), digerleri: l.filter((e) => !(e.tur === 'sergi' && e.gercek)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etk.veri, semtId, ucretsiz, erisilebilir]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-bold">Etkinlik takvimi</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">Süren sergiler, atölyeler, yürüyüşler ve konserler.</p>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Sergiler kurumların kendi sitelerinden derlendi (son kontrol 14 Kasım 2026); bilet ve saat için kaynağa bakın.
        “Örnek etkinlik” etiketli kayıtlar demo amaçlıdır.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="semt" className="etiket">Semt</label>
          <select id="semt" className="girdi w-56" value={semtId} onChange={(e) => setSemtId(e.target.value)}>
            <option value="">Tüm İstanbul</option>
            {(semtler.veri || []).map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={ucretsiz} onChange={(e) => setUcretsiz(e.target.checked)} />
          Yalnızca ücretsiz
        </label>
        {erisilebilir && <p className="pb-3 text-sm font-semibold text-accent">Erişilebilir mod: erişilemez olduğu bilinen etkinlikler gizli</p>}
      </div>

      {etk.yukleniyor && <IskeletKartlar metin="Etkinlikler yükleniyor…" />}
      {etk.hata && <HataKutusu metin={etk.hata} yenile={etk.yenile} />}
      {etk.veri && (
        <div aria-live="polite">
          {sergiler.length > 0 && (
            <section aria-labelledby="sergi-baslik" className="mt-8">
              <h2 id="sergi-baslik" className="text-2xl font-bold">Şu an süren sergiler</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sergiler.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
              </div>
            </section>
          )}
          <section aria-labelledby="yaklasan-baslik" className="mt-10">
            <h2 id="yaklasan-baslik" className="text-2xl font-bold">Yaklaşan etkinlikler</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {digerleri.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
              {digerleri.length === 0 && <p className="text-ink-muted">Bu seçime uyan etkinlik yok.</p>}
            </div>
          </section>
        </div>
      )}

    </div>
  );
}
