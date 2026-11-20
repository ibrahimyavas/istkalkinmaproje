import React, { useState } from 'react';
import Simge from '../common/Simge.jsx';
import { googleMapsRotaUrl, yandexMapsRotaUrl, appleMapsRotaUrl } from '../../lib/harita.js';

/**
 * Çok duraklı bir rotayı Google Maps, Yandex Maps ve Apple Maps'te açma / link kopyalama çubuğu.
 */
export default function RotaLinkleri({ duraklar = [], baslik = 'Navigasyon uygulamasında aç', kompakt = false }) {
  const [mod, setMod] = useState('walking');
  const [kopyalandi, setKopyalandi] = useState(null);

  const googleUrl = googleMapsRotaUrl(duraklar, mod);
  const yandexUrl = yandexMapsRotaUrl(duraklar, mod);
  const appleUrl = appleMapsRotaUrl(duraklar, mod);

  if (!googleUrl) return null;

  const kopyala = async (etiket, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setKopyalandi(etiket);
      setTimeout(() => setKopyalandi(null), 2000);
    } catch {
      /* pano erişimi kapalı */
    }
  };

  return (
    <section
      aria-label={baslik}
      className={kompakt ? 'rounded-[14px] border border-hairline bg-surface-raised p-3.5' : 'kart border border-hairline p-4 sm:p-5'}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Simge ad="near_me" boyut={18} className="text-accent" />
          <span className="font-display text-[14px] font-bold text-heading">{baslik}</span>
          <span className="text-[12px] text-ink-faint">({duraklar.length} durak)</span>
        </div>

        <div className="inline-flex rounded-full bg-heading/[.06] p-0.5 text-[11.5px]" role="group" aria-label="Ulaşım modu">
          {[
            ['walking', 'Yürüyüş', 'directions_walk'],
            ['transit', 'Toplu taşıma', 'directions_transit'],
          ].map(([k, ad, ik]) => (
            <button
              key={k}
              type="button"
              aria-pressed={mod === k}
              onClick={() => setMod(k)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold transition-colors ${
                mod === k ? 'bg-fill text-on-fill' : 'text-ink-muted hover:text-heading'
              }`}
            >
              <Simge ad={ik} boyut={14} /> {ad}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-[13px] font-semibold text-heading no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-heading"
        >
          <span className="h-2 w-2 rounded-full bg-[#4285F4]" aria-hidden="true" />
          Google Maps
          <Simge ad="open_in_new" boyut={14} className="text-ink-faint" />
        </a>

        <a
          href={yandexUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-[13px] font-semibold text-heading no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-heading"
        >
          <span className="h-2 w-2 rounded-full bg-[#FC3F1D]" aria-hidden="true" />
          Yandex Maps
          <Simge ad="open_in_new" boyut={14} className="text-ink-faint" />
        </a>

        <a
          href={appleUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-[13px] font-semibold text-heading no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-heading"
        >
          <span className="h-2 w-2 rounded-full bg-[#34C759]" aria-hidden="true" />
          Apple Maps
          <Simge ad="open_in_new" boyut={14} className="text-ink-faint" />
        </a>

        <button
          type="button"
          onClick={() => kopyala('google', googleUrl)}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-heading/[.07] px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-accent-soft hover:text-heading"
          title="Google Maps rota bağlantısını kopyala"
        >
          <Simge ad={kopyalandi === 'google' ? 'check' : 'content_copy'} boyut={15} />
          {kopyalandi === 'google' ? 'Kopyalandı' : 'Linki kopyala'}
        </button>
      </div>
    </section>
  );
}
