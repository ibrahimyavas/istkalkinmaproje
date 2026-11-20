import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HARITA_STILI, HARITA_YAZI_TIPI } from '../../lib/harita.js';
import Simge from '../common/Simge.jsx';
import IstanbulSvgHarita from './IstanbulSvgHarita.jsx';

const TUR_RENK = {
  muze: '#174C9E',
  miras: '#C84B26',
  atolye: '#D94826',
  carsi: '#B45309',
  edebiyat: '#6D28D9',
  film: '#BE185D',
  sahne: '#0F766E',
  mekan: '#1B8755',
};

const EMPTY_FC = { type: 'FeatureCollection', features: [] };
const ISTANBUL_BOUNDS = [
  [27.97, 40.81],
  [29.92, 41.58],
];
const EASE_OUT = (t) => 1 - (1 - t) ** 3;

const osmMahCache = new Map();
let osmIlcePromise = null;

function loadOsmIlceler() {
  if (!osmIlcePromise) {
    osmIlcePromise = fetch('/geo/osm/istanbul-ilceler.geojson').then((r) => {
      if (!r.ok) throw new Error('OSM ilçe sınırları yüklenemedi');
      return r.json();
    });
  }
  return osmIlcePromise;
}

function loadOsmMahalleler(ilceSlug) {
  if (!ilceSlug) return Promise.resolve(null);
  if (osmMahCache.has(ilceSlug)) return Promise.resolve(osmMahCache.get(ilceSlug));
  return fetch(`/geo/osm/mahalle/${ilceSlug}.geojson`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d) osmMahCache.set(ilceSlug, d);
      return d;
    })
    .catch(() => null);
}

function mergeBboxes(features) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const f of features) {
    const b = f.properties?.bbox;
    if (!b) continue;
    if (b[0] < minLon) minLon = b[0];
    if (b[1] < minLat) minLat = b[1];
    if (b[2] > maxLon) maxLon = b[2];
    if (b[3] > maxLat) maxLat = b[3];
  }
  return Number.isFinite(minLon) ? [[minLon, minLat], [maxLon, maxLat]] : ISTANBUL_BOUNDS;
}

function curvedLine(a, b, liftDeg = 0.0012) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const sign = ny >= 0 ? 1 : -1;
  const cx = mx + nx * liftDeg * sign;
  const cy = my + ny * liftDeg * sign;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * cx + t * t * b[0],
      u * u * a[1] + 2 * u * t * cy + t * t * b[1],
    ]);
  }
  return pts;
}

