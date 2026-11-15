import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Users, MapPin, Languages, Accessibility, Flag, LogOut, Ban, KeyRound, Route as RouteIcon } from 'lucide-react';
import { api, hataMesaji } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { grupAnahtari, katilimId, katilimKaydet, katilimSil } from '../lib/yerel.js';
import Yukleniyor, { HataKutusu } from '../components/common/Yukleniyor.jsx';
import { Etiket } from '../components/common/Rozetler.jsx';
import TopulukKurallari from '../components/grup/TopulukKurallari.jsx';
import { DIL, tarihYaz } from '../components/grup/GrupKarti.jsx';

const HaritaGorunumu = lazy(() => import('../components/harita/HaritaGorunumu.jsx'));

function KatilFormu({ grupId, onKatildi }) {
  const [f, setF] = useState({ rumuz: '', iletisim: '', kurallarKabul: false });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null });
  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null });
    try {
      const s = await api.grubaKatil(grupId, f);
      katilimKaydet(grupId, s.katilimId);
      onKatildi();
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err) });
    }
  };
  return (
    <form onSubmit={gonder} className="grid gap-4" noValidate>
      <div>
        <label htmlFor="k-rumuz" className="etiket">Rumuzun</label>
        <input id="k-rumuz" className="girdi" value={f.rumuz} onChange={(e) => setF({ ...f, rumuz: e.target.value })} maxLength={30} autoComplete="nickname" />
      </div>
      <div>
        <label htmlFor="k-iletisim" className="etiket">İletişim (isteğe bağlı)</label>
        <input id="k-iletisim" className="girdi" value={f.iletisim} onChange={(e) => setF({ ...f, iletisim: e.target.value })} maxLength={120} aria-describedby="k-iletisim-i" />
        <p id="k-iletisim-i" className="mt-1 text-xs text-ink-muted">Yalnızca grubu açan kişi görür; plan değişikliğinde sana ulaşabilsin diye.</p>
      </div>
      <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={f.kurallarKabul} onChange={(e) => setF({ ...f, kurallarKabul: e.target.checked })} />
        Topluluk ve güvenlik kurallarını kabul ediyorum.
      </label>
      {durum.hata && <p role="alert" className="font-semibold text-danger">{durum.hata}</p>}
      <button type="submit" className="btn-ana" disabled={!f.kurallarKabul || durum.gonderiliyor}>
        <Users size={16} aria-hidden="true" /> {durum.gonderiliyor ? 'Katılınıyor…' : 'Gruba katıl'}
      </button>
    </form>
  );
}

function YonetimPaneli({ grupId, anahtar, onDegisti }) {
  const [v, setV] = useState(null);
  const [hata, setHata] = useState(null);
  useEffect(() => {
    api.grupYonetim(grupId, anahtar).then(setV).catch((e) => setHata(hataMesaji(e)));
  }, [grupId, anahtar]);
  if (hata) return <p className="text-sm text-danger">{hata}</p>;
  if (!v) return null;
  const iptal = async () => {
    if (!window.confirm('Grup iptal edilsin mi? Katılımcılar grubu artık listede göremeyecek.')) return;
    await api.grupIptal(grupId, anahtar);
    onDegisti();
  };
  return (
    <section aria-labelledby="yonetim" className="kart border-accent p-5">
      <h2 id="yonetim" className="flex items-center gap-2 font-body text-lg font-bold"><KeyRound size={18} className="text-accent" aria-hidden="true" /> Grubu sen açtın</h2>
      <h3 className="mt-3 text-sm font-semibold">Katılımcılar ve iletişim bilgileri</h3>
      {v.katilimcilar.length === 0 ? <p className="text-sm text-ink-muted">Henüz katılan yok.</p> : (
        <ul className="mt-1 space-y-1 text-sm">
          {v.katilimcilar.map((k) => <li key={k.id}><strong>{k.rumuz}</strong>{k.iletisim ? ` — ${k.iletisim}` : ' — iletişim paylaşmadı'}</li>)}
        </ul>
      )}
      {v.durum === 'aktif' && (
        <button type="button" className="btn-ikincil mt-4 text-danger" onClick={iptal}><Ban size={16} aria-hidden="true" /> Grubu iptal et</button>
      )}
    </section>
  );
}

function Bildir({ grupId }) {
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState('');
  const [tamam, setTamam] = useState(false);
  const [hata, setHata] = useState(null);
  if (tamam) return <p role="status" className="text-sm font-semibold text-success">Bildirimin alındı, inceleyeceğiz.</p>;
  if (!acik) return <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted underline-offset-4 hover:underline" onClick={() => setAcik(true)}><Flag size={14} aria-hidden="true" /> Bu grubu bildir</button>;
  return (
    <form className="grid gap-2" onSubmit={async (e) => {
      e.preventDefault();
      try {
        await api.bildirim({ tur: 'grup', grupId, metin });
        setTamam(true);
      } catch (err) {
        setHata(hataMesaji(err));
      }
    }}>
      <label htmlFor="bildir" className="etiket">Sorun nedir?</label>
      <textarea id="bildir" className="girdi min-h-[80px]" value={metin} onChange={(e) => setMetin(e.target.value)} />
      {hata && <p role="alert" className="text-sm text-danger">{hata}</p>}
      <button type="submit" className="btn-ikincil w-fit">Gönder</button>
    </form>
  );
}

