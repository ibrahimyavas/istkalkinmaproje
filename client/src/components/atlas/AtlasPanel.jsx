import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Simge from '../common/Simge.jsx';
import MuzikOneriKarti from '../kultur/MuzikOneriKarti.jsx';
import { simgeOf } from '../../lib/sunum.js';

const ROTA_TUR = {
  hikaye: 'Hikâye rotası',
  zanaat: 'Zanaat rotası',
  edebiyat: 'Edebiyat rotası',
};

function MekanSatiri({ m, onHover, onLeave }) {
  const simge = simgeOf(m);
  const simgeYapi = m.rozetler?.includes('simge');

  return (
    <li onMouseEnter={() => onHover?.(m)} onMouseLeave={() => onLeave?.()}>
      <Link
        to={`/mekan/${m.id}`}
        className="group flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-ink no-underline transition-colors hover:bg-accent-soft hover:text-ink"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors ${
            simgeYapi
              ? 'bg-accent/12 text-accent'
              : 'bg-heading/[.06] text-heading group-hover:bg-surface'
          }`}
        >
          <Simge ad={simge} boyut={18} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-display text-[14.5px] font-bold leading-5 text-heading">
              {m.ad}
            </span>
            {simgeYapi && (
              <Simge ad="star" boyut={14} className="shrink-0 text-accent" />
            )}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-muted">
            <span className="truncate">{m.konum}</span>
            {m.erisilebilir && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-px text-[10.5px] font-semibold text-success">
                Erişilebilir
              </span>
            )}
            {m.damgaKodu && (
              <span className="inline-flex items-center rounded-full bg-heading/[.07] px-1.5 py-px text-[10.5px] font-semibold text-ink-muted">
                Pasaport
              </span>
            )}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {m.puan != null ? (
            <span className="rounded-full bg-heading/[.07] px-2 py-0.5 font-display text-[12px] font-bold tabular-nums text-heading">
              {String(m.puan).replace('.', ',')}
            </span>
          ) : (
            <span className="hidden text-[12px] font-medium text-ink-faint sm:inline">
              {m.turAd}
            </span>
          )}
          <Simge
            ad="arrow_forward"
            boyut={17}
            className="text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </span>
      </Link>
    </li>
  );
}

export default function AtlasPanel({
  liste,
  yukleniyor,
  tur,
  rozet,
  erisilebilir,
  onSelectTur,
  onSelectRozet,
  onClearFilter,
  onSelectIlce,
  onSelectMahalle,
  onHoverMekan,
  onLeaveMekan,
}) {
  const [tumCipler, setTumCipler] = useState(false);

  const turCipleri = liste?.cipler?.turler || [];
  const rozetCipleri = liste?.cipler?.rozetler || [];
  const gorunenRozetler = tumCipler ? rozetCipleri : rozetCipleri.slice(0, 2);
  const gorunenTurler = tumCipler ? turCipleri : turCipleri.slice(0, 3);
  const kalanCip = Math.max(0, rozetCipleri.length - 2) + Math.max(0, turCipleri.length - 3);

  const grupluGosterim = !tur && !rozet && (liste?.gruplar?.length || 0) > 0;

  return (
    <aside
      aria-label="Bölge mekan rehberi"
      className="flex h-full min-h-0 flex-col bg-surface text-ink"
    >
      {/* Başlık ve Proje 404 filtre çipleri */}
      <header className="shrink-0 border-b border-hairline px-5 pb-3.5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
              {liste?.ustBaslik || 'İSTANBUL'}
            </div>
            <h3 className="m-0 mt-0.5 truncate font-display text-2xl font-bold tracking-[-.02em] text-heading">
              {liste?.baslik || 'İstanbul'}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-heading/[.07] px-3 py-1 text-[12.5px] font-semibold text-heading">
            {liste ? `${liste.filtreliToplam} mekan` : '…'}
          </span>
        </div>

        {erisilebilir && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-success">
            <Simge ad="accessible" boyut={14} /> Erişilebilir mod etkin
          </div>
        )}

        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Kategori ve rozet filtreleri"
        >
          <button
            type="button"
            aria-pressed={!tur && !rozet}
            onClick={onClearFilter}
            className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors active:scale-[.98] ${
              !tur && !rozet
                ? 'bg-fill font-semibold text-on-fill'
                : 'bg-heading/[.07] font-medium text-ink hover:bg-accent-soft'
            }`}
          >
            Tümü
          </button>

          {gorunenRozetler.map((r) => {
            const acik = rozet === r.id;
            return (
              <button
                key={`r-${r.id}`}
                type="button"
                aria-pressed={acik}
                onClick={() => (acik ? onClearFilter() : onSelectRozet(r.id))}
                className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors active:scale-[.98] ${
                  acik
                    ? 'bg-accent font-semibold text-white'
                    : 'bg-accent/10 font-semibold text-accent hover:bg-accent/20'
                }`}
              >
                <span>{r.ad}</span>
                <span className="opacity-75">{r.n}</span>
              </button>
            );
          })}

          {gorunenTurler.map((t) => {
            const acik = tur === t.id;
            return (
              <button
                key={`t-${t.id}`}
                type="button"
                aria-pressed={acik}
                onClick={() => (acik ? onClearFilter() : onSelectTur(t.id))}
                className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors active:scale-[.98] ${
                  acik
                    ? 'bg-fill font-semibold text-on-fill'
                    : 'bg-heading/[.07] font-medium text-ink hover:bg-accent-soft'
                }`}
              >
                <span>{t.ad}</span>
                <span className="opacity-65">{t.n}</span>
              </button>
            );
          })}

          {kalanCip > 0 && !tumCipler && (
            <button
              type="button"
              onClick={() => setTumCipler(true)}
              className="inline-flex min-h-[32px] items-center rounded-full border border-dashed border-hairline-strong px-3 text-[12px] font-semibold text-ink-muted hover:border-accent hover:text-accent"
            >
              +{kalanCip} filtre
            </button>
          )}
          {tumCipler && kalanCip > 0 && (
            <button
              type="button"
              onClick={() => setTumCipler(false)}
              className="inline-flex min-h-[32px] items-center rounded-full px-2.5 text-[12px] font-semibold text-ink-muted hover:text-heading"
            >
              Daha az
            </button>
          )}
        </div>
      </header>

      {/* Kaydırılabilir mekan, rota ve alt bölge listesi */}
      <div className="atlas-scroll flex-1 px-3 pb-4 pt-3">
        {liste?.muzik && (
          <div className="-mx-3">
            <MuzikOneriKarti
              kompakt
              muzik={liste.muzik}
              sorgu={{
                ilce: liste.ilce || undefined,
                yaka: liste.yaka || undefined,
                bolgeAd: liste.mahalleAd ? `${liste.mahalleAd}, ${liste.ilceAd}` : liste.baslik,
              }}
            />
          </div>
        )}
        {yukleniyor && !liste ? (
          <div className="py-12 text-center text-sm text-ink-muted">Mekanlar yükleniyor…</div>
        ) : liste?.filtreliToplam === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="m-0 font-display text-base font-bold text-heading">
              Bu bölgede henüz kayıt yok
            </p>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              {erisilebilir
                ? 'Erişilebilir mod filtreyi daralttı; üst menüden kapatabilir ya da başka bir ilçe seçebilirsiniz.'
                : 'Haritada renkli ilçelere dokunarak mekanları görebilir veya yeni mekan önerebilirsiniz.'}
            </p>
            <Link to="/bildir" className="btn-ikincil mt-4 no-underline">
              <Simge ad="add_location_alt" boyut={17} /> Mekan öner
            </Link>
          </div>
        ) : grupluGosterim ? (
          <div className="space-y-4">
            {liste.gruplar.map((g) => (
              <section key={g.id} aria-label={g.ad}>
                <div className="mb-1 flex items-center justify-between px-3">
                  <button
                    type="button"
                    onClick={() => onSelectTur(g.id)}
                    className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted hover:text-accent"
                  >
                    {g.ad} ({g.toplam})
                  </button>
                  {g.toplam > g.mekanlar.length && (
                    <button
                      type="button"
                      onClick={() => onSelectTur(g.id)}
                      className="text-[12px] font-semibold text-accent hover:underline"
                    >
                      Tümü →
                    </button>
                  )}
                </div>
                <ul className="m-0 list-none space-y-0.5 p-0">
                  {g.mekanlar.map((m) => (
                    <MekanSatiri key={m.id} m={m} onHover={onHoverMekan} onLeave={onLeaveMekan} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <section>
            {liste?.filtreEtiketi && (
              <div className="mb-1.5 px-3 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                {liste.baslik} · {liste.filtreEtiketi} ({liste.filtreliToplam})
              </div>
            )}
            <ul className="m-0 list-none space-y-0.5 p-0">
              {(liste?.mekanlar || []).map((m) => (
                <MekanSatiri key={m.id} m={m} onHover={onHoverMekan} onLeave={onLeaveMekan} />
              ))}
            </ul>
          </section>
        )}

        {/* Yürüyüş rotaları */}
        {liste?.rotalar?.length > 0 && (
          <section className="mt-5 border-t border-hairline px-2 pt-4">
            <div className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Yürüyüş rotaları
            </div>
            <div className="grid gap-1.5">
              {liste.rotalar.map((r) => (
                <Link
                  key={r.id}
                  to={`/rota/${r.id}`}
                  className="group flex items-center justify-between gap-2 rounded-[12px] bg-surface-raised px-3 py-2.5 text-ink no-underline transition-colors hover:bg-accent-soft hover:text-ink"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[13.5px] font-bold text-heading">
                      {r.ad}
                    </span>
                    <span className="block text-[12px] text-ink-muted">
                      {r.durakSayisi} durak{r.tur ? ` · ${ROTA_TUR[r.tur] || r.tur}` : ''}
                    </span>
                  </span>
                  <Simge
                    ad="arrow_forward"
                    boyut={17}
                    className="shrink-0 text-accent transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Alt ilçeler veya mahalleler */}
        {liste?.altBolgeler?.length > 0 && (
          <nav aria-label="Alt bölgeler" className="mt-5 border-t border-hairline px-3 pt-4">
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              {liste.seviye === 'ilce' || liste.seviye === 'mahalle' ? 'Mahalleler' : 'İlçeler'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {liste.altBolgeler.map((b) => {
                const secili = liste.mahalle === b.slug;
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() =>
                      liste.seviye === 'ilce' || liste.seviye === 'mahalle'
                        ? onSelectMahalle(b.ilce, b.slug)
                        : onSelectIlce(b.slug, b.yaka)
                    }
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition-colors ${
                      secili
                        ? 'bg-accent font-semibold text-white'
                        : 'bg-heading/[.06] font-medium text-ink hover:bg-accent-soft hover:text-heading'
                    }`}
                  >
                    <span>{b.ad}</span>
                    <span className="opacity-65">{b.n}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </aside>
  );
}
