import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useTercihler } from '../../context/Tercihler.jsx';
import Simge from '../common/Simge.jsx';

const LINKLER = [
  { to: '/', ad: 'Semtler', end: true },
  { to: '/kesfet', ad: 'Keşfet' },
  { to: '/gruplar', ad: 'Gruplar' },
  { to: '/atolyeler', ad: 'Atölyeler' },
  { to: '/etkinlikler', ad: 'Etkinlikler' },
  { to: '/pasaport', ad: 'Pasaportum' },
];

const bugun = () => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/** Üst bant: demo uyarısı (tasarımdaki lacivert şerit). */
function DemoBant() {
  return (
    <aside className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-navy px-4 py-2 text-[11px] font-semibold leading-4 tracking-[.2px] text-white sm:px-8">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-[#1B8755]" />
        DEMO VERİSİ · İçeriklerin bir kısmı örnektir, “Doğrulanacak” işaretliler teyit edilmedi
      </span>
      <span className="inline-flex items-center gap-3">
        <span className="opacity-80">{bugun()}</span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.06em]">Şehir keşif rehberi</span>
      </span>
    </aside>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { tema, temaDegistir, erisilebilir, setErisilebilir } = useTercihler();
  const acik = tema !== 'dark';
  const temaEtiketi = acik ? 'Koyu temaya geç' : 'Açık temaya geç';

  return (
    <>
      <DemoBant />
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-sayfa flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2.5 sm:px-8">
          <Link to="/" className="flex min-h-[44px] items-center gap-3 text-left no-underline" aria-label="Proje 404 ana sayfa">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-fill font-display text-base font-bold tracking-[-.3px] text-on-fill shadow-xs">404</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-base font-bold leading-5 text-heading">Proje 404</span>
              <span className="rounded-md border border-hairline bg-fill/[.08] px-1.5 py-0.5 text-[10px] font-bold text-heading">İSTANBUL</span>
            </span>
          </Link>

          <nav aria-label="Ana menü" className="flex flex-wrap items-center gap-1 text-[13px] leading-[18px]">
            {LINKLER.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-[44px] items-center rounded-[10px] border px-3.5 no-underline transition-colors',
                    isActive
                      ? 'border-hairline bg-surface-raised font-semibold text-heading'
                      : 'border-transparent font-medium text-ink-muted hover:bg-surface-raised hover:text-heading',
                  )
                }
              >
                {l.ad}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={erisilebilir}
              onClick={() => setErisilebilir(!erisilebilir)}
              className={clsx(
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3.5 text-[13px]',
                erisilebilir
                  ? 'border-success bg-success/10 font-semibold text-success'
                  : 'border-hairline bg-surface font-medium text-ink shadow-xs hover:bg-surface-raised',
              )}
            >
              <Simge ad="accessible" className={erisilebilir ? '' : 'text-ink-faint'} />
              {erisilebilir ? 'Erişilebilir mod açık' : 'Erişilebilir mod'}
            </button>
            <button
              type="button"
              aria-label={temaEtiketi}
              title={temaEtiketi}
              onClick={temaDegistir}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-faint hover:bg-surface-raised hover:text-heading"
            >
              <Simge ad={acik ? 'dark_mode' : 'light_mode'} boyut={20} />
            </button>
            <button type="button" onClick={() => navigate('/kesfet')} className="btn-ana">
              <Simge ad="swipe" /> Keşfetmeye başla
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
