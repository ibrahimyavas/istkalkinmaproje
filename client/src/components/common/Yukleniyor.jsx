import React from 'react';

export default function Yukleniyor({ metin = 'Yükleniyor…' }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-16 text-ink-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden="true" />
      {metin}
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
