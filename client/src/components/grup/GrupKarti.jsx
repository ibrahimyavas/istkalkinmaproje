import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Accessibility, MapPin, Languages } from 'lucide-react';
import { Etiket } from '../common/Rozetler.jsx';

export const DIL = { tr: 'Türkçe', en: 'English', 'tr-en': 'Türkçe / English' };
export const tarihYaz = (iso) =>
  new Date(iso).toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

export default function GrupKarti({ g }) {
  return (
    <Link to={`/grup/${g.id}`} className="kart flex h-full flex-col gap-3 p-4 transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        {g.erisilebilir && <Etiket className="bg-accent-soft text-accent"><Accessibility size={12} aria-hidden="true" /> Erişilebilir</Etiket>}
        {g.dolu && <Etiket className="bg-danger/15 text-danger">Dolu</Etiket>}
        {g.ornek && <Etiket className="bg-warning/15 text-warning">Örnek grup</Etiket>}
      </div>
      <h3 className="font-display text-lg font-bold leading-snug">{g.baslik}</h3>
      <ul className="space-y-1 text-sm text-ink-muted">
        <li className="flex items-center gap-2"><CalendarDays size={14} aria-hidden="true" /> <time dateTime={g.baslangic}>{tarihYaz(g.baslangic)}</time></li>
        {g.rota && <li className="flex items-center gap-2"><MapPin size={14} aria-hidden="true" /> {g.rota.ad}</li>}
        <li className="flex items-center gap-2"><Users size={14} aria-hidden="true" /> {g.katilimciSayisi} / {g.kapasite} kişi · açan: {g.rumuz}</li>
        <li className="flex items-center gap-2"><Languages size={14} aria-hidden="true" /> {DIL[g.dil]}</li>
      </ul>
    </Link>
  );
}
