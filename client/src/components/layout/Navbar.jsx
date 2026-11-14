import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import clsx from 'clsx';
import { useTercihler } from '../../context/Tercihler.jsx';
import Simge from '../common/Simge.jsx';
import { useKaydirma } from '../../hooks/useKaydirma.js';

const LINKLER = [
  { to: '/', ad: 'Semtler', simge: 'map', end: true },
  { to: '/kesfet', ad: 'Keşfet', simge: 'swipe' },
  { to: '/rota-sihirbazi', ad: 'Rota sihirbazı', simge: 'auto_awesome' },
  { to: '/gruplar', ad: 'Gruplar', simge: 'groups' },
  { to: '/atolyeler', ad: 'Atölyeler', simge: 'palette' },
  { to: '/etkinlikler', ad: 'Etkinlikler', simge: 'event' },
  { to: '/pasaport', ad: 'Pasaportum', simge: 'badge' },
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
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[12px] font-semibold">Şehir keşif rehberi</span>
      </span>
    </aside>
  );
}

// Kısa ekranlarda (dizüstü, yatay telefon) düğmeler küçülür ki menü ekrana sığsın.
const rayDugmesi = 'group relative flex h-11 w-11 items-center justify-center rounded-[12px] no-underline transition-colors [@media(max-height:640px)]:h-9';

/** Düğmenin solunda beliren etiket (fareyle üzerine gelince ya da klavye odağında). */
function Etiket({ children }) {
  return (
    <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

/**
 * Aşağı kaydırınca sağ kenara asılan dikey menü. Geniş ekranda doğrudan görünür;
 * dar ekranda sağ alttaki "Menü" düğmesiyle açılır.
 */
function SagMenu({ erisilebilir, setErisilebilir, acik, temaDegistir, temaEtiketi }) {
  const azHareket = useReducedMotion();
  const konum = useLocation();
  const [mobilAcik, setMobilAcik] = useState(false);
  useEffect(() => setMobilAcik(false), [konum.pathname]);

  const gecis = azHareket ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 };
  const ayrac = <span aria-hidden="true" className="mx-auto my-1 h-px w-7 bg-[rgb(var(--border))]" />;

  return (
    <>
      <button
        type="button"
        aria-expanded={mobilAcik}
        aria-controls="sag-menu"
        aria-label={mobilAcik ? 'Menüyü kapat' : 'Menüyü aç'}
        onClick={() => setMobilAcik((a) => !a)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-fill text-on-fill shadow-md md:hidden"
      >
        <Simge ad={mobilAcik ? 'close' : 'menu'} boyut={26} />
      </button>
      {/* Konum dış kutuda (Tailwind dönüşümü), kayma animasyonu içteki menüde: ikisi çakışmasın. */}
      <div className={clsx('fixed bottom-[84px] right-3 z-50 md:bottom-auto md:top-1/2 md:block md:-translate-y-1/2', mobilAcik ? 'block' : 'hidden')}>
      <motion.nav
        id="sag-menu"
        aria-label="Hızlı menü"
        initial={azHareket ? false : { x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={azHareket ? undefined : { x: 80, opacity: 0 }}
        transition={gecis}
        className="flex flex-col gap-1 rounded-[18px] bg-surface p-1.5 shadow-md"
      >
        {LINKLER.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            aria-label={l.ad}
            className={({ isActive }) => clsx(rayDugmesi, isActive ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:bg-surface-raised hover:text-heading')}
          >
            <Simge ad={l.simge} boyut={22} />
            <Etiket>{l.ad}</Etiket>
          </NavLink>
        ))}
        {ayrac}
        <button
          type="button"
          aria-pressed={erisilebilir}
          aria-label="Erişilebilir mod"
          onClick={() => setErisilebilir(!erisilebilir)}
          className={clsx(rayDugmesi, erisilebilir ? 'bg-success/10 text-success' : 'text-ink-faint hover:bg-surface-raised hover:text-heading')}
        >
          <Simge ad="accessible" boyut={22} />
          <Etiket>{erisilebilir ? 'Erişilebilir mod açık' : 'Erişilebilir mod'}</Etiket>
        </button>
        <button type="button" aria-label={temaEtiketi} onClick={temaDegistir} className={clsx(rayDugmesi, 'text-ink-faint hover:bg-surface-raised hover:text-heading')}>
          <Simge ad={acik ? 'dark_mode' : 'light_mode'} boyut={22} />
          <Etiket>{temaEtiketi}</Etiket>
        </button>
        <button
          type="button"
          aria-label="Başa dön"
          onClick={() => window.scrollTo({ top: 0, behavior: azHareket ? 'auto' : 'smooth' })}
          className={clsx(rayDugmesi, 'text-ink-faint hover:bg-surface-raised hover:text-heading')}
        >
          <Simge ad="arrow_upward" boyut={22} />
          <Etiket>Başa dön</Etiket>
        </button>
      </motion.nav>
      </div>
    </>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { tema, temaDegistir, erisilebilir, setErisilebilir } = useTercihler();
  const acik = tema !== 'dark';
  const temaEtiketi = acik ? 'Koyu temaya geç' : 'Açık temaya geç';
  // Aşağı kaydırınca üst başlık sayfayla birlikte yukarı kayar, menü sağ kenara geçer.
  const kaydirildi = useKaydirma(160);

  return (
    <>
      <DemoBant />
      <AnimatePresence>
        {kaydirildi && (
          <SagMenu key="sag-menu" erisilebilir={erisilebilir} setErisilebilir={setErisilebilir} acik={acik} temaDegistir={temaDegistir} temaEtiketi={temaEtiketi} />
        )}
      </AnimatePresence>
      <header className={clsx('top-0 z-40 bg-surface', kaydirildi ? 'relative' : 'sticky')}>
        <div className="mx-auto flex max-w-sayfa flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2.5 sm:px-8">
          <Link to="/" className="flex min-h-[44px] items-center gap-3 text-left no-underline" aria-label="Proje 404 ana sayfa">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-fill font-display text-base font-bold tracking-[-.3px] text-on-fill">404</span>
            <span className="flex items-center gap-2">
              <span className="font-display text-base font-bold leading-5 text-heading">Proje 404</span>
              <span className="rounded-md bg-fill/[.08] px-1.5 py-0.5 text-[12px] font-semibold text-heading">İstanbul</span>
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
                    'flex min-h-[44px] items-center rounded-full px-3.5 no-underline transition-colors',
                    isActive
                      ? 'bg-heading/[.07] font-semibold text-heading'
                      : 'font-medium text-ink-muted hover:bg-heading/[.05] hover:text-heading',
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
                'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] transition-colors active:scale-[.98]',
                erisilebilir
                  ? 'bg-success/15 font-semibold text-success'
                  : 'bg-heading/[.07] font-medium text-ink hover:bg-accent-soft',
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
              className="flex h-11 w-11 items-center justify-center rounded-full bg-heading/[.07] text-ink-muted transition-colors hover:bg-accent-soft hover:text-heading"
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
