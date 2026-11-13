import React from 'react';
import { Feather, Volume2, Square, ExternalLink, Lock } from 'lucide-react';
import { useSpeech } from '../../hooks/useSpeech.js';
import { api } from '../../services/api.js';

/**
 * Şiir kartı. Gösterilecek metne sunucu karar verir (`gosterim`):
 *  - tam:    kamu malı eser, tam metin
 *  - alinti: korumalı eser, kısa alıntı
 *  - yok:    metin izin bekliyor; yalnızca künye ve kaynak
 */
export default function SiirKarti({ siir, semtId }) {
  const { destek, oku, durdur, konusanId } = useSpeech();
  const { gosterim } = siir;
  const okunuyor = konusanId === siir.id;

  const dinle = () => {
    if (okunuyor) return durdur();
    oku({ id: siir.id, metin: `${siir.sair}. ${siir.baslik}. ${gosterim.metin}` });
    api.olay({ tip: 'siir_dinleme', semtId });
  };

  return (
    <article className="kart p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Feather size={14} aria-hidden="true" /> Şiir ve edebiyat</p>
          <h3 className="mt-1 text-xl font-bold">{siir.baslik}</h3>
          <p className="text-ink-muted">
            {siir.sair}
            {siir.yil ? ` · ${siir.yil}` : ''}
          </p>
        </div>
        {destek && gosterim.metin && (
          <button type="button" onClick={dinle} className="btn-ikincil shrink-0" aria-pressed={okunuyor}>
            {okunuyor ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            {okunuyor ? 'Durdur' : 'Dinle'}
          </button>
        )}
      </div>

      {gosterim.tip !== 'yok' && (
        <blockquote className="siir mt-4 pl-4 font-display text-lg leading-relaxed">{gosterim.metin}</blockquote>
      )}

      {gosterim.tip === 'yok' && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface-raised p-3 text-sm text-ink-muted">
          <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {siir.telifDurumu === 'korumali'
            ? 'Bu eser telif koruması altında. Metin, hak sahibinin izni alındıktan sonra eklenecek.'
            : 'Metin basılı kaynaktan aktarılmayı bekliyor.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <span>{siir.telifDurumu === 'kamu-mali' ? 'Kamu malı eser' : 'Telif korumalı eser'}</span>
        {siir.metinDogrulandi === false && gosterim.metin && <span className="text-warning">Metin basılı baskıdan doğrulanacak</span>}
        {siir.kaynak && (
          <a href={siir.kaynak} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
            Kaynak <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
