import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Stamp } from 'lucide-react';
import clsx from 'clsx';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { damgalariOku, rozetler, ROZET_ESIGI } from '../lib/pasaport.js';

export default function PasaportSayfasi() {
  const navigate = useNavigate();
  const semtler = useApi(() => api.semtler(), []);
  const [damgalar] = useState(damgalariOku);
  const [kod, setKod] = useState('');
  const liste = rozetler(damgalar, semtler.veri || []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="eyebrow">Dijital semt pasaportu</p>
      <h1 className="mt-2 text-4xl font-bold">Pasaportum</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">
        Mekanlardaki QR kodları okutarak damga toplayın. Bir semtte {ROZET_ESIGI} damga topladığınızda o semtin rozetini kazanırsınız.
      </p>

      <form
        className="mt-6 flex max-w-md items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (kod.trim()) navigate(`/damga/${encodeURIComponent(kod.trim())}`);
        }}
      >
        <div className="flex-1">
          <label htmlFor="kod" className="etiket">QR okutamıyor musunuz? Kodu yazın</label>
          <input id="kod" className="girdi font-mono uppercase" placeholder="Örn. AYS-01" value={kod} onChange={(e) => setKod(e.target.value)} />
        </div>
        <button type="submit" className="btn-ana"><Stamp size={16} aria-hidden="true" /> Damgala</button>
      </form>

      <section aria-labelledby="rozet-baslik" className="mt-10">
        <h2 id="rozet-baslik" className="text-2xl font-bold">Rozetler</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {liste.map((r) => (
            <li key={r.semtId} className={clsx('kart flex items-center gap-4 p-4', r.kazanildi && 'border-accent')}>
              <span className={clsx('grid h-14 w-14 place-items-center rounded-full', r.kazanildi ? 'bg-accent text-accent-contrast' : 'bg-surface-raised text-ink-faint')}>
                <Award size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{r.ad}</p>
                <p className="text-sm text-ink-muted">
                  {r.kazanildi ? 'Rozet kazanıldı' : `${r.adet} / ${ROZET_ESIGI} damga`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="damga-baslik" className="mt-10">
        <h2 id="damga-baslik" className="text-2xl font-bold">Damgalarım ({damgalar.length})</h2>
        {damgalar.length === 0 ? (
          <p className="mt-3 text-ink-muted">Henüz damganız yok. <Link to="/" className="font-semibold text-accent underline">Bir semt seçin</Link> ve rotaya çıkın.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {damgalar.map((d) => (
              <li key={d.mekanId} className="kart flex items-center gap-3 p-3">
                <Stamp size={18} className="text-lale" aria-hidden="true" />
                <Link to={`/mekan/${d.mekanId}`} className="font-semibold hover:underline">{d.mekanAd}</Link>
                <span className="ml-auto text-xs text-ink-muted">{new Date(d.tarih).toLocaleDateString('tr-TR')}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-ink-muted">Demo sürümde damgalar yalnızca bu tarayıcıda saklanır.</p>
      </section>
    </div>
  );
}