export default function GrupSayfasi() {
  const { id } = useParams();
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.grup(id), [id]);
  const [benimKatilim, setBenimKatilim] = useState(() => katilimId(id));
  const anahtar = grupAnahtari(id);

  const mekanlar = useMemo(() => veri?.rota?.duraklar.map((d, i) => ({ ...d, sira: i + 1 })) || [], [veri]);

  if (yukleniyor) return <Yukleniyor />;
  if (hata) return <HataKutusu metin={hata} yenile={yenile} />;
  const { grup: g, rota, bulusma, katilimEngeli } = veri;

  const ayril = async () => {
    await api.gruptanAyril(id, benimKatilim);
    katilimSil(id);
    setBenimKatilim(null);
    yenile();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav aria-label="Konum" className="text-sm text-ink-muted"><Link to="/gruplar" className="hover:text-ink">Gezinti grupları</Link> <span aria-hidden="true">/</span> {g.baslik}</nav>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {g.durum !== 'aktif' && <Etiket className="bg-danger/15 text-danger">İptal edildi</Etiket>}
        {g.erisilebilir && <Etiket className="bg-accent-soft text-accent"><Accessibility size={12} aria-hidden="true" /> Erişilebilir</Etiket>}
        {g.ornek && <Etiket className="bg-warning/15 text-warning">Örnek grup</Etiket>}
      </div>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{g.baslik}</h1>
      {g.aciklama && <p className="mt-3 max-w-2xl text-lg text-ink-muted">{g.aciklama}</p>}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kart p-4"><dt className="eyebrow flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" /> Ne zaman</dt><dd className="mt-1 font-semibold"><time dateTime={g.baslangic}>{tarihYaz(g.baslangic)}</time></dd></div>
        <div className="kart p-4"><dt className="eyebrow flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" /> Buluşma</dt><dd className="mt-1 font-semibold">{bulusma ? <Link to={`/mekan/${bulusma.id}`} className="hover:underline">{bulusma.ad}</Link> : '—'}</dd></div>
        <div className="kart p-4"><dt className="eyebrow flex items-center gap-1.5"><Users size={14} aria-hidden="true" /> Katılımcı</dt><dd className="mt-1 font-semibold">{g.katilimciSayisi} / {g.kapasite}</dd></div>
        <div className="kart p-4"><dt className="eyebrow flex items-center gap-1.5"><Languages size={14} aria-hidden="true" /> Dil</dt><dd className="mt-1 font-semibold">{DIL[g.dil]}</dd></div>
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {rota && (
            <>
              <Suspense fallback={<Yukleniyor kutu metin="Harita yükleniyor…" yukseklik="h-[320px]" />}>
                <HaritaGorunumu mekanlar={mekanlar} numarali yukseklik="h-[320px]" etiket="Grubun rotası" />
              </Suspense>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{rota.ad}</p>
                <Link to={rota.tur === 'plan' ? `/plan/${rota.id}` : `/rota/${rota.id}`} className="btn-ikincil text-sm"><RouteIcon size={14} aria-hidden="true" /> Rotanın ayrıntıları</Link>
              </div>
              <ol className="list-decimal space-y-1 pl-6 text-sm text-ink-muted">{rota.duraklar.map((d) => <li key={d.id}>{d.ad}</li>)}</ol>
            </>
          )}
          <p className="text-sm text-ink-muted">Katılanlar: {g.katilimcilar.join(', ')}</p>
        </div>

        <div className="space-y-4">
          {anahtar && <YonetimPaneli grupId={id} anahtar={anahtar} onDegisti={yenile} />}
          {!anahtar && (
            <section className="kart p-5" aria-labelledby="katil">
              <h2 id="katil" className="font-body text-lg font-bold">Katıl</h2>
              {benimKatilim ? (
                <div className="mt-2">
                  <p className="font-semibold text-success">Bu gruba katıldın. Buluşma: {bulusma?.ad}.</p>
                  <button type="button" className="btn-ikincil mt-3" onClick={ayril}><LogOut size={16} aria-hidden="true" /> Gruptan ayrıl</button>
                </div>
              ) : katilimEngeli ? (
                <p className="mt-2 font-semibold text-ink-muted">{katilimEngeli}</p>
              ) : (
                <div className="mt-3"><KatilFormu grupId={id} onKatildi={() => { setBenimKatilim(katilimId(id)); yenile(); }} /></div>
              )}
            </section>
          )}
          <TopulukKurallari />
          <Bildir grupId={id} />
        </div>
      </div>
    </div>
  );
}
