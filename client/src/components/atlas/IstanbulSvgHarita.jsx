import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Simge from '../common/Simge.jsx';

const mahalleCache = new Map();
let ilcelerPromise = null;

function loadIlceler() {
  if (!ilcelerPromise) {
    ilcelerPromise = fetch('/geo/istanbul-ilceler.json').then((r) => {
      if (!r.ok) throw new Error('İlçe haritası yüklenemedi');
      return r.json();
    });
  }
  return ilcelerPromise;
}

function loadMahalleler(ilceSlug) {
  if (!ilceSlug) return Promise.resolve(null);
  if (mahalleCache.has(ilceSlug)) return Promise.resolve(mahalleCache.get(ilceSlug));
  return fetch(`/geo/mahalle/${ilceSlug}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d) mahalleCache.set(ilceSlug, d);
      return d;
    })
    .catch(() => null);
}

/** Hedef kutuyu görünür harita alanına (sağ panel veya mobil alt çekmece hariç) ortalar. */
function computeViewBox(bbox, stageW, stageH) {
  if (!bbox || !stageW || !stageH) return [0, 0, 1200, 750];
  const [bx, by, bw, bh] = bbox;
  const mobile = stageW <= 900;
  const panelW = mobile ? 0 : stageW <= 1180 ? 464 : 526;
  const padLeft = mobile ? 14 : 28;
  const padRight = mobile ? 14 : panelW + 24;
  const padTop = mobile ? 104 : 92;
  const padBottom = mobile ? stageH * 0.54 : 68;

  const availW = Math.max(120, stageW - padLeft - padRight);
  const availH = Math.max(120, stageH - padTop - padBottom);

  const scale = Math.min(availW / Math.max(bw, 1), availH / Math.max(bh, 1)) * 0.92;
  const vbW = stageW / scale;
  const vbH = stageH / scale;

  const visCenterX = padLeft + availW / 2;
  const visCenterY = padTop + availH / 2;
  const boxCenterX = bx + bw / 2;
  const boxCenterY = by + bh / 2;

  const vbX = boxCenterX - (visCenterX / stageW) * vbW;
  const vbY = boxCenterY - (visCenterY / stageH) * vbH;
  return [vbX, vbY, vbW, vbH];
}

/** Çakışmayan etiketleri ekran piksel kutularına göre seçer. */
function filterLabels(items, vb, stageW, stageH, maxCount = 26, occupied = []) {
  if (!vb || !stageW || !stageH) return [];
  const [vx, vy, vw, vh] = vb;
  const pxPerUnitX = stageW / vw;
  const pxPerUnitY = stageH / vh;
  const mobile = stageW <= 900;
  const panelLeft = mobile ? stageW : stageW - (stageW <= 1180 ? 456 : 518);
  const maxY = mobile ? stageH * 0.47 : stageH - 46;

  const placed = [...occupied];
  const out = [];
  for (const item of items) {
    if (out.length >= maxCount) break;
    const sx = (item.x - vx) * pxPerUnitX;
    const sy = (item.y - vy) * pxPerUnitY;
    if (sx < 24 || sx > panelLeft - 24 || sy < 56 || sy > maxY) continue;

    const w = Math.max(46, (item.ad || '').length * 6.5 + 16);
    const h = item.sub ? 26 : 18;
    const rect = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];

    const hits = placed.some(
      (r) => !(rect[2] < r[0] || rect[0] > r[2] || rect[3] < r[1] || rect[1] > r[3]),
    );
    if (!hits) {
      placed.push(rect);
      out.push(item);
    }
  }
  return out;
}

/** İki nokta arasında hafif asma köprü kavisli SVG eğrisi üretir. */
function bridgeArcPath(p1, p2, lift) {
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy) || 1;
  // Kuzeye/yukarıya doğru nazik yay
  const nx = -dy / len;
  const ny = dx / len;
  const sign = ny <= 0 ? 1 : -1;
  const cx = mx + nx * lift * sign;
  const cy = my + ny * lift * sign;
  return `M${p1[0]} ${p1[1]} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p2[0]} ${p2[1]}`;
}

export default function IstanbulSvgHarita({
  ozet,
  yaka,
  ilce,
  mahalle,
  perspektif = 'bogaz',
  vurguluIlce,
  vurguluMahalle,
  vurguluMekanId,
  onChangePerspektif,
  onSelectYaka,
  onSelectIlce,
  onSelectMahalle,
}) {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const vbCurRef = useRef(null);
  const animRef = useRef(null);

  const [geo, setGeo] = useState(null);
  const [mahData, setMahData] = useState(null);
  const [size, setSize] = useState({ w: 1200, h: 760 });
  const [vb, setVb] = useState([0, 0, 1200, 760]);
  const [flying, setFlying] = useState(false);
  const [tip, setTip] = useState(null);
  const [hoverBridge, setHoverBridge] = useState(null);
  const [showBridges, setShowBridges] = useState(true);
  const [showSights, setShowSights] = useState(true);

  useEffect(() => {
    let alive = true;
    loadIlceler().then((d) => alive && setGeo(d)).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!ilce) {
      setMahData(null);
      return undefined;
    }
    loadMahalleler(ilce).then((d) => {
      if (alive) setMahData(d);
    });
    return () => { alive = false; };
  }, [ilce]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Aktif seviyenin hedef viewBox'u (Boğaz perspektifi vs 39 ilçe vs yaka vs ilçe)
  const targetVb = useMemo(() => {
    if (!geo) return [0, 0, 1200, 750];
    let bbox = perspektif === 'bogaz' && ozet?.bogazOdak ? ozet.bogazOdak : geo.bbox;
    if (ilce) {
      const f = geo.ilceler.find((x) => x.slug === ilce);
      if (f) bbox = f.bbox;
    } else if (yaka && geo.yakalar[yaka]) {
      bbox = geo.yakalar[yaka].bbox;
    }
    return computeViewBox(bbox, size.w, size.h);
  }, [geo, ozet?.bogazOdak, perspektif, yaka, ilce, size.w, size.h]);

  // Yumuşak viewBox flyTo animasyonu
  useEffect(() => {
    if (!geo) return undefined;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!vbCurRef.current || reduced) {
      vbCurRef.current = targetVb;
      setVb(targetVb);
      setFlying(false);
      return undefined;
    }

    const from = vbCurRef.current;
    const to = targetVb;
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2], to[3] - from[3]);
    if (dist < 0.5) {
      vbCurRef.current = to;
      setVb(to);
      setFlying(false);
      return undefined;
    }

    setFlying(true);
    setTip(null);
    const t0 = performance.now();
    const dur = 480;

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - p) ** 3;
      const cur = [
        from[0] + (to[0] - from[0]) * e,
        from[1] + (to[1] - from[1]) * e,
        from[2] + (to[2] - from[2]) * e,
        from[3] + (to[3] - from[3]) * e,
      ];
      vbCurRef.current = cur;
      setVb(cur);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setFlying(false);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => animRef.current && cancelAnimationFrame(animRef.current);
  }, [geo, targetVb]);

  const turBilgi = ozet?.turler || {};
  const hueOf = useCallback((tur) => turBilgi[tur]?.hue ?? 24, [turBilgi]);
  const turAdOf = useCallback((tur) => turBilgi[tur]?.ad || tur, [turBilgi]);

  const unitPerPx = size.w > 0 ? vb[2] / size.w : 1;
  const yakinMi = vb[2] < 460; // Boğaz odağı veya ilçe yakınlaşması

  // Görünen simgeler (Best Sights)
  const visibleSights = useMemo(() => {
    const all = ozet?.simgeler || [];
    if (!showSights || !all.length) return [];
    let filtered = all;
    if (ilce) {
      filtered = all.filter((s) => s.ilce === ilce);
    } else if (yaka) {
      const yakaIlceleri = new Set(
        Object.entries(ozet?.ilceler || {})
          .filter(([, v]) => v.yaka === yaka)
          .map(([k]) => k),
      );
      filtered = all.filter((s) => yakaIlceleri.has(s.ilce));
    } else if (perspektif === 'il') {
      filtered = all.filter((s) => s.oncelik === 1);
    }
    return filtered;
  }, [ozet, showSights, ilce, yaka, perspektif]);

  // Çakışmayan simge etiketleri (pinler hep görünür, isimleri temiz yerleşir)
  const labeledSightIds = useMemo(() => {
    if (!visibleSights.length) return new Set();
    const candidates = [...visibleSights]
      .sort((a, b) => a.oncelik - b.oncelik || Number(b.id === vurguluMekanId) - Number(a.id === vurguluMekanId))
      .map((s) => ({ id: s.id, ad: s.kisaAd, x: s.x, y: s.y - 10 * unitPerPx }));
    const chosen = filterLabels(candidates, targetVb, size.w, size.h, ilce ? 14 : 10);
    return new Set(chosen.map((c) => c.id));
  }, [visibleSights, vurguluMekanId, targetVb, size.w, size.h, unitPerPx, ilce]);

  // İlçe etiketleri
  const ilceLabels = useMemo(() => {
    if (!geo || ilce) return [];
    const list = geo.ilceler
      .filter((d) => !yaka || d.yaka === yaka)
      .map((d) => {
        const st = ozet?.ilceler?.[d.slug];
        const n = st?.n || 0;
        const dom = st?.dom?.[0] || null;
        return {
          slug: d.slug,
          ad: d.ad,
          x: d.label[0],
          y: d.label[1],
          n,
          area: d.area,
          sub: n > 0 && dom ? turAdOf(dom).toLocaleUpperCase('tr-TR') : null,
          hue: dom ? hueOf(dom) : 24,
        };
      })
      .sort((a, b) => (b.n > 0) - (a.n > 0) || b.n - a.n || b.area - a.area);
    return filterLabels(list, targetVb, size.w, size.h, yaka ? 22 : perspektif === 'bogaz' ? 16 : 20);
  }, [geo, ilce, yaka, ozet, targetVb, size.w, size.h, hueOf, turAdOf, perspektif]);

  // Mahalle etiketleri
  const mahLabels = useMemo(() => {
    if (!ilce || !mahData?.mahalleler?.length) return [];
    const ilceSt = ozet?.ilceler?.[ilce]?.mahalleler || {};
    const list = mahData.mahalleler
      .map((m) => {
        const st = ilceSt[m.slug];
        const n = st?.n || 0;
        const dom = st?.dom?.[0] || null;
        return {
          slug: m.slug,
          ad: m.ad,
          x: m.label[0],
          y: m.label[1],
          n,
          area: m.area,
          sel: m.slug === mahalle,
          sub: n > 0 && dom ? turAdOf(dom).toLocaleUpperCase('tr-TR') : null,
          hue: dom ? hueOf(dom) : 24,
        };
      })
      .sort((a, b) => Number(b.sel) - Number(a.sel) || b.n - a.n || b.area - a.area);
    return filterLabels(list, targetVb, size.w, size.h, 22);
  }, [ilce, mahData, ozet, mahalle, targetVb, size.w, size.h, hueOf, turAdOf]);

  // Köprüler: uzak görünümde Boğaz köprüleri + Avrasya, yakınlaşmada Haliç köprüleri de eklenir
  const visibleBridges = useMemo(() => {
    const all = ozet?.kopruler || [];
    if (!showBridges || !all.length) return [];
    return all.filter((k) => k.tip === 'bogaz' || k.tip === 'tunel' || yakinMi || ilce === 'fatih' || ilce === 'beyoglu');
  }, [ozet?.kopruler, showBridges, yakinMi, ilce]);

  const activeIlcePath = useMemo(
    () => (geo && ilce ? geo.ilceler.find((x) => x.slug === ilce)?.d : null),
    [geo, ilce],
  );

  const hoverBridgeIlceler = useMemo(() => {
    if (!hoverBridge) return null;
    const b = ozet?.kopruler?.find((k) => k.id === hoverBridge);
    return b ? new Set(b.ilceler) : null;
  }, [hoverBridge, ozet?.kopruler]);

  const onMove = (e, info) => {
    if (flying) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      ...info,
    });
  };

  const clearTip = () => {
    setTip(null);
    setHoverBridge(null);
  };

  const su = ozet?.suYollari;

  return (
    <div ref={wrapRef} className="relative h-full w-full" onMouseLeave={clearTip}>
      {!geo ? (
        <div className="grid h-full w-full place-items-center text-sm" style={{ color: 'var(--a-paper-muted)' }}>
          İstanbul Boğazı ve harita yükleniyor…
        </div>
      ) : (
        <svg
          ref={svgRef}
          className={`atlas-svg ${flying ? 'fly' : ''}`}
          viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`}
          role="img"
          aria-label="İstanbul Boğazı, köprüler, simge yapılar ve ilçe haritası"
        >
          <defs>
            <linearGradient id="atlasSelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--a-sel-a)" />
              <stop offset="100%" stopColor="var(--a-sel-b)" />
            </linearGradient>
            {/* Kara parçalarına hafif kabartma gölgesi: Boğaz ve Haliç suyu derinlik kazanır */}
            <filter id="atlasLandDepth" x="-4%" y="-4%" width="108%" height="108%">
              <feDropShadow dx="0" dy="1.4" stdDeviation="2.2" floodColor="#040b14" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* 0. Katman: Boğaz akışı, Haliç, vapur hatları ve deniz isimleri */}
          {su && (
            <g aria-hidden="true">
              <path d={su.bogazAkis} className="atlas-water-flow" />
              <path d={su.halicAkis} className="atlas-water-flow" />
              {showBridges &&
                su.vapurHatlari?.map((v) => (
                  <path key={v.id} d={v.d} className="atlas-ferry" />
                ))}
              {!ilce &&
                su.etiketler?.map((e) => {
                  if (e.id === 'halic' && !yakinMi) return null;
                  return (
                    <text
                      key={e.id}
                      x={e.pos[0]}
                      y={e.pos[1]}
                      transform={e.aci ? `rotate(${e.aci} ${e.pos[0]} ${e.pos[1]})` : undefined}
                      className="atlas-sea-label"
                      style={{ fontSize: `${e.boyut * unitPerPx}px` }}
                    >
                      {e.ad}
                    </text>
                  );
                })}
            </g>
          )}

          {/* 1. Katman: 39 İstanbul ilçesi (kabartma gölgesiyle) */}
          <g className="atlas-land-group" aria-label="İstanbul ilçeleri">
            {geo.ilceler.map((d) => {
              const st = ozet?.ilceler?.[d.slug];
              const n = st?.n || 0;
              const dom = st?.dom || [];
              const isOpen = ilce === d.slug;
              const isDimmed = (yaka && !ilce && d.yaka !== yaka) || (ilce && !isOpen);
              const isHovered = vurguluIlce === d.slug || hoverBridgeIlceler?.has(d.slug);

              return (
                <path
                  key={d.slug}
                  d={d.d}
                  tabIndex={isDimmed ? -1 : 0}
                  role="button"
                  aria-label={`${d.ad}${n > 0 ? `, ${n} mekan` : ''}`}
                  style={n > 0 && dom[0] ? { '--h': hueOf(dom[0]) } : undefined}
                  className={[
                    'atlas-poly',
                    n > 0 ? 'has-data' : '',
                    isDimmed ? 'dimmed' : '',
                    isOpen ? 'open-ilce' : '',
                    isHovered ? 'hovered' : '',
                  ].join(' ')}
                  onMouseEnter={() => loadMahalleler(d.slug)}
                  onMouseMove={(e) =>
                    onMove(e, {
                      tip: 'bolge',
                      baslik: d.ad,
                      ust: d.yaka === 'avrupa' ? 'Avrupa Yakası' : 'Anadolu Yakası',
                      n,
                      dom: dom.map(turAdOf),
                    })
                  }
                  onMouseLeave={() => setTip(null)}
                  onClick={() => {
                    if (isOpen) return;
                    onSelectIlce(d.slug, d.yaka);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectIlce(d.slug, d.yaka);
                    }
                  }}
                />
              );
            })}
          </g>

          {/* 2. Katman: Seçili ilçenin mahalleleri */}
          {ilce && mahData?.ilce === ilce && (
            <g className="atlas-hoods-layer" aria-label={`${mahData.ad} mahalleleri`}>
              {mahData.mahalleler.map((m) => {
                const st = ozet?.ilceler?.[ilce]?.mahalleler?.[m.slug];
                const n = st?.n || 0;
                const dom = st?.dom || [];
                const isSel = mahalle === m.slug;
                const isHov = vurguluMahalle === m.slug;

                return (
                  <path
                    key={m.slug}
                    d={m.d}
                    tabIndex={0}
                    role="button"
                    aria-label={`${m.ad} Mahallesi${n > 0 ? `, ${n} mekan` : ''}`}
                    style={n > 0 && dom[0] ? { '--h': hueOf(dom[0]) } : undefined}
                    className={[
                      'atlas-poly',
                      n > 0 ? 'has-data' : '',
                      isSel ? 'selected' : '',
                      isHov ? 'hovered' : '',
                    ].join(' ')}
                    onMouseMove={(e) =>
                      onMove(e, {
                        tip: 'bolge',
                        baslik: m.ad,
                        ust: mahData.ad,
                        n,
                        dom: dom.map(turAdOf),
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                    onClick={() => onSelectMahalle(ilce, isSel ? null : m.slug)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectMahalle(ilce, isSel ? null : m.slug);
                      }
                    }}
                  />
                );
              })}
            </g>
          )}

          {/* 3. Katman: Aktif ilçe vurgulu dış sınırı */}
          {activeIlcePath && <path d={activeIlcePath} className="atlas-outline" />}

          {/* 4. Katman: İstanbul Köprüleri ve Avrasya Tüneli */}
          {visibleBridges.length > 0 && (
            <g aria-label="İstanbul köprüleri ve Boğaz geçişleri">
              {visibleBridges.map((k) => {
                const isTunnel = k.tip === 'tunel';
                const isBogaz = k.tip === 'bogaz';
                const lift = isBogaz ? 3.5 * unitPerPx : isTunnel ? 2.5 * unitPerPx : 1.4 * unitPerPx;
                const dPath = bridgeArcPath(k.p1, k.p2, lift);
                const active = hoverBridge === k.id;
                const showName = active || (isBogaz && (yakinMi || perspektif === 'bogaz') && !ilce);

                return (
                  <g
                    key={k.id}
                    className={`atlas-bridge-group ${active ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${k.ad} (${k.baglanti})`}
                    onMouseEnter={() => setHoverBridge(k.id)}
                    onMouseMove={(e) =>
                      onMove(e, {
                        tip: 'kopru',
                        baslik: k.ad,
                        ust: isTunnel ? `Deniz altı geçiş · ${k.yil}` : isBogaz ? `Boğaz Köprüsü · ${k.yil}` : `Haliç Köprüsü · ${k.yil}`,
                        baglanti: k.baglanti,
                        uzunluk: k.uzunluk,
                      })
                    }
                    onMouseLeave={() => {
                      setHoverBridge(null);
                      setTip(null);
                    }}
                    onClick={() => {
                      if (k.ilceler?.[0]) onSelectIlce(k.ilceler[0]);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && k.ilceler?.[0]) {
                        e.preventDefault();
                        onSelectIlce(k.ilceler[0]);
                      }
                    }}
                  >
                    <path d={dPath} className="atlas-bridge-hit" />
                    {isTunnel ? (
                      <path d={dPath} className="atlas-tunnel-line" />
                    ) : (
                      <>
                        <path d={dPath} className="atlas-bridge-glow" />
                        <path d={dPath} className="atlas-bridge-line" />
                        {/* Asma köprü kule ayakları */}
                        <circle
                          cx={k.p1[0] + (k.p2[0] - k.p1[0]) * 0.22}
                          cy={k.p1[1] + (k.p2[1] - k.p1[1]) * 0.22}
                          r={Math.max(1.5, (isBogaz ? 2.6 : 1.8) * unitPerPx)}
                          fill="var(--a-bridge)"
                          stroke="var(--a-sight-ring)"
                          strokeWidth={1.1 * unitPerPx}
                          style={{ pointerEvents: 'none' }}
                        />
                        <circle
                          cx={k.p1[0] + (k.p2[0] - k.p1[0]) * 0.78}
                          cy={k.p1[1] + (k.p2[1] - k.p1[1]) * 0.78}
                          r={Math.max(1.5, (isBogaz ? 2.6 : 1.8) * unitPerPx)}
                          fill="var(--a-bridge)"
                          stroke="var(--a-sight-ring)"
                          strokeWidth={1.1 * unitPerPx}
                          style={{ pointerEvents: 'none' }}
                        />
                      </>
                    )}
                    {showName && (
                      <text
                        x={k.mid[0] + 10 * unitPerPx}
                        y={k.mid[1] - 7 * unitPerPx}
                        className="atlas-label"
                        style={{
                          textAnchor: 'start',
                          fontSize: `${9.2 * unitPerPx}px`,
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          fill: isTunnel ? 'var(--a-tunnel)' : 'var(--a-bridge)',
                          strokeWidth: `${2.8 * unitPerPx}px`,
                        }}
                      >
                        {k.kisaAd}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 5. Katman: Yaka başlıkları (yalnızca Tüm İl görünümünde) */}
          {!yaka && !ilce && perspektif === 'il' && (
            <g aria-hidden="true">
              {['avrupa', 'anadolu'].map((yk) => {
                const yGeo = geo.yakalar[yk];
                const ySt = ozet?.yakalar?.[yk];
                if (!yGeo) return null;
                return (
                  <text
                    key={yk}
                    x={yGeo.label[0]}
                    y={yGeo.label[1] - 42 * unitPerPx}
                    className="atlas-label atlas-label-side"
                    style={{
                      fontSize: `${18 * unitPerPx}px`,
                      strokeWidth: `${4 * unitPerPx}px`,
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectYaka(yk)}
                  >
                    {yGeo.ad}
                    {ySt?.n > 0 && (
                      <tspan
                        x={yGeo.label[0]}
                        dy={15 * unitPerPx}
                        className="atlas-label-sub"
                        style={{
                          fontSize: `${9 * unitPerPx}px`,
                          strokeWidth: `${2.5 * unitPerPx}px`,
                          '--h': hueOf(ySt.dom?.[0]),
                        }}
                      >
                        {ySt.n} MEKAN
                      </tspan>
                    )}
                  </text>
                );
              })}
            </g>
          )}

          {/* 6. Katman: İlçe etiketleri */}
          {!ilce && (
            <g aria-hidden="true">
              {ilceLabels.map((l) => (
                <text
                  key={l.slug}
                  x={l.x}
                  y={l.y}
                  className="atlas-label"
                  style={{
                    fontSize: `${(l.n > 0 ? 11 : 9.2) * unitPerPx}px`,
                    fontWeight: l.n > 0 ? 600 : 500,
                    opacity: l.n > 0 ? (showSights && perspektif === 'bogaz' ? 0.72 : 0.94) : 0.45,
                    strokeWidth: `${3.2 * unitPerPx}px`,
                  }}
                >
                  <tspan x={l.x}>{l.ad}</tspan>
                  {l.sub && !(showSights && perspektif === 'bogaz') && (
                    <tspan
                      x={l.x}
                      dy={11 * unitPerPx}
                      className="atlas-label-sub"
                      style={{
                        fontSize: `${7.6 * unitPerPx}px`,
                        strokeWidth: `${2.4 * unitPerPx}px`,
                        '--h': l.hue,
                      }}
                    >
                      {l.sub}
                    </tspan>
                  )}
                </text>
              ))}
            </g>
          )}

          {/* 7. Katman: Mahalle etiketleri */}
          {ilce && (
            <g aria-hidden="true">
              {mahLabels.map((l) => (
                <text
                  key={l.slug}
                  x={l.x}
                  y={l.y}
                  className={`atlas-label ${l.sel ? 'is-sel' : ''}`}
                  style={{
                    fontSize: `${(l.n > 0 || l.sel ? 11.2 : 9.2) * unitPerPx}px`,
                    fontWeight: l.n > 0 || l.sel ? 700 : 500,
                    opacity: l.n > 0 || l.sel ? 0.95 : 0.56,
                    strokeWidth: `${3 * unitPerPx}px`,
                  }}
                >
                  <tspan x={l.x}>{l.ad}</tspan>
                  {l.sub && !l.sel && (
                    <tspan
                      x={l.x}
                      dy={10.5 * unitPerPx}
                      className="atlas-label-sub"
                      style={{
                        fontSize: `${7.4 * unitPerPx}px`,
                        strokeWidth: `${2.2 * unitPerPx}px`,
                        '--h': l.hue,
                      }}
                    >
                      {l.sub}
                    </tspan>
                  )}
                </text>
              ))}
            </g>
          )}

          {/* 8. Katman: Öne Çıkan İstanbul Simgeleri (Best Sights) */}
          {visibleSights.length > 0 && (
            <g aria-label="İstanbul'un öne çıkan simge yapıları">
              {visibleSights.map((s) => {
                const isActive = vurguluMekanId === s.id;
                const r = (isActive ? 5.6 : s.oncelik === 1 ? 4.4 : 3.4) * unitPerPx;
                const showLbl = isActive || labeledSightIds.has(s.id);

                return (
                  <g
                    key={s.id}
                    className={`atlas-sight ${isActive ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${s.ad} — ${s.ilceAd}`}
                    onMouseMove={(e) =>
                      onMove(e, {
                        tip: 'simge',
                        baslik: s.ad,
                        ust: s.mahalleAd ? `${s.ilceAd} · ${s.mahalleAd}` : s.ilceAd,
                        turAd: s.turAd,
                        kisa: s.kisa,
                        gorsel: s.gorsel,
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                    onClick={() => navigate(`/mekan/${s.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/mekan/${s.id}`);
                      }
                    }}
                  >
                    <circle cx={s.x} cy={s.y} r={r * 2.4} className="atlas-sight-halo" />
                    <circle cx={s.x} cy={s.y} r={r} className="atlas-sight-dot" />
                    {showLbl && (
                      <text
                        x={s.x}
                        y={s.y - r - 5 * unitPerPx}
                        className="atlas-sight-label"
                        style={{
                          textAnchor: 'middle',
                          fontSize: `${(isActive ? 11.5 : 10.2) * unitPerPx}px`,
                          strokeWidth: `${3.2 * unitPerPx}px`,
                        }}
                      >
                        {s.kisaAd}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      )}

      {/* Harita perspektif ve katman kontrol çubuğu */}
      <div
        className="atlas-chrome absolute left-4 top-[62px] z-20 inline-flex items-center gap-0.5 rounded-full p-1 max-[900px]:hidden"
        role="toolbar"
        aria-label="Harita perspektifi ve katmanlar"
      >
        <button
          type="button"
          aria-pressed={!yaka && !ilce && perspektif === 'bogaz'}
          onClick={() => onChangePerspektif?.('bogaz')}
          className={`atlas-hud-btn ${!yaka && !ilce && perspektif === 'bogaz' ? 'active' : ''}`}
          title="Boğaz, Haliç ve Tarihi Yarımada perspektifi"
        >
          <Simge ad="sailing" boyut={15} /> Boğaz
        </button>
        <button
          type="button"
          aria-pressed={!yaka && !ilce && perspektif === 'il'}
          onClick={() => onChangePerspektif?.('il')}
          className={`atlas-hud-btn ${!yaka && !ilce && perspektif === 'il' ? 'active' : ''}`}
          title="39 ilçenin tamamı"
        >
          <Simge ad="map" boyut={15} /> 39 İlçe
        </button>
        <span className="mx-1 h-4 w-px opacity-25" style={{ background: 'var(--a-paper-ink)' }} aria-hidden="true" />
        <button
          type="button"
          aria-pressed={showBridges}
          onClick={() => setShowBridges((v) => !v)}
          className={`atlas-hud-btn ${showBridges ? 'active' : 'opacity-70'}`}
          title="Boğaz ve Haliç köprüleri ile vapur hatları"
        >
          <Simge ad="conversion_path" boyut={15} /> Köprüler
        </button>
        <button
          type="button"
          aria-pressed={showSights}
          onClick={() => setShowSights((v) => !v)}
          className={`atlas-hud-btn ${showSights ? 'active' : 'opacity-70'}`}
          title="İstanbul'un öne çıkan simge yapıları"
        >
          <Simge ad="star" boyut={15} /> Simgeler
        </button>
      </div>

      {/* İmleci izleyen cam bilgi kartı (bölge, köprü veya fotoğraflı simge önizlemesi) */}
      {tip && !flying && (
        <div
          className="atlas-chrome pointer-events-none absolute z-30 overflow-hidden rounded-xl text-left"
          style={{
            width: tip.tip === 'simge' && tip.gorsel ? 250 : 'auto',
            maxWidth: 260,
            left: Math.min(tip.x + 16, size.w - 270),
            top: Math.max(12, Math.min(tip.y - 16, size.h - (tip.gorsel ? 210 : 120))),
          }}
        >
          {tip.tip === 'simge' && tip.gorsel && (
            <div className="relative h-24 w-full overflow-hidden bg-black/20">
              <img src={tip.gorsel} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="px-3.5 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--a-paper-muted)' }}>
              {tip.ust}
            </div>
            <div className="atlas-serif text-[15.5px] font-semibold leading-tight" style={{ color: 'var(--a-paper-ink)' }}>
              {tip.baslik}
            </div>

            {tip.tip === 'kopru' && (
              <div className="mt-1 space-y-0.5 text-[12px]" style={{ color: 'var(--a-accent)' }}>
                <div className="font-semibold">{tip.baglanti}</div>
                <div style={{ color: 'var(--a-paper-muted)' }}>Uzunluk: {tip.uzunluk}</div>
              </div>
            )}

            {tip.tip === 'simge' && (
              <>
                <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: 'var(--a-accent)' }}>
                  ★ {tip.turAd} · Detay için tıkla
                </div>
                {tip.kisa && (
                  <p className="m-0 mt-1 line-clamp-2 text-[11.5px] leading-snug" style={{ color: 'var(--a-paper-muted)' }}>
                    {tip.kisa}
                  </p>
                )}
              </>
            )}

            {tip.tip === 'bolge' && (
              <>
                <div className="mt-0.5 text-[12px]" style={{ color: tip.n > 0 ? 'var(--a-accent)' : 'var(--a-paper-faint)' }}>
                  {tip.n > 0 ? `${tip.n} mekan` : 'Henüz kayıt yok'}
                </div>
                {tip.dom?.length > 0 && (
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--a-paper-muted)' }}>
                    {tip.dom.join(' · ')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
