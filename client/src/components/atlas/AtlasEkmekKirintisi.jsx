import React from 'react';

export default function AtlasEkmekKirintisi({
  ozet,
  yaka,
  ilce,
  mahalle,
  onReset,
  onSelectYaka,
  onSelectIlce,
}) {
  const ilceAd = ilce ? ozet?.ilceler?.[ilce]?.ad || ilce : null;
  const etkinYaka = yaka || (ilce ? ozet?.ilceler?.[ilce]?.yaka : null);
  const yakaAd = etkinYaka ? ozet?.yakalar?.[etkinYaka]?.ad || etkinYaka : null;
  const mahAd = ilce && mahalle ? ozet?.ilceler?.[ilce]?.mahalleler?.[mahalle]?.ad || mahalle : null;

  return (
    <nav aria-label="Harita konumu" className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-1.5">
      <div className="atlas-chrome inline-flex items-center gap-0.5 rounded-full p-1 text-[12px]">
        <button
          type="button"
          onClick={onReset}
          className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
            !etkinYaka && !ilce ? 'bg-fill text-on-fill' : 'text-ink-muted hover:bg-heading/[.06] hover:text-heading'
          }`}
        >
          İstanbul
        </button>

        {etkinYaka && (
          <>
            <span className="px-0.5 text-ink-faint" aria-hidden="true">›</span>
            <button
              type="button"
              onClick={() => onSelectYaka(etkinYaka)}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                !ilce ? 'bg-fill text-on-fill' : 'text-ink-muted hover:bg-heading/[.06] hover:text-heading'
              }`}
            >
              {yakaAd}
            </button>
          </>
        )}

        {ilce && (
          <>
            <span className="px-0.5 text-ink-faint" aria-hidden="true">›</span>
            <button
              type="button"
              onClick={() => onSelectIlce(ilce, etkinYaka)}
              className={`rounded-full px-2.5 py-1 font-semibold transition-colors ${
                !mahalle ? 'bg-fill text-on-fill' : 'text-ink-muted hover:bg-heading/[.06] hover:text-heading'
              }`}
            >
              {ilceAd}
            </button>
          </>
        )}

        {mahalle && (
          <>
            <span className="px-0.5 text-ink-faint" aria-hidden="true">›</span>
            <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-white">
              {mahAd}
            </span>
          </>
        )}
      </div>

      {!etkinYaka && !ilce && ozet?.yakalar && (
        <div className="hidden items-center gap-1.5 sm:flex">
          {['avrupa', 'anadolu'].map((yk) => (
            <button
              key={yk}
              type="button"
              onClick={() => onSelectYaka(yk)}
              className="atlas-chrome rounded-full px-3 py-1.5 text-[12px] font-semibold text-heading transition-colors hover:bg-accent-soft"
            >
              {ozet.yakalar[yk]?.ad}{' '}
              <span className="font-medium text-ink-muted">({ozet.yakalar[yk]?.n || 0})</span>
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
