import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Accessibility, MapPin } from 'lucide-react';
import { Etiket } from '../common/Rozetler.jsx';

const TUR = { atolye: 'Atölye', yuruyus: 'Yürüyüş', konser: 'Konser', edebiyat: 'Edebiyat', soylesi: 'Söyleşi', sergi: 'Sergi', tiyatro: 'Tiyatro', festival: 'Festival' };

const tarihYaz = (iso) =>
  new Date(iso).toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

export default function EtkinlikKarti({ e }) {
  return (
    <article className="kart flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Etiket>{TUR[e.tur] || e.tur}</Etiket>
        {e.ucretsiz && <Etiket className="bg-success/15 text-success">Ücretsiz</Etiket>}
        {e.erisilebilir && (
          <Etiket className="bg-accent-soft text-accent"><Accessibility size={12} aria-hidden="true" /> Erişilebilir</Etiket>
        )}
        {e.ornek && <Etiket className="bg-warning/15 text-warning">Örnek etkinlik</Etiket>}
      </div>
      <h3 className="font-display text-lg font-bold leading-snug"><Link to={`/etkinlik/${e.id}`} className="text-heading no-underline hover:underline">{e.baslik}</Link></h3>
      {e.uzman && <p className="-mt-2 mb-0 text-[13px] text-ink-faint">{e.uzman.ad}{e.uzman.atolyeAdi ? ` · ${e.uzman.atolyeAdi}` : ""}</p>}
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <CalendarDays size={16} aria-hidden="true" />
        <time dateTime={e.baslangic}>{tarihYaz(e.baslangic)}</time>
      </p>
      {e.mekan && (
        <Link to={`/mekan/${e.mekan.id}`} className="flex items-center gap-2 text-sm font-semibold text-accent underline-offset-4 hover:underline">
          <MapPin size={16} aria-hidden="true" /> {e.mekan.ad}
        </Link>
      )}
    </article>
  );
}
