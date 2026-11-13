import React from 'react';
import { Link } from 'react-router-dom';

const SUTUNLAR = [
  {
    baslik: 'Keşfet',
    linkler: [
      ['/#semtler', 'Semtler'],
      ['/semt/balat', 'Hikâye rotaları'],
      ['/atolyeler', 'Atölyeler'],
      ['/etkinlikler', 'Etkinlikler'],
    ],
  },
  {
    baslik: 'Birlikte',
    linkler: [
      ['/gruplar', 'Gezinti grupları'],
      ['/pasaport', 'Pasaportum'],
      ['/bildir', 'Sahadan sorun bildir'],
      ['/uzman', 'Uzman paneli'],
      ['/admin', 'Yönetim'],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 bg-navy pb-8 pt-12 text-white">
      <div className="mx-auto max-w-sayfa px-4 sm:px-8">
        <div className="grid gap-8 border-b border-white/10 pb-10 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white font-display text-sm font-bold text-[#0A2540]">404</span>
              <span className="font-display text-base font-bold">Proje 404</span>
            </div>
            <p className="m-0 max-w-[36ch] text-white/75">İstanbul’un semtlerini, atölyelerini ve hikâyelerini yürüyerek keşfetmek için.</p>
          </div>
          {SUTUNLAR.map((s) => (
            <div key={s.baslik}>
              <h3 className="mb-3 font-display text-[13px] font-semibold uppercase tracking-[.06em] text-white">{s.baslik}</h3>
              <ul className="grid gap-2 text-[13px]">
                {s.linkler.map(([to, ad]) => (
                  <li key={to}>
                    <Link to={to} className="text-white/75 hover:text-white">{ad}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-xs text-white/70">
          <span className="inline-flex items-center gap-2">
            <span className="rounded-md bg-white/[.12] px-2 py-0.5 text-[10px] font-bold tracking-[.06em] text-white">DEMO VERİSİ</span>
            İçeriklerin bir kısmı örnektir.
          </span>
          <span>
            Harita verisi © <a href="https://www.openstreetmap.org/copyright" className="text-white hover:text-white" target="_blank" rel="noreferrer">OpenStreetMap katkıcıları</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
