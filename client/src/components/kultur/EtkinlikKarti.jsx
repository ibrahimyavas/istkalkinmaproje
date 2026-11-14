import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Accessibility, MapPin } from 'lucide-react';
import { Etiket } from '../common/Rozetler.jsx';
import { ETKINLIK_TURU, tarihMetni } from '../../lib/etkinlik.js';

export default function EtkinlikKarti({ e }) {
  return (
    <article className="kart flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Etiket>{ETKINLIK_TURU[e.tur] || e.tur}</Etiket>
        {e.ucretsiz === true && <Etiket className="bg-success/15 text-success">Ücretsiz</Etiket>}
        {e.erisilebilir && (
          <Etiket className="bg-accent-soft text-accent"><Accessibility size={12} aria-hidden="true" /> Erişilebilir</Etiket>
        )}
        {e.ornek && <Etiket className="bg-warning/15 text-warning">Örnek etkinlik</Etiket>}
        {e.gercek && !e.arsiv && <Etiket className="bg-fill/10 text-heading">Kurumun sitesinden</Etiket>}
      </div>
      <h3 className="font-display text-lg font-bold leading-snug"><Link to={`/etkinlik/${e.id}`} className="text-heading no-underline hover:underline">{e.baslik}</Link></h3>
      {e.uzman && <p className="-mt-2 mb-0 text-[13px] text-ink-faint">{e.uzman.ad}{e.uzman.atolyeAdi ? ` · ${e.uzman.atolyeAdi}` : ''}</p>}
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <CalendarDays size={16} aria-hidden="true" className="shrink-0" />
        <time dateTime={e.baslangic}>{tarihMetni(e)}</time>
      </p>
      {e.mekan ? (
        <Link to={`/mekan/${e.mekan.id}`} className="flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline">
          <MapPin size={16} aria-hidden="true" /> {e.mekan.ad}
        </Link>
      ) : e.mekanAd && (
        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-heading">
          <MapPin size={16} aria-hidden="true" className="shrink-0" /> {e.mekanAd}
        </p>
      )}
    </article>
  );
}
