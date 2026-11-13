import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

function Gorsel({ g, etiket }) {
  if (!g?.url) {
    return (
      <div className="grid h-full w-full place-items-center bg-surface-raised text-center text-sm text-ink-muted">
        <span className="flex flex-col items-center gap-2 p-4">
          <ImageOff size={24} aria-hidden="true" />
          {etiket} görseli lisansı kontrol edilerek eklenecek
          {g?.yil && <span className="text-xs">({g.yil})</span>}
        </span>
      </div>
    );
  }
  return <img src={g.url} alt={`${etiket}${g.yil ? ` (${g.yil})` : ''}`} className="h-full w-full object-cover" loading="lazy" />;
}

/** Eski ve yeni fotoğrafı kaydırıcıyla karşılaştırır. Klavyeyle de kullanılabilir. */
export default function DunBugun({ cift }) {
  const [oran, setOran] = useState(50);
  const kunye = (g) => [g?.yazar, g?.yil, g?.lisans].filter(Boolean).join(' · ');

  return (
    <figure className="kart overflow-hidden">
      <div className="relative aspect-[4/3] w-full select-none">
        <div className="absolute inset-0"><Gorsel g={cift.yeni} etiket="Bugün" /></div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - oran}% 0 0)` }}>
          <div className="h-full w-full grayscale-[30%] sepia-[35%]"><Gorsel g={cift.eski} etiket="Dün" /></div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white" style={{ left: `${oran}%` }} aria-hidden="true" />
        <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Dün</span>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">Bugün</span>
        <input
          type="range" min="0" max="100" value={oran}
          onChange={(e) => setOran(Number(e.target.value))}
          className="db-range absolute inset-0 h-full w-full cursor-ew-resize opacity-0 focus:opacity-100"
          aria-label={`${cift.baslik}: dün ve bugün karşılaştırması`}
        />
      </div>
      <figcaption className="p-4">
        <p className="font-semibold">{cift.baslik}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {kunye(cift.eski) ? `Dün: ${kunye(cift.eski)}` : 'Arşiv görseli: kamu malı/açık lisanslı kaynaktan eklenecek'}
          {kunye(cift.yeni) ? ` · Bugün: ${kunye(cift.yeni)}` : ''}
        </p>
      </figcaption>
    </figure>
  );
}