export default function IstanbulOsmHarita({
  ozet,
  liste,
  yaka,
  ilce,
  mahalle,
  perspektif = 'bogaz',
  vurguluMekan,
  onChangePerspektif,
  onSelectYaka,
  onSelectIlce,
  onSelectMahalle,
}) {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const tipElRef = useRef(null);
  const tipKeyRef = useRef(null);
  const movingRef = useRef(false);
  const rafMoveRef = useRef(0);
  const hoverIlceIdRef = useRef(null);
  const hoverMahIdRef = useRef(null);
  const panelIlceIdRef = useRef(null);
  const panelMahIdRef = useRef(null);
  const ilceIdBySlugRef = useRef(new Map());
  const mahIdBySlugRef = useRef(new Map());
  const propsRef = useRef({});
  const egimRef = useRef(true);

  const [hazir, setHazir] = useState(false);
  const [webglHata, setWebglHata] = useState(false);
  const [ilceGeo, setIlceGeo] = useState(null);
  const [mahGeo, setMahGeo] = useState(null);
  const [tipData, setTipData] = useState(null);
  const [egim3B, setEgim3B] = useState(true);
  const [showBolgeler, setShowBolgeler] = useState(true);
  const [showBridges, setShowBridges] = useState(true);
  const [showSights, setShowSights] = useState(true);

  egimRef.current = egim3B;
  propsRef.current = { ozet, yaka, ilce, mahalle, onSelectIlce, onSelectMahalle, navigate };

  useEffect(() => {
    let alive = true;
    loadOsmIlceler().then((d) => {
      if (!alive || !d) return;
      ilceIdBySlugRef.current = new Map(d.features.map((f) => [f.properties.slug, f.id]));
      setIlceGeo(d);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!ilce) {
      mahIdBySlugRef.current = new Map();
      setMahGeo(null);
      return undefined;
    }
    loadOsmMahalleler(ilce).then((d) => {
      if (!alive) return;
      mahIdBySlugRef.current = new Map((d?.features || []).map((f) => [f.properties.slug, f.id]));
      setMahGeo(d);
    });
    return () => { alive = false; };
  }, [ilce]);

  // MapLibre OpenStreetMap örneğini oluştur
  useEffect(() => {
    if (!mapElRef.current) return undefined;
    setHazir(false);
    let m;
    try {
      m = new maplibregl.Map({
        container: mapElRef.current,
        style: HARITA_STILI,
        center: [29.015, 41.045],
        zoom: 11.1,
        pitch: 36,
        bearing: -12,
        maxBounds: [
          [27.5, 40.55],
          [30.35, 41.85],
        ],
        minZoom: 8.4,
        maxZoom: 17.5,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
    } catch {
      setWebglHata(true);
      return undefined;
    }

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-left');

    m.on('load', () => {
      for (const id of [
        'atlas-ilceler',
        'atlas-mahalleler',
        'atlas-vapurlar',
        'atlas-kopruler',
        'atlas-kopru-kuleler',
        'atlas-mekanlar',
        'atlas-simgeler',
        'atlas-vurgulu',
      ]) {
        m.addSource(id, { type: 'geojson', data: EMPTY_FC });
      }

      // 1. Vapur hatları
      m.addLayer({
        id: 'atlas-vapur-line',
        type: 'line',
        source: 'atlas-vapurlar',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#174C9E',
          'line-width': 1.5,
          'line-dasharray': [3, 4],
          'line-opacity': 0.5,
        },
      });

      // 2. 39 İlçe koroplet dolgu ve sınırları (hover + panelHover doğrudan GPU feature-state)
      m.addLayer({
        id: 'atlas-ilce-fill',
        type: 'fill',
        source: 'atlas-ilceler',
        paint: {
          'fill-color': ['coalesce', ['get', 'renk'], '#64748B'],
          'fill-opacity': [
            'case',
            ['==', ['get', 'acik'], 1], 0.04,
            ['==', ['get', 'soluk'], 1], 0.05,
            ['boolean', ['feature-state', 'hover'], false], 0.36,
            ['boolean', ['feature-state', 'panelHover'], false], 0.36,
            ['>', ['get', 'n'], 0], 0.2,
            0.05,
          ],
        },
      });

      m.addLayer({
        id: 'atlas-ilce-line',
        type: 'line',
        source: 'atlas-ilceler',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'acik'], 1], '#C84B26',
            ['boolean', ['feature-state', 'hover'], false], '#C84B26',
            ['boolean', ['feature-state', 'panelHover'], false], '#C84B26',
            ['>', ['get', 'n'], 0], 'rgba(10, 37, 64, 0.45)',
            'rgba(100, 116, 139, 0.25)',
          ],
          'line-width': [
            'case',
            ['==', ['get', 'acik'], 1], 2.8,
            ['boolean', ['feature-state', 'hover'], false], 2,
            1,
          ],
          'line-opacity': ['case', ['==', ['get', 'soluk'], 1], 0.2, 0.88],
        },
      });

      // 3. Tembel yüklenen Mahalle koroplet dolgu ve sınırları
      m.addLayer({
        id: 'atlas-mahalle-fill',
        type: 'fill',
        source: 'atlas-mahalleler',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'secili'], 1], '#C84B26',
            ['coalesce', ['get', 'renk'], '#94A3B8'],
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'secili'], 1], 0.36,
            ['boolean', ['feature-state', 'hover'], false], 0.38,
            ['boolean', ['feature-state', 'panelHover'], false], 0.38,
            ['>', ['get', 'n'], 0], 0.24,
            0.06,
          ],
        },
      });

      m.addLayer({
        id: 'atlas-mahalle-line',
        type: 'line',
        source: 'atlas-mahalleler',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'secili'], 1], '#9A3412',
            ['boolean', ['feature-state', 'hover'], false], '#C84B26',
            'rgba(10, 37, 64, 0.4)',
          ],
          'line-width': ['case', ['==', ['get', 'secili'], 1], 2.4, 1],
        },
      });

      // 4. Köprüler ve Avrasya Tüneli
      m.addLayer({
        id: 'atlas-kopru-glow',
        type: 'line',
        source: 'atlas-kopruler',
        filter: ['!=', ['get', 'tip'], 'tunel'],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#C84B26',
          'line-width': ['case', ['==', ['get', 'tip'], 'bogaz'], 7, 5],
          'line-opacity': 0.28,
          'line-blur': 2,
        },
      });

      m.addLayer({
        id: 'atlas-kopru-line',
        type: 'line',
        source: 'atlas-kopruler',
        filter: ['!=', ['get', 'tip'], 'tunel'],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#C84B26',
          'line-width': ['case', ['==', ['get', 'tip'], 'bogaz'], 3, 2.2],
        },
      });

      m.addLayer({
        id: 'atlas-tunel-line',
        type: 'line',
        source: 'atlas-kopruler',
        filter: ['==', ['get', 'tip'], 'tunel'],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#174C9E',
          'line-width': 2.2,
          'line-dasharray': [2.5, 2.5],
        },
      });

      m.addLayer({
        id: 'atlas-kopru-kule',
        type: 'circle',
        source: 'atlas-kopru-kuleler',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'tip'], 'bogaz'], 3.8, 2.6],
          'circle-color': '#C84B26',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.5,
        },
      });

      m.addLayer({
        id: 'atlas-kopru-label',
        type: 'symbol',
        source: 'atlas-kopruler',
        filter: ['==', ['get', 'tip'], 'bogaz'],
        layout: {
          'symbol-placement': 'line-center',
          'text-field': ['get', 'kisaAd'],
          'text-font': [HARITA_YAZI_TIPI],
          'text-size': 11,
          'text-offset': [0, -1.1],
        },
        paint: {
          'text-color': '#9A3412',
          'text-halo-color': 'rgba(255, 255, 255, 0.94)',
          'text-halo-width': 2,
        },
      });

      // 5. Aktif bölge mekan pinleri
      m.addLayer({
        id: 'atlas-mekan-nokta',
        type: 'circle',
        source: 'atlas-mekanlar',
        paint: {
          'circle-radius': 5.5,
          'circle-color': ['coalesce', ['get', 'renk'], '#0A2540'],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 1.8,
          'circle-opacity': 0.92,
        },
      });

      // 6. Öne çıkan İstanbul Simgeleri
      m.addLayer({
        id: 'atlas-simge-halo',
        type: 'circle',
        source: 'atlas-simgeler',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'oncelik'], 1], 12, 9],
          'circle-color': '#C84B26',
          'circle-opacity': 0.16,
        },
      });

      m.addLayer({
        id: 'atlas-simge-nokta',
        type: 'circle',
        source: 'atlas-simgeler',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'oncelik'], 1], 6, 4.8],
          'circle-color': '#C84B26',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      });

      m.addLayer({
        id: 'atlas-simge-label',
        type: 'symbol',
        source: 'atlas-simgeler',
        layout: {
          'text-field': ['get', 'kisaAd'],
          'text-font': [HARITA_YAZI_TIPI],
          'text-size': 11,
          'text-offset': [0, -1.3],
          'text-anchor': 'bottom',
          'text-optional': true,
        },
        paint: {
          'text-color': '#0A2540',
          'text-halo-color': 'rgba(255, 255, 255, 0.96)',
          'text-halo-width': 2,
        },
      });

      // 7. Panelden üzerine gelinen mekanın anlık vurgu halkası (tek nokta, sıfır gecikme)
      m.addLayer({
        id: 'atlas-vurgulu-halka',
        type: 'circle',
        source: 'atlas-vurgulu',
        paint: {
          'circle-radius': 17,
          'circle-color': '#C84B26',
          'circle-opacity': 0.28,
          'circle-stroke-color': '#C84B26',
          'circle-stroke-width': 2,
        },
      });

      m.addLayer({
        id: 'atlas-vurgulu-nokta',
        type: 'circle',
        source: 'atlas-vurgulu',
        paint: {
          'circle-radius': 8,
          'circle-color': '#0A2540',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2.4,
        },
      });

      // ── Akıcı etkileşim: sürükleme/uçuş sırasında sorguyu durdur + DOM transform tooltip ──
      const clearPolygonHover = () => {
        if (hoverIlceIdRef.current != null) {
          m.setFeatureState({ source: 'atlas-ilceler', id: hoverIlceIdRef.current }, { hover: false });
          hoverIlceIdRef.current = null;
        }
        if (hoverMahIdRef.current != null) {
          m.setFeatureState({ source: 'atlas-mahalleler', id: hoverMahIdRef.current }, { hover: false });
          hoverMahIdRef.current = null;
        }
      };

      const hideTip = () => {
        if (tipKeyRef.current !== null) {
          tipKeyRef.current = null;
          setTipData(null);
        }
      };

      const positionTip = (px, py, hasPhoto) => {
        const el = tipElRef.current;
        const wrap = wrapRef.current;
        if (!el || !wrap) return;
        const maxX = Math.max(12, wrap.clientWidth - 266);
        const maxY = Math.max(12, wrap.clientHeight - (hasPhoto ? 210 : 116));
        const x = Math.min(px + 14, maxX);
        const y = Math.max(12, Math.min(py - 12, maxY));
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };

      m.on('movestart', () => {
        movingRef.current = true;
        hideTip();
      });
      m.on('moveend', () => {
        movingRef.current = false;
      });

      let pendingEvent = null;
      const processHover = () => {
        rafMoveRef.current = 0;
        const e = pendingEvent;
        pendingEvent = null;
        if (!e || movingRef.current) return;

        const layers = [
          'atlas-simge-nokta',
          'atlas-mekan-nokta',
          'atlas-kopru-line',
          'atlas-tunel-line',
          'atlas-mahalle-fill',
          'atlas-ilce-fill',
        ].filter((id) => m.getLayer(id) && m.getLayoutProperty(id, 'visibility') !== 'none');

        const hits = m.queryRenderedFeatures(e.point, { layers });
        if (!hits.length) {
          m.getCanvas().style.cursor = '';
          clearPolygonHover();
          hideTip();
          return;
        }

        const f = hits[0];
        const lid = f.layer.id;
        const p = f.properties;
        m.getCanvas().style.cursor = 'pointer';

        const key = `${lid}:${p.id || p.slug || f.id}`;
        positionTip(e.point.x, e.point.y, lid === 'atlas-simge-nokta' && Boolean(p.gorsel));

        if (lid === 'atlas-mahalle-fill') {
          if (hoverIlceIdRef.current != null) {
            m.setFeatureState({ source: 'atlas-ilceler', id: hoverIlceIdRef.current }, { hover: false });
            hoverIlceIdRef.current = null;
          }
          if (hoverMahIdRef.current !== f.id) {
            if (hoverMahIdRef.current != null) {
              m.setFeatureState({ source: 'atlas-mahalleler', id: hoverMahIdRef.current }, { hover: false });
            }
            hoverMahIdRef.current = f.id;
            m.setFeatureState({ source: 'atlas-mahalleler', id: f.id }, { hover: true });
          }
        } else if (lid === 'atlas-ilce-fill') {
          if (hoverMahIdRef.current != null) {
            m.setFeatureState({ source: 'atlas-mahalleler', id: hoverMahIdRef.current }, { hover: false });
            hoverMahIdRef.current = null;
          }
          if (hoverIlceIdRef.current !== f.id) {
            if (hoverIlceIdRef.current != null) {
              m.setFeatureState({ source: 'atlas-ilceler', id: hoverIlceIdRef.current }, { hover: false });
            }
            hoverIlceIdRef.current = f.id;
            m.setFeatureState({ source: 'atlas-ilceler', id: f.id }, { hover: true });
            loadOsmMahalleler(p.slug);
          }
        } else {
          clearPolygonHover();
        }

        if (tipKeyRef.current === key) return;
        tipKeyRef.current = key;

        if (lid === 'atlas-simge-nokta') {
          setTipData({
            tip: 'simge',
            baslik: p.ad,
            ust: p.mahalleAd ? `${p.ilceAd} · ${p.mahalleAd}` : p.ilceAd,
            turAd: p.turAd,
            kisa: p.kisa,
            gorsel: p.gorsel || null,
          });
        } else if (lid === 'atlas-mekan-nokta') {
          setTipData({ tip: 'mekan', baslik: p.ad, ust: p.konum, turAd: p.turAd, kisa: p.kisa });
        } else if (lid === 'atlas-kopru-line' || lid === 'atlas-tunel-line') {
          setTipData({
            tip: 'kopru',
            baslik: p.ad,
            ust: p.tip === 'tunel' ? `Deniz altı geçiş · ${p.yil}` : p.tip === 'bogaz' ? `Boğaz Köprüsü · ${p.yil}` : `Haliç Köprüsü · ${p.yil}`,
            baglanti: p.baglanti,
            uzunluk: p.uzunluk,
          });
        } else if (lid === 'atlas-mahalle-fill') {
          setTipData({
            tip: 'bolge',
            baslik: p.ad,
            ust: p.ilceAd || p.ilce,
            n: Number(p.n) || 0,
            dom: p.domMetin || '',
          });
        } else if (lid === 'atlas-ilce-fill') {
          setTipData({
            tip: 'bolge',
            baslik: p.ad,
            ust: p.yaka === 'avrupa' ? 'Avrupa Yakası' : 'Anadolu Yakası',
            n: Number(p.n) || 0,
            dom: p.domMetin || '',
          });
        }
        requestAnimationFrame(() => positionTip(e.point.x, e.point.y, lid === 'atlas-simge-nokta' && Boolean(p.gorsel)));
      };

      m.on('mousemove', (e) => {
        if (movingRef.current) return;
        pendingEvent = e;
        if (!rafMoveRef.current) rafMoveRef.current = requestAnimationFrame(processHover);
      });

      m.on('mouseout', () => {
        clearPolygonHover();
        hideTip();
      });

      m.on('click', (e) => {
        const layers = [
          'atlas-simge-nokta',
          'atlas-mekan-nokta',
          'atlas-kopru-line',
          'atlas-tunel-line',
          'atlas-mahalle-fill',
          'atlas-ilce-fill',
        ].filter((id) => m.getLayer(id) && m.getLayoutProperty(id, 'visibility') !== 'none');

        const hits = m.queryRenderedFeatures(e.point, { layers });
        if (!hits.length) return;
        const f = hits[0];
        const lid = f.layer.id;
        const cur = propsRef.current;

        if (lid === 'atlas-simge-nokta' || lid === 'atlas-mekan-nokta') {
          cur.navigate(`/mekan/${f.properties.id}`);
        } else if (lid === 'atlas-kopru-line' || lid === 'atlas-tunel-line') {
          if (f.properties.ilkIlce) cur.onSelectIlce?.(f.properties.ilkIlce);
        } else if (lid === 'atlas-mahalle-fill') {
          const { slug, ilce: ilc } = f.properties;
          cur.onSelectMahalle?.(ilc, cur.mahalle === slug ? null : slug);
        } else if (lid === 'atlas-ilce-fill') {
          const { slug, yaka: yk } = f.properties;
          if (slug !== cur.ilce) cur.onSelectIlce?.(slug, yk);
        }
      });

      setHazir(true);
    });

    m.on('error', (e) => console.warn('[osm-atlas]', e?.error?.message));
    mapRef.current = m;
    return () => {
      if (rafMoveRef.current) cancelAnimationFrame(rafMoveRef.current);
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Katman görünürlükleri
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;
    const setVis = (ids, on) => {
      for (const id of ids) {
        if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
      }
    };
    setVis(['atlas-ilce-fill', 'atlas-ilce-line', 'atlas-mahalle-fill', 'atlas-mahalle-line'], showBolgeler);
    setVis(['atlas-vapur-line', 'atlas-kopru-glow', 'atlas-kopru-line', 'atlas-tunel-line', 'atlas-kopru-kule', 'atlas-kopru-label'], showBridges);
    setVis(['atlas-simge-halo', 'atlas-simge-nokta', 'atlas-simge-label'], showSights);
  }, [hazir, showBolgeler, showBridges, showSights]);

  // İlçe GeoJSON verisi (yalnızca bölge veya özet değiştiğinde güncellenir, hover'da asla!)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir || !ilceGeo) return;
    const turler = ozet?.turler || {};
    m.getSource('atlas-ilceler')?.setData({
      type: 'FeatureCollection',
      features: ilceGeo.features.map((f) => {
        const slug = f.properties.slug;
        const st = ozet?.ilceler?.[slug];
        const n = st?.n || 0;
        const dom = st?.dom || [];
        const isOpen = ilce === slug;
        const isDim = (yaka && !ilce && f.properties.yaka !== yaka) || (ilce && !isOpen);
        return {
          ...f,
          properties: {
            ...f.properties,
            n,
            renk: dom[0] ? TUR_RENK[dom[0]] || '#C84B26' : '#64748B',
            domMetin: dom.map((t) => turler[t]?.ad || t).join(' · '),
            acik: isOpen ? 1 : 0,
            soluk: isDim ? 1 : 0,
          },
        };
      }),
    });
  }, [hazir, ilceGeo, ozet, yaka, ilce]);

  // Mahalle GeoJSON verisi
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;
    if (!ilce || !mahGeo) {
      m.getSource('atlas-mahalleler')?.setData(EMPTY_FC);
      return;
    }
    const turler = ozet?.turler || {};
    const ilceSt = ozet?.ilceler?.[ilce];
    m.getSource('atlas-mahalleler')?.setData({
      type: 'FeatureCollection',
      features: mahGeo.features.map((f) => {
        const slug = f.properties.slug;
        const st = ilceSt?.mahalleler?.[slug];
        const n = st?.n || 0;
        const dom = st?.dom || [];
        return {
          ...f,
          properties: {
            ...f.properties,
            ilceAd: ilceSt?.ad || ilce,
            n,
            renk: dom[0] ? TUR_RENK[dom[0]] || '#C84B26' : '#94A3B8',
            domMetin: dom.map((t) => turler[t]?.ad || t).join(' · '),
            secili: mahalle === slug ? 1 : 0,
          },
        };
      }),
    });
  }, [hazir, ilce, mahalle, mahGeo, ozet]);

  // Panelden mekan üzerine gelince: sıfır GeoJSON yeniden yükleme! Yalnızca GPU feature-state + 1 nokta.
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;

    if (panelIlceIdRef.current != null) {
      m.setFeatureState({ source: 'atlas-ilceler', id: panelIlceIdRef.current }, { panelHover: false });
      panelIlceIdRef.current = null;
    }
    if (panelMahIdRef.current != null) {
      m.setFeatureState({ source: 'atlas-mahalleler', id: panelMahIdRef.current }, { panelHover: false });
      panelMahIdRef.current = null;
    }

    if (vurguluMekan) {
      const iId = ilceIdBySlugRef.current.get(vurguluMekan.ilce);
      if (iId != null && !ilce) {
        panelIlceIdRef.current = iId;
        m.setFeatureState({ source: 'atlas-ilceler', id: iId }, { panelHover: true });
      }
      const mId = mahIdBySlugRef.current.get(vurguluMekan.mahalle);
      if (mId != null && ilce) {
        panelMahIdRef.current = mId;
        m.setFeatureState({ source: 'atlas-mahalleler', id: mId }, { panelHover: true });
      }
      if (Number.isFinite(vurguluMekan.lon) && Number.isFinite(vurguluMekan.lat)) {
        m.getSource('atlas-vurgulu')?.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [vurguluMekan.lon, vurguluMekan.lat] },
              properties: {},
            },
          ],
        });
        return;
      }
    }
    m.getSource('atlas-vurgulu')?.setData(EMPTY_FC);
  }, [hazir, vurguluMekan, ilce]);

  // Köprüler ve vapur hatları
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir || !ozet) return;

    m.getSource('atlas-vapurlar')?.setData({
      type: 'FeatureCollection',
      features: (ozet.suYollari?.vapurHatlari || [])
        .filter((v) => Array.isArray(v.coords))
        .map((v) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: v.coords },
          properties: { id: v.id, ad: v.ad },
        })),
    });

    const kopruFeatures = [];
    const kuleFeatures = [];
    for (const k of ozet.kopruler || []) {
      if (!k.a || !k.b) continue;
      const lift = k.tip === 'bogaz' ? 0.0014 : k.tip === 'tunel' ? 0.0022 : 0.0004;
      kopruFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: curvedLine(k.a, k.b, lift) },
        properties: {
          id: k.id,
          ad: k.ad,
          kisaAd: k.kisaAd,
          tip: k.tip,
          yil: k.yil,
          uzunluk: k.uzunluk,
          baglanti: k.baglanti,
          ilkIlce: k.ilceler?.[0] || '',
        },
      });
      if (k.tip !== 'tunel') {
        for (const t of [0.22, 0.78]) {
          kuleFeatures.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [k.a[0] + (k.b[0] - k.a[0]) * t, k.a[1] + (k.b[1] - k.a[1]) * t],
            },
            properties: { tip: k.tip },
          });
        }
      }
    }
    m.getSource('atlas-kopruler')?.setData({ type: 'FeatureCollection', features: kopruFeatures });
    m.getSource('atlas-kopru-kuleler')?.setData({ type: 'FeatureCollection', features: kuleFeatures });
  }, [hazir, ozet]);

  // Simgeler ve mekan pinleri
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir || !ozet) return;

    const simgeSet = new Set((ozet.simgeler || []).map((s) => s.id));
    const simgeler = (ozet.simgeler || []).filter((s) => {
      if (!Number.isFinite(s.lon) || !Number.isFinite(s.lat)) return false;
      return ilce ? s.ilce === ilce : true;
    });

    m.getSource('atlas-simgeler')?.setData({
      type: 'FeatureCollection',
      features: simgeler.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          id: s.id,
          ad: s.ad,
          kisaAd: s.kisaAd,
          oncelik: s.oncelik,
          turAd: s.turAd,
          kisa: s.kisa || '',
          gorsel: s.gorsel || '',
          ilceAd: s.ilceAd,
          mahalleAd: s.mahalleAd || '',
        },
      })),
    });

    const panelMekanlari = (liste?.mekanlar || []).filter(
      (x) =>
        Number.isFinite(x.lon) &&
        Number.isFinite(x.lat) &&
        (!showSights || !simgeSet.has(x.id)) &&
        (ilce || liste?.filtreEtiketi),
    );
    m.getSource('atlas-mekanlar')?.setData({
      type: 'FeatureCollection',
      features: panelMekanlari.map((x) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [x.lon, x.lat] },
        properties: {
          id: x.id,
          ad: x.ad,
          turAd: x.turAd,
          konum: x.konum || '',
          kisa: x.kisa || '',
          renk: TUR_RENK[x.tur] || '#0A2540',
        },
      })),
    });
  }, [hazir, ozet, liste, ilce, showSights]);

  // Akıcı kamera geçişi (panel haritanın yanında olduğu için tüm harita alanı özgür!)
  const flyToActive = useCallback(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;
    const pad = { top: 96, left: 28, right: 28, bottom: 64 };
    const pitchOn = egimRef.current;

    if (ilce && mahalle && mahGeo) {
      const mf = mahGeo.features.find((x) => x.properties.slug === mahalle);
      if (mf?.properties?.bbox) {
        const b = mf.properties.bbox;
        m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {
          padding: pad,
          maxZoom: 15.2,
          pitch: pitchOn ? 30 : 0,
          bearing: 0,
          duration: 500,
          easing: EASE_OUT,
          essential: true,
        });
        return;
      }
    }

    if (ilce && ilceGeo) {
      const df = ilceGeo.features.find((x) => x.properties.slug === ilce);
      if (df?.properties?.bbox) {
        const b = df.properties.bbox;
        m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {
          padding: pad,
          maxZoom: 14,
          pitch: pitchOn ? 26 : 0,
          bearing: 0,
          duration: 520,
          easing: EASE_OUT,
          essential: true,
        });
        return;
      }
    }

    if (yaka && ilceGeo) {
      const sideFeatures = ilceGeo.features.filter((x) => x.properties.yaka === yaka);
      m.fitBounds(mergeBboxes(sideFeatures), {
        padding: pad,
        maxZoom: 12.2,
        pitch: pitchOn ? 18 : 0,
        bearing: 0,
        duration: 540,
        easing: EASE_OUT,
        essential: true,
      });
      return;
    }

    if (perspektif === 'bogaz') {
      const ll = ozet?.bogazOdakLL || [28.88, 40.94, 29.13, 41.215];
      m.fitBounds([[ll[0], ll[1]], [ll[2], ll[3]]], {
        padding: pad,
        pitch: pitchOn ? 36 : 0,
        bearing: pitchOn ? -12 : 0,
        duration: 540,
        easing: EASE_OUT,
        essential: true,
      });
    } else {
      m.fitBounds(ISTANBUL_BOUNDS, {
        padding: pad,
        pitch: 0,
        bearing: 0,
        duration: 540,
        easing: EASE_OUT,
        essential: true,
      });
    }
  }, [hazir, ilce, mahalle, yaka, perspektif, ilceGeo, mahGeo, ozet?.bogazOdakLL]);

  useEffect(() => {
    flyToActive();
  }, [flyToActive]);

  // 3B eğim düğmesi konumu sıçratmadan yerinde yumuşakça eğer
  const toggle3B = () => {
    const next = !egim3B;
    setEgim3B(next);
    const m = mapRef.current;
    if (!m || !hazir) return;
    m.easeTo({
      pitch: next ? (ilce ? 28 : 36) : 0,
      bearing: next && !ilce && !yaka && perspektif === 'bogaz' ? -12 : 0,
      duration: 360,
      easing: EASE_OUT,
      essential: true,
    });
  };

  if (webglHata) {
    return (
      <IstanbulSvgHarita
        ozet={ozet}
        yaka={yaka}
        ilce={ilce}
        mahalle={mahalle}
        perspektif={perspektif}
        vurguluIlce={vurguluMekan?.ilce}
        vurguluMahalle={vurguluMekan?.mahalle}
        vurguluMekanId={vurguluMekan?.id}
        onChangePerspektif={onChangePerspektif}
        onSelectYaka={onSelectYaka}
        onSelectIlce={onSelectIlce}
        onSelectMahalle={onSelectMahalle}
      />
    );
  }

  return (
    <div ref={wrapRef} className="atlas-osm-wrap relative h-full w-full">
      <div
        ref={mapElRef}
        role="region"
        aria-label="OpenStreetMap tabanlı İstanbul ilçe, mahalle, Boğaz ve simge yapılar haritası"
        className="h-full w-full"
      />

      {/* Perspektif ve katman kontrol çubuğu */}
      <div
        className="atlas-chrome absolute left-3 top-[58px] z-20 inline-flex flex-wrap items-center gap-0.5 rounded-full p-1"
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
        <span className="mx-0.5 h-4 w-px bg-[rgb(var(--border-strong))]" aria-hidden="true" />
        <button
          type="button"
          aria-pressed={egim3B}
          onClick={toggle3B}
          className={`atlas-hud-btn ${egim3B ? 'active' : ''}`}
          title="3B eğimli perspektif"
        >
          3B
        </button>
        <button
          type="button"
          aria-pressed={showBolgeler}
          onClick={() => setShowBolgeler((v) => !v)}
          className={`atlas-hud-btn hidden sm:inline-flex ${showBolgeler ? 'active' : ''}`}
          title="İlçe ve mahalle sınır renkleri"
        >
          Bölgeler
        </button>
        <button
          type="button"
          aria-pressed={showBridges}
          onClick={() => setShowBridges((v) => !v)}
          className={`atlas-hud-btn ${showBridges ? 'active' : ''}`}
          title="Boğaz ve Haliç köprüleri ile vapur hatları"
        >
          <Simge ad="conversion_path" boyut={15} /> Köprüler
        </button>
        <button
          type="button"
          aria-pressed={showSights}
          onClick={() => setShowSights((v) => !v)}
          className={`atlas-hud-btn ${showSights ? 'active' : ''}`}
          title="İstanbul'un öne çıkan simge yapıları"
        >
          <Simge ad="star" boyut={15} /> Simgeler
        </button>
      </div>

      {/* Hızlı DOM-konumlandırılmış Proje 404 bilgi kartı */}
      <div
        ref={tipElRef}
        className={`atlas-tip atlas-chrome overflow-hidden rounded-[14px] text-left ${tipData ? 'block' : 'hidden'}`}
        style={{ width: tipData?.tip === 'simge' && tipData?.gorsel ? 248 : 'auto', maxWidth: 256 }}
      >
        {tipData && (
          <>
            {tipData.tip === 'simge' && tipData.gorsel && (
              <div className="relative h-24 w-full overflow-hidden bg-navy/20">
                <img src={tipData.gorsel} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="px-3.5 py-2.5">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                {tipData.ust}
              </div>
              <div className="font-display text-[15px] font-bold leading-snug text-heading">
                {tipData.baslik}
              </div>

              {tipData.tip === 'kopru' && (
                <div className="mt-1 space-y-0.5 text-[12px]">
                  <div className="font-semibold text-accent">{tipData.baglanti}</div>
                  <div className="text-ink-muted">Uzunluk: {tipData.uzunluk}</div>
                </div>
              )}

              {(tipData.tip === 'simge' || tipData.tip === 'mekan') && (
                <>
                  <div className="mt-0.5 text-[12px] font-semibold text-accent">
                    {tipData.tip === 'simge' ? '★ ' : ''}
                    {tipData.turAd} · Detay için tıkla
                  </div>
                  {tipData.kisa && (
                    <p className="m-0 mt-1 line-clamp-2 text-[11.5px] leading-snug text-ink-muted">
                      {tipData.kisa}
                    </p>
                  )}
                </>
              )}

              {tipData.tip === 'bolge' && (
                <>
                  <div className={`mt-0.5 text-[12px] font-semibold ${tipData.n > 0 ? 'text-accent' : 'text-ink-faint'}`}>
                    {tipData.n > 0 ? `${tipData.n} mekan` : 'Henüz kayıt yok'}
                  </div>
                  {tipData.dom && (
                    <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
                      {tipData.dom}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
