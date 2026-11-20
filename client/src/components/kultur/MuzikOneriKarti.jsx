import React, { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Simge from '../common/Simge.jsx';

const PLATFORMLAR = [
  {
    anahtar: 'youtubeMusic',
    ad: 'YouTube Music’te dinle',
    kisa: 'YT Music',
    renk: '#FF0033',
  },
  {
    anahtar: 'spotify',
    ad: 'Spotify’da dinle',
    kisa: 'Spotify',
    renk: '#1DB954',
  },
  {
    anahtar: 'appleMusic',
    ad: 'Apple Music’te dinle',
    kisa: 'Apple Music',
    renk: '#FA243C',
  },
];

/**
 * Konuma veya mekana özel müzik önerisi kartı.
 * - `ozel: true`: "Biz size bunu öneriyoruz" vurgulu birebir mekan eşleştirmesi.
 * - `ozel: false`: İlçe/semt torbasından rastgele öneri + "Başka öner" düğmesi.
 * - `kompakt`: AtlasPanel içine sığan dar görünüm.
 */
export default function MuzikOneriKarti({ muzik, sorgu = {}, kompakt = false }) {
  const [aktif, setAktif] = useState(muzik);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    setAktif(muzik);
  }, [muzik]);

  if (!aktif) return null;

  const baskaOner = async () => {
    if (yukleniyor) return;
    setYukleniyor(true);
    try {
      const yeni = await api.muzikOner({
        ...sorgu,
        haric: aktif.id,
        torbadan: sorgu.mekanId ? 1 : undefined,
      });
      if (yeni) setAktif(yeni);
    } catch {
      /* sessizce mevcut parçada kal */
    } finally {
      setYukleniyor(false);
    }
  };

  const baskaMumkun = (aktif.havuzBoyutu || 1) > 1;

  if (kompakt) {
    return (
      <section
        aria-label="Konuma göre müzik önerisi"
        className="mx-3 mb-3 rounded-[14px] border border-hairline bg-surface-raised p-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                aktif.ozel ? 'bg-accent text-white' : 'bg-accent/12 text-accent'
              }`}
            >
              <Simge ad={aktif.ozel ? 'auto_awesome' : 'music_note'} boyut={17} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[10.5px] font-bold uppercase tracking-[0.07em] text-accent">
                {aktif.etiket}
              </div>
              <div className="truncate font-display text-[14px] font-bold leading-snug text-heading">
                {aktif.eser}
              </div>
            </div>
          </div>

          {baskaMumkun && (
            <button
              type="button"
              onClick={baskaOner}
              disabled={yukleniyor}
              title="Bu bölgenin torbasından başka bir eser öner"
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-heading/[.07] px-2.5 text-[11.5px] font-semibold text-heading transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-50"
            >
              <Simge ad="shuffle" boyut={14} />
              <span>Başka</span>
            </button>
          )}
        </div>

        <div className="mt-1 text-[12px] text-ink-muted">
          <span className="font-medium text-ink">{aktif.sanatci}</span>
          {aktif.donem && <span> · {aktif.donem}</span>}
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PLATFORMLAR.map((p) => {
            const href = aktif.linkler?.[p.anahtar];
            if (!href) return null;
            return (
              <a
                key={p.anahtar}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[28px] items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 text-[11.5px] font-semibold text-heading no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-heading"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: p.renk }} aria-hidden="true" />
                <span>{p.kisa}</span>
                <Simge ad="open_in_new" boyut={12} className="opacity-60" />
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Müzik önerisi"
      className={`kart overflow-hidden border p-5 sm:p-6 ${
        aktif.ozel ? 'border-accent/35' : 'border-hairline'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${
              aktif.ozel ? 'bg-accent text-white' : 'bg-fill text-on-fill'
            }`}
          >
            <Simge ad={aktif.ozel ? 'auto_awesome' : 'music_note'} boyut={24} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
                  aktif.ozel ? 'bg-accent/12 text-accent' : 'bg-heading/[.07] text-heading'
                }`}
              >
                {aktif.etiket}
              </span>
              {aktif.donem && <span className="text-[12.5px] text-ink-faint">{aktif.donem}</span>}
            </div>
            <h2 className="m-0 mt-1.5 font-display text-xl font-bold leading-snug text-heading sm:text-2xl">
              {aktif.eser}
            </h2>
            <p className="m-0 mt-0.5 text-[15px] font-medium text-ink">{aktif.sanatci}</p>
          </div>
        </div>

        {baskaMumkun && (
          <button
            type="button"
            onClick={baskaOner}
            disabled={yukleniyor}
            className="btn-ikincil shrink-0"
          >
            <Simge ad="shuffle" boyut={17} />
            {aktif.ozel ? 'Bölgeden başka öner' : 'Başka eser öner'}
          </button>
        )}
      </div>

      {aktif.not && (
        <p className="mb-0 mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-muted">
          {aktif.not}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {PLATFORMLAR.map((p) => {
          const href = aktif.linkler?.[p.anahtar];
          if (!href) return null;
          return (
            <a
              key={p.anahtar}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-hairline bg-surface-raised px-4 text-[13.5px] font-semibold text-heading no-underline transition-colors hover:border-accent hover:bg-accent-soft hover:text-heading"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.renk }} aria-hidden="true" />
              <span>{p.ad}</span>
              <Simge ad="open_in_new" boyut={15} className="text-ink-faint" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
