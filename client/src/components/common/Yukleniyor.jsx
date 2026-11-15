import React from 'react';

// Bir rota çizgisi kendini çizer, duraklar çizgi ulaştıkça yanar. Kısa yüklemelerde
// göz kırpmasın diye animasyon 180 ms gecikmeyle belirir.
const YOL = 'M8 44 C 26 44, 30 14, 52 14 S 78 40, 96 30 S 118 10, 136 16';
const DURAKLAR = [
  { x: 8, y: 44, gecikme: 0 },
  { x: 52, y: 14, gecikme: 0.36 },
  { x: 96, y: 30, gecikme: 0.68 },
  { x: 136, y: 16, gecikme: 1 },
];

function RotaCizgisi({ boyut = 'w-36' }) {
  return (
    <svg viewBox="0 0 144 58" className={`yukleme-rota ${boyut} overflow-visible`} aria-hidden="true">
      <path d={YOL} pathLength="1" className="yukleme-iz" />
      <path d={YOL} pathLength="1" className="yukleme-cizgi" />
      {DURAKLAR.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="5" className="yukleme-durak" style={{ '--durak': d.gecikme }} />
      ))}
    </svg>
  );
}

/**
 * Yükleme göstergesi.
 * - Varsayılan: sayfanın ortasında rota animasyonu ve metin.
 * - kutu: harita gibi bir alanın yerini tutar (aynı yükseklikte, ton zeminli).
 */
export default function Yukleniyor({ metin = 'Yükleniyor…', kutu = false, yukseklik = 'h-[420px]' }) {
  if (kutu) {
    return (
      <div role="status" aria-live="polite" className={`yukleme-belir grid ${yukseklik} place-items-center rounded-[20px] bg-heading/[.05]`}>
        <div className="flex flex-col items-center gap-3 text-sm text-ink-muted">
          <RotaCizgisi boyut="w-24" />
          {metin}
        </div>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" className="yukleme-belir grid min-h-[60vh] place-items-center px-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <RotaCizgisi />
        <p className="text-base font-semibold text-ink-muted">{metin}</p>
      </div>
    </div>
  );
}

/** Liste sayfaları için kart iskeletleri: içerik gelince yerine aynı ızgarada kartlar oturur. */
export function IskeletKartlar({ sayi = 6, izgara = 'sm:grid-cols-2 lg:grid-cols-3', tur = 'kart', metin = 'Liste yükleniyor…' }) {
  return (
    <div role="status" aria-live="polite" className={`mt-6 grid gap-4 ${izgara}`}>
      <span className="sr-only">{metin}</span>
      {Array.from({ length: sayi }, (_, i) => (
        <div key={i} className="kart iskelet-kart flex gap-3 p-4" style={{ '--sira': i }} aria-hidden="true">
          {tur === 'mekan' && <span className="iskelet h-11 w-11 shrink-0 rounded-xl" />}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex gap-2">
              <span className="iskelet h-5 w-20 rounded-full" />
              {tur !== 'mekan' && <span className="iskelet h-5 w-14 rounded-full" />}
            </div>
            <span className="iskelet h-5 w-4/5 rounded-md" />
            <span className="iskelet h-3.5 w-full rounded-md" />
            <span className="iskelet h-3.5 w-3/5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HataKutusu({ metin, yenile }) {
  return (
    <div role="alert" className="mx-auto my-10 max-w-xl kart border-danger/40 p-6">
      <p className="font-semibold text-danger">{metin}</p>
      {yenile && (
        <button type="button" onClick={yenile} className="btn-ikincil mt-4">
          Tekrar dene
        </button>
      )}
    </div>
  );
}
