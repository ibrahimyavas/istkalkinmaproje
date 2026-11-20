import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import Simge from '../common/Simge.jsx';

function normTr(s) {
  return String(s || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .trim();
}

export default function AtlasArama({ ozet, onSelectYaka, onSelectIlce, onSelectMahalle, onSelectTur }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const boxRef = useRef(null);

  const [q, setQ] = useState('');
  const [acik, setAcik] = useState(false);
  const [mekanlar, setMekanlar] = useState([]);
  const [araniyor, setAraniyor] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
        setAcik(true);
      } else if (e.key === 'Escape') {
        setAcik(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAcik(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const yerel = useMemo(() => {
    const s = normTr(q);
    if (!s || !ozet) return { turler: [], bolgeler: [] };

    const turler = Object.entries(ozet.turler || {})
      .filter(([, v]) => normTr(v.ad).includes(s) || normTr(v.cogul).includes(s))
      .map(([id, v]) => ({ id, ad: v.ad }))
      .slice(0, 4);

    const bolgeler = [];
    for (const [yk, yv] of Object.entries(ozet.yakalar || {})) {
      if (normTr(yv.ad).includes(s)) {
        bolgeler.push({ tip: 'yaka', slug: yk, ad: yv.ad, alt: `${yv.n} mekan`, n: yv.n });
      }
    }
    for (const [islug, iv] of Object.entries(ozet.ilceler || {})) {
      if (normTr(iv.ad).includes(s)) {
        bolgeler.push({
          tip: 'ilce',
          slug: islug,
          yaka: iv.yaka,
          ad: iv.ad,
          alt: iv.n > 0 ? `${iv.n} mekan` : 'İlçe',
          n: iv.n,
        });
      }
      for (const [mslug, mv] of Object.entries(iv.mahalleler || {})) {
        if (normTr(mv.ad).includes(s)) {
          bolgeler.push({
            tip: 'mahalle',
            slug: mslug,
            ilce: islug,
            ad: mv.ad,
            alt: `${iv.ad} · ${mv.n} mekan`,
            n: mv.n,
          });
        }
      }
    }
    bolgeler.sort((a, b) => (b.n > 0) - (a.n > 0) || b.n - a.n || a.ad.localeCompare(b.ad, 'tr'));
    return { turler, bolgeler: bolgeler.slice(0, 6) };
  }, [q, ozet]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setMekanlar([]);
      setAraniyor(false);
      return undefined;
    }
    let alive = true;
    setAraniyor(true);
    const t = setTimeout(() => {
      api
        .atlasAra(trimmed)
        .then((res) => alive && setMekanlar(Array.isArray(res) ? res : []))
        .catch(() => alive && setMekanlar([]))
        .finally(() => alive && setAraniyor(false));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const temizleVeKapat = () => {
    setQ('');
    setAcik(false);
  };

  const sonucVar = yerel.turler.length > 0 || yerel.bolgeler.length > 0 || mekanlar.length > 0;

  return (
    <div ref={boxRef} className="absolute left-3 top-3 z-30 w-[min(320px,calc(100%-24px))]">
      <div className="atlas-chrome flex items-center gap-2 rounded-full px-3.5 py-2">
        <Simge ad="search" boyut={18} className="shrink-0 text-ink-faint" />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onFocus={() => setAcik(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setAcik(true);
          }}
          placeholder="Mekan, ilçe, mahalle veya zanaat ara"
          aria-label="Mekan, ilçe, mahalle veya zanaat ara"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="Aramayı temizle"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted hover:bg-heading/[.07] hover:text-heading"
          >
            <Simge ad="close" boyut={16} />
          </button>
        ) : (
          <kbd className="hidden rounded border border-hairline px-1.5 py-0.5 font-mono text-[11px] text-ink-faint sm:inline-block">
            /
          </kbd>
        )}
      </div>

      {acik && q.trim().length > 0 && (
        <div
          className="atlas-chrome atlas-scroll mt-2 max-h-[360px] rounded-[16px] p-2"
          role="listbox"
          aria-label="Arama sonuçları"
        >
          {yerel.turler.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Türler
              </div>
              {yerel.turler.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectTur(t.id);
                    temizleVeKapat();
                  }}
                  className="flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent-soft"
                >
                  <span className="font-semibold text-heading">{t.ad}</span>
                  <span className="text-[11.5px] text-ink-muted">İstanbul</span>
                </button>
              ))}
            </div>
          )}

          {yerel.bolgeler.length > 0 && (
            <div className="mb-2">
              <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Bölgeler
              </div>
              {yerel.bolgeler.map((b) => (
                <button
                  key={`${b.tip}-${b.ilce || ''}-${b.slug}`}
                  type="button"
                  onClick={() => {
                    if (b.tip === 'yaka') onSelectYaka(b.slug);
                    else if (b.tip === 'ilce') onSelectIlce(b.slug, b.yaka);
                    else onSelectMahalle(b.ilce, b.slug);
                    temizleVeKapat();
                  }}
                  className="flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent-soft"
                >
                  <span className="font-semibold text-heading">{b.ad}</span>
                  <span className="text-[11.5px] text-ink-muted">{b.alt}</span>
                </button>
              ))}
            </div>
          )}

          {mekanlar.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                Mekanlar
              </div>
              {mekanlar.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    temizleVeKapat();
                    navigate(m.href);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-accent-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[13.5px] font-bold text-heading">
                      {m.ad}
                    </span>
                    <span className="block truncate text-[11.5px] text-ink-muted">{m.konum}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] font-semibold text-accent">{m.turAd}</span>
                </button>
              ))}
            </div>
          )}

          {!sonucVar && (
            <div className="px-3 py-4 text-center text-[12.5px] text-ink-muted">
              {araniyor ? 'Aranıyor…' : 'Eşleşen bölge veya mekan bulunamadı.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
