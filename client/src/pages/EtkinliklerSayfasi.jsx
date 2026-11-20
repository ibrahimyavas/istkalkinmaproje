import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, MapPin, Accessibility } from 'lucide-react';
import { api } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import { IskeletKartlar, HataKutusu } from '../components/common/Yukleniyor.jsx';
import { Etiket } from '../components/common/Rozetler.jsx';
import Simge from '../components/common/Simge.jsx';
import EtkinlikKarti from '../components/kultur/EtkinlikKarti.jsx';
import TakvimeEkleDugmesi from '../components/kultur/TakvimeEkleDugmesi.jsx';
import GrupSohbet from '../components/grup/GrupSohbet.jsx';
import { tarihYaz } from '../components/grup/GrupKarti.jsx';
import { googleMapsRotaUrl, yandexMapsRotaUrl } from '../lib/harita.js';

export default function EtkinliklerSayfasi() {
  const { erisilebilir } = useTercihler();
  const etk = useApi(() => api.etkinlikler(), []);
  const semtler = useApi(() => api.semtler(), []);
  const [semtId, setSemtId] = useState('');
  const [ucretsiz, setUcretsiz] = useState(false);
  const gruplarReq = useApi(() => api.gruplar(semtId ? { semtId } : undefined), [semtId]);
  const [seciliGrupId, setSeciliGrupId] = useState(null);

  // Erişim bilgisi olmayan (null) etkinlikler erişilebilir modda gizlenmez, "bilgi yok" olarak kalır.
  const uygun = (e) => (!semtId || e.semtId === semtId) && (!ucretsiz || e.ucretsiz === true) && (!erisilebilir || e.erisilebilir !== false);
  const { sergiler, digerleri } = useMemo(() => {
    const l = (etk.veri || []).filter(uygun);
    return { sergiler: l.filter((e) => e.tur === 'sergi' && e.gercek), digerleri: l.filter((e) => !(e.tur === 'sergi' && e.gercek)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etk.veri, semtId, ucretsiz, erisilebilir]);

  const gruplar = useMemo(() => {
    const l = gruplarReq.veri || [];
    return erisilebilir ? l.filter((g) => g.erisilebilir) : l;
  }, [gruplarReq.veri, erisilebilir]);

  useEffect(() => {
    if (!gruplar.length) {
      setSeciliGrupId(null);
    } else if (!seciliGrupId || !gruplar.some((g) => g.id === seciliGrupId)) {
      setSeciliGrupId(gruplar[0].id);
    }
  }, [gruplar, seciliGrupId]);

  const seciliGrup = gruplar.find((g) => g.id === seciliGrupId) || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 text-4xl font-bold">Etkinlik takvimi</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-muted">
            Süren sergiler, atölyeler, yürüyüşler ve grup etkinlikleri — tek tıkla takviminize ekleyin, grup sohbetinde buluşun.
          </p>
        </div>
        <Link to="/gruplar/yeni" className="btn-ana no-underline">
          <Simge ad="group_add" boyut={18} /> Grup etkinliği aç
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Sergiler kurumların kendi sitelerinden derlendi (son kontrol 14 Kasım 2026); bilet ve saat için kaynağa bakın.
        “Örnek etkinlik” etiketli kayıtlar demo amaçlıdır.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="semt" className="etiket">Semt</label>
          <select id="semt" className="girdi w-56" value={semtId} onChange={(e) => setSemtId(e.target.value)}>
            <option value="">Tüm İstanbul</option>
            {(semtler.veri || []).map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </div>
        <label className="flex min-h-[44px] items-center gap-2 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={ucretsiz} onChange={(e) => setUcretsiz(e.target.checked)} />
          Yalnızca ücretsiz
        </label>
        {erisilebilir && <p className="pb-3 text-sm font-semibold text-accent">Erişilebilir mod: erişilemez olduğu bilinen etkinlikler gizli</p>}
      </div>

      {/* Grup etkinlikleri + canlı takvim sohbet alanı */}
      <section aria-labelledby="grup-takvim-baslik" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="grup-takvim-baslik" className="m-0 text-2xl font-bold">
              Grup etkinlikleri ve sohbet
            </h2>
            <p className="mb-0 mt-1 text-sm text-ink-muted">
              Yaklaşan topluluk yürüyüşlerini takviminize ekleyin, rotayı harita uygulamasında açın ve katılımcılarla sohbet edin.
            </p>
          </div>
          <Link to="/gruplar" className="text-sm font-semibold text-accent hover:underline">
            Tüm gruplar →
          </Link>
        </div>

        {gruplar.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Bu filtreye uyan yaklaşan grup etkinliği yok.</p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-12">
            <ul className="m-0 grid list-none content-start gap-3 p-0 lg:col-span-6">
              {gruplar.map((g) => {
                const secili = g.id === seciliGrupId;
                const duraklar = g.rota?.duraklar || [];
                const gMapUrl = googleMapsRotaUrl(duraklar, 'walking');
                const yMapUrl = yandexMapsRotaUrl(duraklar, 'pd');
                return (
                  <li key={g.id}>
                    <article
                      className={`kart border p-4 transition-colors ${
                        secili ? 'border-accent ring-1 ring-accent/30' : 'border-hairline'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Etiket className="bg-accent/12 text-accent">Grup yürüyüşü</Etiket>
                        {g.erisilebilir && (
                          <Etiket className="bg-success/15 text-success">
                            <Accessibility size={12} aria-hidden="true" /> Erişilebilir
                          </Etiket>
                        )}
                        {g.ornek && <Etiket className="bg-warning/15 text-warning">Örnek grup</Etiket>}
                      </div>

                      <h3 className="mb-0 mt-2 font-display text-lg font-bold leading-snug">
                        <Link to={`/grup/${g.id}`} className="text-heading no-underline hover:underline">
                          {g.baslik}
                        </Link>
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={15} aria-hidden="true" />
                          <time dateTime={g.baslangic}>{tarihYaz(g.baslangic)}</time>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={15} aria-hidden="true" />
                          {g.katilimciSayisi} / {g.kapasite}
                        </span>
                        {g.rota?.bulusma && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={15} aria-hidden="true" />
                            {g.rota.bulusma.ad}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          aria-pressed={secili}
                          onClick={() => setSeciliGrupId(g.id)}
                          className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
                            secili ? 'bg-fill text-on-fill' : 'bg-accent/12 text-accent hover:bg-accent/20'
                          }`}
                        >
                          <Simge ad="forum" boyut={15} />
                          <span>Sohbet ({g.mesajSayisi || 0})</span>
                        </button>

                        <TakvimeEkleDugmesi
                          kompakt
                          etkinlik={{
                            id: g.id,
                            baslik: g.baslik,
                            baslangic: g.baslangic,
                            sureDk: 150,
                            aciklama: [g.aciklama, g.rota ? `Rota: ${g.rota.ad}` : ''].filter(Boolean).join('\n'),
                            konum: g.rota?.bulusma ? `${g.rota.bulusma.ad}, İstanbul` : 'İstanbul',
                          }}
                        />

                        {gMapUrl && (
                          <a
                            href={gMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-hairline bg-surface-raised px-2.5 text-[11.5px] font-semibold text-heading no-underline hover:border-accent"
                            title="Rotayı Google Maps'te aç"
                          >
                            Google Maps
                          </a>
                        )}
                        {yMapUrl && (
                          <a
                            href={yMapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-full border border-hairline bg-surface-raised px-2.5 text-[11.5px] font-semibold text-heading no-underline hover:border-accent"
                            title="Rotayı Yandex Maps'te aç"
                          >
                            Yandex Maps
                          </a>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>

            <div className="lg:col-span-6 lg:sticky lg:top-24 lg:self-start">
              {seciliGrup && (
                <GrupSohbet
                  key={seciliGrup.id}
                  grupId={seciliGrup.id}
                  baslik={seciliGrup.baslik}
                  iptal={seciliGrup.durum !== 'aktif'}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {etk.yukleniyor && <IskeletKartlar metin="Etkinlikler yükleniyor…" />}
      {etk.hata && <HataKutusu metin={etk.hata} yenile={etk.yenile} />}
      {etk.veri && (
        <div aria-live="polite">
          {sergiler.length > 0 && (
            <section aria-labelledby="sergi-baslik" className="mt-12">
              <h2 id="sergi-baslik" className="text-2xl font-bold">Şu an süren sergiler</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sergiler.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
              </div>
            </section>
          )}
          <section aria-labelledby="yaklasan-baslik" className="mt-10">
            <h2 id="yaklasan-baslik" className="text-2xl font-bold">Yaklaşan etkinlikler</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {digerleri.map((e) => <EtkinlikKarti key={e.id} e={e} />)}
              {digerleri.length === 0 && <p className="text-ink-muted">Bu seçime uyan etkinlik yok.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
