import React, { useState } from 'react';
import Simge from '../common/Simge.jsx';
import { googleTakvimUrl, icsIndir } from '../../lib/takvim.js';

/**
 * Etkinlik veya grup gezintisi için Google Takvim bağlantısı ve .ics indirme düğmeleri.
 */
export default function TakvimeEkleDugmesi({ etkinlik, kompakt = false }) {
  const [acik, setAcik] = useState(false);
  const [indirildi, setIndirildi] = useState(false);

  const gUrl = googleTakvimUrl(etkinlik);
  if (!gUrl) return null;

  const indir = () => {
    if (icsIndir(etkinlik)) {
      setIndirildi(true);
      setTimeout(() => setIndirildi(false), 2000);
    }
  };

  if (kompakt) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          aria-expanded={acik}
          onClick={() => setAcik((v) => !v)}
          className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-heading/[.07] px-3 text-[12px] font-semibold text-heading transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <Simge ad="calendar_add_on" boyut={15} />
          <span>Takvime ekle</span>
        </button>
        {acik && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <a
              href={gUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-hairline bg-surface px-2.5 text-[11.5px] font-semibold text-heading no-underline hover:border-accent hover:bg-accent-soft"
            >
              <Simge ad="open_in_new" boyut={13} /> Google Takvim
            </a>
            <button
              type="button"
              onClick={indir}
              className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-hairline bg-surface px-2.5 text-[11.5px] font-semibold text-heading hover:border-accent hover:bg-accent-soft"
            >
              <Simge ad={indirildi ? 'check' : 'download'} boyut={13} />
              {indirildi ? 'İndirildi' : '.ics (Apple / Outlook)'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Takvime ekle">
      <a
        href={gUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-ikincil no-underline"
      >
        <Simge ad="calendar_add_on" boyut={18} className="text-accent" />
        Google Takvim’e ekle
      </a>
      <button type="button" onClick={indir} className="btn-ikincil">
        <Simge ad={indirildi ? 'check' : 'download'} boyut={18} />
        {indirildi ? '.ics indirildi' : '.ics indir (Apple / Outlook)'}
      </button>
    </div>
  );
}
