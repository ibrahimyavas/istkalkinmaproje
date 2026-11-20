import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HARITA_STILI, HARITA_YAZI_TIPI, ISTANBUL_MERKEZ } from '../../lib/harita.js';
import { VAPUR_RENK } from '../../lib/vapurRenkleri.js';

const RENK = VAPUR_RENK;

/**
 * Vapur rotası OpenStreetMap haritası:
 * Deniz hattı, iskeleler ve güverteden görülen numaralı siluet pinleri (Sol/İskele vs Sağ/Sancak).
 */
export default function VapurHaritasi({
  cizgi = [],
  iskeleler = [],
  siluetler = [],
  aktifId = null,
  onSec,
  etiket = 'Boğaz vapur haritası',
}) {
  const kapRef = useRef(null);
  const mapRef = useRef(null);
  const onSecRef = useRef(onSec);
  const [hazir, setHazir] = useState(false);
  const [hata, setHata] = useState(null);

  onSecRef.current = onSec;

  useEffect(() => {
    if (!kapRef.current) return undefined;
    setHazir(false);
    let m;
    try {
      m = new maplibregl.Map({
        container: kapRef.current,
        style: HARITA_STILI,
        center: ISTANBUL_MERKEZ,
        zoom: 11.2,
        pitch: 24,
        bearing: -10,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
    } catch {
      setHata('Harita bu tarayıcıda açılamadı (WebGL gerekli).');
      return undefined;
    }

    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    m.on('load', () => {
      for (const id of ['vpr-hat', 'vpr-iskele', 'vpr-siluet', 'vpr-aktif']) {
        m.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      }

      m.addLayer({
        id: 'vpr-hat-glow',
        type: 'line',
        source: 'vpr-hat',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': RENK.hat, 'line-width': 9, 'line-opacity': 0.2, 'line-blur': 2 },
      });
      m.addLayer({
        id: 'vpr-hat-cizgi',
        type: 'line',
        source: 'vpr-hat',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': RENK.hat, 'line-width': 3.5, 'line-dasharray': [2.2, 1.8] },
      });

      m.addLayer({
        id: 'vpr-iskele-nokta',
        type: 'circle',
        source: 'vpr-iskele',
        paint: {
          'circle-radius': 6,
          'circle-color': '#FFFFFF',
          'circle-stroke-color': RENK.iskele,
          'circle-stroke-width': 2.5,
        },
      });
      m.addLayer({
        id: 'vpr-iskele-etiket',
        type: 'symbol',
        source: 'vpr-iskele',
        layout: {
          'text-field': ['get', 'ad'],
          'text-font': [HARITA_YAZI_TIPI],
          'text-size': 11,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#0A2540',
          'text-halo-color': 'rgba(255,255,255,0.95)',
          'text-halo-width': 2,
        },
      });

      m.addLayer({
        id: 'vpr-aktif-halka',
        type: 'circle',
        source: 'vpr-aktif',
        paint: {
          'circle-radius': 20,
          'circle-color': '#C84B26',
          'circle-opacity': 0.28,
          'circle-stroke-color': '#C84B26',
          'circle-stroke-width': 2,
        },
      });

      m.addLayer({
        id: 'vpr-siluet-nokta',
        type: 'circle',
        source: 'vpr-siluet',
        paint: {
          'circle-radius': 12,
          'circle-color': ['match', ['get', 'taraf'], 'sol', RENK.sol, RENK.sag],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      });
      m.addLayer({
        id: 'vpr-siluet-sira',
        type: 'symbol',
        source: 'vpr-siluet',
        layout: {
          'text-field': ['get', 'sira'],
          'text-size': 11.5,
          'text-font': [HARITA_YAZI_TIPI],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#FFFFFF' },
      });

      const popup = new maplibregl.Popup({ closeButton: false, offset: 14 });
      m.on('mouseenter', 'vpr-siluet-nokta', (e) => {
        m.getCanvas().style.cursor = 'pointer';
        const f = e.features[0];
        const p = f.properties;
        popup
          .setLngLat(f.geometry.coordinates)
          .setText(`${p.sira}. ${p.ad} · ${p.tarafEtiketi} (~${p.dk}. dk)`)
          .addTo(m);
      });
      m.on('mouseleave', 'vpr-siluet-nokta', () => {
        m.getCanvas().style.cursor = '';
        popup.remove();
      });
      m.on('click', 'vpr-siluet-nokta', (e) => {
        onSecRef.current?.(e.features[0].properties.id);
      });

      setHazir(true);
    });

    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Rota hattı, iskeleler ve siluet verilerini güncelle
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;

    m.getSource('vpr-hat')?.setData(
      cizgi.length >= 2
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: cizgi }, properties: {} }
        : { type: 'FeatureCollection', features: [] },
    );

    m.getSource('vpr-iskele')?.setData({
      type: 'FeatureCollection',
      features: iskeleler.map((i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [i.lon, i.lat] },
        properties: { ad: i.ad },
      })),
    });

    m.getSource('vpr-siluet')?.setData({
      type: 'FeatureCollection',
      features: siluetler.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          id: s.id,
          ad: s.ad,
          sira: String(s.sira),
          taraf: s.taraf,
          tarafEtiketi: s.tarafEtiketi,
          dk: s.dk,
        },
      })),
    });

    const pts = [...cizgi, ...siluetler.map((s) => [s.lon, s.lat])];
    if (pts.length) {
      const b = new maplibregl.LngLatBounds();
      pts.forEach((pt) => b.extend(pt));
      m.fitBounds(b, { padding: 48, maxZoom: 14.5, duration: 500 });
    }
  }, [hazir, cizgi, iskeleler, siluetler]);

  // Seçili / vurgulanan siluete hafifçe odaklan
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !hazir) return;
    const s = siluetler.find((x) => x.id === aktifId);
    m.getSource('vpr-aktif')?.setData(
      s
        ? {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: {} }],
          }
        : { type: 'FeatureCollection', features: [] },
    );
    if (s) {
      m.easeTo({ center: [s.lon, s.lat], duration: 420, essential: true });
    }
  }, [hazir, aktifId, siluetler]);

  if (hata) {
    return <div className="kart grid h-[420px] place-items-center p-6 text-center text-ink-muted">{hata}</div>;
  }

  return (
    <div>
      <div
        ref={kapRef}
        role="region"
        aria-label={etiket}
        className="h-[360px] w-full overflow-hidden rounded-[16px] border border-hairline lg:h-[480px]"
      />
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Vapur haritası göstergesi">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: RENK.sol }} /> Sol (İskele)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: RENK.sag }} /> Sağ (Sancak)
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: RENK.iskele }} /> Vapur iskelesi
        </li>
      </ul>
    </div>
  );
}
