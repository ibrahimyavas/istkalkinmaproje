import React from 'react';
import { Link } from 'react-router-dom';
import { Palette, Landmark, Film, Feather, ChevronRight } from 'lucide-react';
import { DogrulanacakRozet, Etiket } from '../common/Rozetler.jsx';
import { MEKAN_TURU, ZANAAT } from '../../lib/harita.js';

const IKON = { atolye: Palette, film: Film, edebiyat: Feather };

export default function MekanKarti({ m }) {
  const Ikon = IKON[m.tur] || Landmark;
  return (
    <Link to={`/mekan/${m.id}`} className="kart group flex items-start gap-3 p-4 transition-colors">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Ikon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <Etiket>{m.tur === 'atolye' && m.zanaat ? ZANAAT[m.zanaat] : MEKAN_TURU[m.tur] || m.tur}</Etiket>
          <DogrulanacakRozet dogrulandi={m.dogrulandi} />
        </span>
        <span className="mt-1.5 block font-semibold leading-snug">{m.ad}</span>
        <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">{m.kisa}</span>
      </span>
      <ChevronRight size={18} className="mt-3 shrink-0 text-ink-faint group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
