import React, { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Users, KeyRound, Copy, Check } from 'lucide-react';
import { api, hataMesaji } from '../services/api.js';
import { useApi } from '../hooks/useApi.js';
import { useTercihler } from '../context/Tercihler.jsx';
import { grupAnahtariKaydet, sonPlan } from '../lib/yerel.js';
import TopulukKurallari from '../components/grup/TopulukKurallari.jsx';
import { DIL } from '../components/grup/GrupKarti.jsx';

function Alan({ etiket, ipucu, children }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="etiket">{etiket}</label>
      {React.cloneElement(children, { id, 'aria-describedby': ipucu ? `${id}-i` : undefined })}
      {ipucu && <p id={`${id}-i`} className="mt-1 text-xs text-ink-muted">{ipucu}</p>}
    </div>
  );
}

// datetime-local için yerel saatle "YYYY-MM-DDTHH:mm"
const yarin = () => {
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

export default function GrupAcSayfasi() {
  const [params] = useSearchParams();
  const { erisilebilir } = useTercihler();
  const rotalar = useApi(() => api.rotalar(), []);
  const planId = params.get('planId') || null;
  const sonPlanId = sonPlan();
  const [kaynak, setKaynak] = useState(planId ? `plan:${planId}` : params.get('rotaId') ? `rota:${params.get('rotaId')}` : '');
  const [f, setF] = useState({ baslik: '', aciklama: '', rumuz: '', kapasite: 6, baslangic: yarin(), dil: 'tr', erisilebilir, kurallarKabul: false });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, sonuc: null });
  const [kopya, setKopya] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    const [tur, id] = kaynak.split(':');
    setDurum({ gonderiliyor: true, hata: null, sonuc: null });
    try {
      const sonuc = await api.grupAc({
        ...f,
        kapasite: Number(f.kapasite),
        baslangic: new Date(f.baslangic).toISOString(),
        planId: tur === 'plan' ? id : undefined,
        rotaId: tur === 'rota' ? id : undefined,
      });
      grupAnahtariKaydet(sonuc.grup.id, sonuc.yonetimAnahtari);
      setDurum({ gonderiliyor: false, hata: null, sonuc });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), sonuc: null });
    }
  };

  if (durum.sonuc) {
    const { grup, yonetimAnahtari } = durum.sonuc;
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-bold" role="status">Grubun yayında!</h1>
        <p className="mt-2 text-ink-muted">{grup.baslik}</p>
        <div className="kart mt-6 p-5">
          <h2 className="flex items-center gap-2 font-body font-bold"><KeyRound size={18} className="text-accent" aria-hidden="true" /> Yönetim anahtarın</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Bu anahtar bu tarayıcıya kaydedildi. Grubu başka bir cihazdan yönetmek istersen kopyalayıp sakla; bir daha gösterilmeyecek.
          </p>
          <div className="mt-3 flex gap-2">
            <code className="girdi flex-1 select-all overflow-x-auto whitespace-nowrap font-mono text-xs">{yonetimAnahtari}</code>
            <button type="button" className="btn-ikincil" onClick={() => navigator.clipboard?.writeText(yonetimAnahtari).then(() => setKopya(true))}>
              {kopya ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}<span className="sr-only">Kopyala</span>
            </button>
          </div>
        </div>
        <Link to={`/grup/${grup.id}`} className="btn-ana mt-6">Grup sayfasına git</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="eyebrow flex items-center gap-1.5"><Users size={14} aria-hidden="true" /> Gezinti grubu</p>
      <h1 className="mt-1 text-3xl font-bold">Grup aç</h1>

      <form onSubmit={gonder} className="mt-6 grid gap-5" noValidate>
        <fieldset className="kart p-4">
          <legend className="px-1 font-bold">Hangi rota?</legend>
          <div className="mt-2 grid gap-2">
            {(planId || sonPlanId) && (
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl px-2 hover:bg-surface-raised">
                <input type="radio" name="kaynak" value={`plan:${planId || sonPlanId}`} checked={kaynak === `plan:${planId || sonPlanId}`} onChange={(e) => setKaynak(e.target.value)} className="h-5 w-5" />
                <span><strong>Kendi rotam</strong> <span className="text-sm text-ink-muted">(keşfet ekranında oluşturduğun plan)</span></span>
              </label>
            )}
            {(rotalar.veri || []).map((r) => (
              <label key={r.id} className="flex min-h-[44px] items-center gap-3 rounded-xl px-2 hover:bg-surface-raised">
                <input type="radio" name="kaynak" value={`rota:${r.id}`} checked={kaynak === `rota:${r.id}`} onChange={(e) => setKaynak(e.target.value)} className="h-5 w-5" />
                <span>{r.ad}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Alan etiket="Grup başlığı"><input className="girdi" value={f.baslik} onChange={set('baslik')} maxLength={80} placeholder="ör. Cumartesi sabahı Balat yürüyüşü" /></Alan></div>
          <Alan etiket="Tarih ve saat"><input className="girdi" type="datetime-local" value={f.baslangic} onChange={set('baslangic')} /></Alan>
          <Alan etiket="Kişi sınırı (sen dahil)"><input className="girdi" type="number" min="2" max="30" value={f.kapasite} onChange={set('kapasite')} /></Alan>
          <Alan etiket="Grup dili">
            <select className="girdi" value={f.dil} onChange={set('dil')}>
              {Object.entries(DIL).map(([k, ad]) => <option key={k} value={k}>{ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Rumuzun" ipucu="Gerçek adını yazmak zorunda değilsin."><input className="girdi" value={f.rumuz} onChange={set('rumuz')} maxLength={30} autoComplete="nickname" /></Alan>
          <div className="sm:col-span-2">
            <Alan etiket="Açıklama (isteğe bağlı)" ipucu="Tempo, mola, ne getirmeli… Telefon numarası yazma."><textarea className="girdi min-h-[96px]" value={f.aciklama} onChange={set('aciklama')} maxLength={600} /></Alan>
          </div>
          <label className="flex min-h-[44px] items-center gap-3 font-semibold sm:col-span-2">
            <input type="checkbox" className="h-5 w-5" checked={f.erisilebilir} onChange={set('erisilebilir')} />
            Erişilebilir grup (tekerlekli sandalye ve bebek arabasıyla katılınabilir tempo)
          </label>
        </div>

        <TopulukKurallari />
        <label className="flex min-h-[44px] items-center gap-3 font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={f.kurallarKabul} onChange={set('kurallarKabul')} />
          Topluluk ve güvenlik kurallarını okudum, kabul ediyorum.
        </label>

        {durum.hata && <p role="alert" className="font-semibold text-danger">{durum.hata}</p>}
        <div>
          <button type="submit" className="btn-ana" disabled={!kaynak || !f.kurallarKabul || durum.gonderiliyor}>
            <Users size={16} aria-hidden="true" /> {durum.gonderiliyor ? 'Açılıyor…' : 'Grubu aç'}
          </button>
          {!kaynak && <p className="mt-2 text-sm text-ink-muted">Önce bir rota seç.</p>}
        </div>
      </form>
    </div>
  );
}
