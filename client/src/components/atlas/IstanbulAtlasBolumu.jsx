import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import { useTercihler } from '../../context/Tercihler.jsx';
import Yukleniyor, { HataKutusu } from '../common/Yukleniyor.jsx';
import AtlasPanel from './AtlasPanel.jsx';
import AtlasArama from './AtlasArama.jsx';
import AtlasEkmekKirintisi from './AtlasEkmekKirintisi.jsx';
import '../../styles/atlas.css';

const IstanbulOsmHarita = lazy(() => import('./IstanbulOsmHarita.jsx'));

export default function IstanbulAtlasBolumu() {
  const [params, setParams] = useSearchParams();
  const { erisilebilir } = useTercihler();

  const yaka = params.get('yaka') || null;
  const ilce = params.get('ilce') || null;
  const mahalle = params.get('mahalle') || null;
  const tur = params.get('tur') || null;
  const rozet = params.get('rozet') || null;

  const ozetReq = useApi(() => api.atlasOzet(), []);
  const [liste, setListe] = useState(null);
  const [listeYukleniyor, setListeYukleniyor] = useState(true);
  const [listeHata, setListeHata] = useState(null);
  const [perspektif, setPerspektif] = useState('bogaz');
  const [vurguluMekan, setVurguluMekan] = useState(null);

  useEffect(() => {
    let alive = true;
    setListeYukleniyor(true);
    setListeHata(null);
    const sorgu = {};
    if (yaka) sorgu.yaka = yaka;
    if (ilce) sorgu.ilce = ilce;
    if (mahalle) sorgu.mahalle = mahalle;
    if (tur) sorgu.tur = tur;
    if (rozet) sorgu.rozet = rozet;
    if (erisilebilir) sorgu.erisilebilir = 1;

    api
      .atlasListe(sorgu)
      .then((res) => alive && setListe(res))
      .catch((err) => alive && setListeHata(hataMesaji(err)))
      .finally(() => alive && setListeYukleniyor(false));
    return () => { alive = false; };
  }, [yaka, ilce, mahalle, tur, rozet, erisilebilir]);

  const guncelle = useCallback(
    (yeni) => {
      const next = new URLSearchParams(params);
      for (const k of ['yaka', 'ilce', 'mahalle', 'tur', 'rozet']) {
        if (yeni[k]) next.set(k, yeni[k]);
        else next.delete(k);
      }
      setParams(next, { preventScrollReset: true });
    },
    [params, setParams],
  );

  const onReset = useCallback(() => guncelle({ tur, rozet }), [guncelle, tur, rozet]);
  const onSelectYaka = useCallback((yk) => guncelle({ yaka: yk, tur, rozet }), [guncelle, tur, rozet]);
  const onSelectIlce = useCallback(
    (ilceSlug, yk) => {
      const etkinYaka = yk || ozetReq.veri?.ilceler?.[ilceSlug]?.yaka || yaka;
      guncelle({ yaka: etkinYaka, ilce: ilceSlug, tur, rozet });
    },
    [guncelle, ozetReq.veri, yaka, tur, rozet],
  );
  const onSelectMahalle = useCallback(
    (ilceSlug, mahSlug) => {
      const etkinYaka = ozetReq.veri?.ilceler?.[ilceSlug]?.yaka || yaka;
      guncelle({ yaka: etkinYaka, ilce: ilceSlug, mahalle: mahSlug, tur, rozet });
    },
    [guncelle, ozetReq.veri, yaka, tur, rozet],
  );
  const onSelectTur = useCallback((t) => guncelle({ yaka, ilce, mahalle, tur: t }), [guncelle, yaka, ilce, mahalle]);
  const onSelectRozet = useCallback((r) => guncelle({ yaka, ilce, mahalle, rozet: r }), [guncelle, yaka, ilce, mahalle]);
  const onClearFilter = useCallback(() => guncelle({ yaka, ilce, mahalle }), [guncelle, yaka, ilce, mahalle]);
  const onChangePerspektif = useCallback(
    (p) => {
      setPerspektif(p);
      guncelle({ tur, rozet });
    },
    [guncelle, tur, rozet],
  );

  if (ozetReq.hata) {
    return <HataKutusu metin={ozetReq.hata} yenile={ozetReq.yenile} />;
  }

  return (
    <section id="atlas" aria-labelledby="atlas-baslik" className="scroll-mt-24">
      <div className="grid gap-6 lg:grid-cols-12">
        <h2
          id="atlas-baslik"
          className="m-0 font-display font-bold leading-[1.02] tracking-[-.03em] text-heading lg:col-span-5"
          style={{ fontSize: 'clamp(32px,4vw,56px)' }}
        >
          İstanbul haritası
        </h2>
        <p className="m-0 max-w-[54ch] self-end text-lg leading-7 text-ink lg:col-span-7">
          Boğaz’dan mahalle sokaklarına inin: 39 ilçe, 972 mahalle, köprüler ve öne çıkan simge yapılar tek OpenStreetMap haritasında.
        </p>
      </div>

      <div className="mt-8 grid overflow-hidden rounded-[20px] border border-hairline bg-surface shadow-md md:grid-cols-12">
        {/* Sol: OpenStreetMap + Boğaz / köprüler / simgeler / ilçe-mahalle katmanları */}
        <div className="relative h-[460px] min-w-0 bg-surface-raised sm:h-[540px] md:col-span-7 md:h-[620px] xl:col-span-8">
          <Suspense fallback={<Yukleniyor kutu metin="İstanbul haritası yükleniyor…" yukseklik="h-full" />}>
            <IstanbulOsmHarita
              ozet={ozetReq.veri}
              liste={liste}
              yaka={yaka}
              ilce={ilce}
              mahalle={mahalle}
              perspektif={perspektif}
              vurguluMekan={vurguluMekan}
              onChangePerspektif={onChangePerspektif}
              onSelectYaka={onSelectYaka}
              onSelectIlce={onSelectIlce}
              onSelectMahalle={onSelectMahalle}
            />
          </Suspense>

          <AtlasArama
            ozet={ozetReq.veri}
            onSelectYaka={onSelectYaka}
            onSelectIlce={onSelectIlce}
            onSelectMahalle={onSelectMahalle}
            onSelectTur={onSelectTur}
          />

          <AtlasEkmekKirintisi
            ozet={ozetReq.veri}
            yaka={yaka}
            ilce={ilce}
            mahalle={mahalle}
            onReset={onReset}
            onSelectYaka={onSelectYaka}
            onSelectIlce={onSelectIlce}
          />
        </div>

        {/* Sağ: Proje 404 tasarım dilinde bölge ve mekan rehberi */}
        <div className="h-[500px] min-w-0 border-t border-hairline md:col-span-5 md:h-[620px] md:border-l md:border-t-0 xl:col-span-4">
          {listeHata ? (
            <div className="grid h-full place-items-center p-6 text-center">
              <div>
                <p className="m-0 text-sm text-ink-muted">{listeHata}</p>
                <button type="button" onClick={onReset} className="btn-ikincil mt-3">
                  İstanbul’a dön
                </button>
              </div>
            </div>
          ) : (
            <AtlasPanel
              liste={liste}
              yukleniyor={listeYukleniyor}
              tur={tur}
              rozet={rozet}
              erisilebilir={erisilebilir}
              onSelectTur={onSelectTur}
              onSelectRozet={onSelectRozet}
              onClearFilter={onClearFilter}
              onSelectIlce={onSelectIlce}
              onSelectMahalle={onSelectMahalle}
              onHoverMekan={setVurguluMekan}
              onLeaveMekan={() => setVurguluMekan(null)}
            />
          )}
        </div>
      </div>
    </section>
  );
}
