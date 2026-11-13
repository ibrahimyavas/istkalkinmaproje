import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import GrupKarti from '../components/grup/GrupKarti.jsx';

export default function GruplarSayfasi() {
  const { erisilebilir } = useTercihler();
  const semtler = useApi(() => api.semtler(), []);
  const [semtId, setSemtId] = useState('');
  const gruplar = useApi(() => api.gruplar(semtId ? { semtId } : {}), [semtId]);
  const liste = useMemo(() => (gruplar.veri || []).filter((g) => !erisilebilir || g.erisilebilir), [gruplar.veri, erisilebilir]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Users size={14} aria-hidden="true" /> Gezinti grupları</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Aynı rotayı birlikte yürü</h1>
          <p className="mt-2 max-w-2xl text-ink-muted">Yalnız gezen gezginler ve İstanbullular için: bir rota seç, gün ve saat belirle, katılmak isteyenler sana katılsın.</p>
        </div>
        <Link to="/gruplar/yeni" className="btn-ana"><Plus size={16} aria-hidden="true" /> Grup aç</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="g-semt" className="etiket">Semt</label>
          <select id="g-semt" className="girdi w-56" value={semtId} onChange={(e) => setSemtId(e.target.value)}>
            <option value="">Tüm semtler</option>
            {(semtler.veri || []).map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        {erisilebilir && <p className="pb-3 text-sm font-semibold text-accent">Erişilebilir mod: yalnızca erişilebilir gruplar</p>}
      </div>

      {gruplar.yukleniyor && <Yukleniyor />}
      {gruplar.hata && <HataKutusu metin={gruplar.hata} yenile={gruplar.yenile} />}
      {gruplar.veri && (
        liste.length ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
            {liste.map((g) => <li key={g.id}><GrupKarti g={g} /></li>)}
          </ul>
        ) : (
          <div className="kart mt-6 p-8 text-center">
            <p className="font-semibold">Bu seçime uyan yaklaşan grup yok.</p>
            <Link to="/gruplar/yeni" className="btn-ana mt-4">İlk grubu sen aç</Link>
          </div>
        )
      )}
    </div>
  );
}
