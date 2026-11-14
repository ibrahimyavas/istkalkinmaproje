import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HARITA_STILI, HARITA_YAZI_TIPI, ISTANBUL_MERKEZ } from '../../lib/harita.js';

// Katman renkleri (CSS değişkenleri MapLibre boya özelliklerine geçmediği için
// tema renklerinin sabit karşılıkları; DESIGN.md ile aynı).
const RENK = {
  mekan: '#0A2540',
  atolye: '#C84B26',
  lezzet: '#B7791F',
  durak: '#475569',
  toplanma: '#1B8755',
  rota: '#C84B26',
  rotaYaklasik: '#64748B',
};

const nokta = (items, ozellik) => ({
  type: 'FeatureCollection',
  features: items.map((i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [i.lon, i.lat] },
    properties: { id: i.id, ad: i.ad, ...ozellik(i) },
  })),
});

/**
 * MapLibre haritası.
 * props: mekanlar, duraklar, toplanma, rota ({geometri, geometriKaynagi}),
 *        numarali (rota durak numaraları), onSec(mekanId), yukseklik
 */
export default function HaritaGorunumu({
  mekanlar = [], duraklar = [], toplanma = [], rota = null, numarali = false,
  onSec, yukseklik = 'h-[420px]', etiket = 'Harita', gosterge = true,
}) {
  const kap = useRef(null);
  const harita = useRef(null);
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState(null);

  useEffect(() => {
    if (!kap.current) return undefined;
    // Yeni harita örneği kendi `load` olayını bekler (hızlı yenilemede eski
    // örnekten kalan `hazir: true` durumu stil yüklenmeden katman eklemeye yol açıyordu).
    setHazir(false);
    let m;
    try {
      m = new maplibregl.Map({
        container: kap.current,
        style: HARITA_STILI,
        center: ISTANBUL_MERKEZ,
        zoom: 11,
        attributionControl: { compact: true },
        cooperativeGestures: true,
      });
    } catch (err) {
      setHata('Harita bu tarayıcıda açılamadı (WebGL gerekli).');
      return undefined;
    }
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => setHazir(true));
    m.on('error', (e) => console.warn('[harita]', e?.error?.message));
    harita.current = m;
    return () => m.remove();
  }, []);

  useEffect(() => {
    const m = harita.current;
    if (!m || !hazir || !m.isStyleLoaded()) return;

    const kaynaklar = {
      'p404-rota': rota?.geometri ? { type: 'Feature', geometry: rota.geometri, properties: {} } : null,
      'p404-toplanma': nokta(toplanma, () => ({ tur: 'toplanma' })),
      'p404-durak': nokta(duraklar, (d) => ({ tur: 'durak', alt: d.tur })),
      'p404-mekan': nokta(mekanlar, (x) => ({ tur: x.tur === 'atolye' || x.tur === 'lezzet' ? x.tur : 'mekan', sira: x.sira ? String(x.sira) : '' })),
    };

    for (const [id, data] of Object.entries(kaynaklar)) {
      const src = m.getSource(id);
      const veri = data || { type: 'FeatureCollection', features: [] };
      if (src) src.setData(veri);
      else m.addSource(id, { type: 'geojson', data: veri });
    }

    if (!m.getLayer('p404-rota-cizgi')) {
      m.addLayer({
        id: 'p404-rota-cizgi',
        type: 'line',
        source: 'p404-rota',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': RENK.rota, 'line-width': 5, 'line-opacity': 0.85 },
      });
      m.addLayer({
        id: 'p404-toplanma-nokta', type: 'circle', source: 'p404-toplanma',
        paint: { 'circle-radius': 7, 'circle-color': RENK.toplanma, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
      });
      m.addLayer({
        id: 'p404-durak-nokta', type: 'circle', source: 'p404-durak',
        paint: { 'circle-radius': 6, 'circle-color': RENK.durak, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
      });
      m.addLayer({
        id: 'p404-mekan-nokta', type: 'circle', source: 'p404-mekan',
        paint: {
          'circle-radius': numarali ? 13 : 8,
          'circle-color': ['match', ['get', 'tur'], 'atolye', RENK.atolye, 'lezzet', RENK.lezzet, RENK.mekan],
          'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
        },
      });
      if (numarali) {
        m.addLayer({
          id: 'p404-mekan-sira', type: 'symbol', source: 'p404-mekan',
          layout: { 'text-field': ['get', 'sira'], 'text-size': 13, 'text-font': [HARITA_YAZI_TIPI], 'text-allow-overlap': true },
          paint: { 'text-color': '#fff' },
        });
      }

      const popup = new maplibregl.Popup({ closeButton: false, offset: 12 });
      for (const katman of ['p404-mekan-nokta', 'p404-durak-nokta', 'p404-toplanma-nokta']) {
        m.on('mouseenter', katman, (e) => {
          m.getCanvas().style.cursor = 'pointer';
          const f = e.features[0];
          const ek = f.properties.tur === 'toplanma' ? ' — Toplanma alanı' : f.properties.tur === 'durak' ? ' — Durak' : '';
          popup.setLngLat(f.geometry.coordinates).setText(f.properties.ad + ek).addTo(m);
        });
        m.on('mouseleave', katman, () => {
          m.getCanvas().style.cursor = '';
          popup.remove();
        });
      }
      m.on('click', 'p404-mekan-nokta', (e) => onSec?.(e.features[0].properties.id));
    }

    m.setPaintProperty('p404-rota-cizgi', 'line-color', rota?.geometriKaynagi === 'yaklasik' ? RENK.rotaYaklasik : RENK.rota);
    m.setPaintProperty('p404-rota-cizgi', 'line-dasharray', rota?.geometriKaynagi === 'yaklasik' ? [2, 2] : [1, 0]);

    // Görünümü tüm noktalara sığdır.
    const tum = [...mekanlar, ...(rota ? [] : duraklar)].filter((p) => p.lat && p.lon);
    if (tum.length) {
      const b = new maplibregl.LngLatBounds();
      tum.forEach((p) => b.extend([p.lon, p.lat]));
      m.fitBounds(b, { padding: 60, maxZoom: 16, duration: 0 });
    }
  }, [hazir, mekanlar, duraklar, toplanma, rota, numarali, onSec]);

  if (hata) {
    return <div className={`${yukseklik} kart grid place-items-center p-6 text-center text-ink-muted`}>{hata}</div>;
  }

  return (
    <div className="relative">
      <div ref={kap} role="region" aria-label={etiket} className={`${yukseklik} w-full overflow-hidden rounded-[14px] border border-hairline-subtle`} />
      {gosterge && <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Harita göstergesi">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: RENK.mekan }} />Mekan</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: RENK.atolye }} />Atölye</li>
        {mekanlar.some((x) => x.tur === 'lezzet') && <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: RENK.lezzet }} />Lezzet noktası</li>}
        {duraklar.length > 0 && <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: RENK.durak }} />Toplu taşıma</li>}
        {toplanma.length > 0 && <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: RENK.toplanma }} />Deprem toplanma alanı</li>}
      </ul>}
    </div>
  );
}
