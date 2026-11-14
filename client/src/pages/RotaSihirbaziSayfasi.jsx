import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, hataMesaji } from '../services/api.js';
import { useTercihler } from '../context/Tercihler.jsx';
import { sonPlanKaydet } from '../lib/yerel.js';
import { MEKAN_TURU } from '../lib/harita.js';
import { TUR_SIMGE } from '../lib/sunum.js';
import Simge from '../components/common/Simge.jsx';

const GUNLER = [1, 2, 3, 4, 5];
// Sunucudaki gunPlanService.VARSAYILAN_TURLER ile aynı; atölye ayrıca seçilir.
const ILGILER = ['miras', 'muze', 'carsi', 'edebiyat', 'sahne', 'mekan', 'film', 'atolye'];

/** Gün sayısına göre şehir geneli rota: gün, ilgi ve erişilebilirlik seçimi. */
export default function RotaSihirbaziSayfasi() {
  const navigate = useNavigate();
  const { erisilebilir: tercih } = useTercihler();
  const [params] = useSearchParams();
  // Ana sayfadaki gün seçici ?gun=N ile gelir.
  const [gun, setGun] = useState(() => (GUNLER.includes(Number(params.get('gun'))) ? Number(params.get('gun')) : 2));
  const [ilgiler, setIlgiler] = useState([]);
  const [erisilebilir, setErisilebilir] = useState(tercih);
  const [olusturuluyor, setOlusturuluyor] = useState(false);
  const [hata, setHata] = useState('');

  const degistir = (t) => setIlgiler((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));

  const olustur = async () => {
    setHata('');
    setOlusturuluyor(true);
    try {
      const plan = await api.planGunluk({ gunSayisi: gun, ilgiler, erisilebilir });
      sonPlanKaydet(plan.id);
      navigate(`/plan/${plan.id}`);
    } catch (e) {
      setHata(hataMesaji(e));
      setOlusturuluyor(false);
    }
  };

  const etiket = 'mb-2 mt-0 text-[13px] font-bold text-ink-faint';

  return (
    <div className="anim-page mx-auto w-full max-w-[760px] flex-1 px-4 py-8 sm:px-8">
      <section className="flex flex-col gap-7 rounded-[20px] bg-surface p-6 sm:p-8">
        <div className="pb-4">
          <h1 className="baslik-nokta m-0 font-display text-2xl font-semibold leading-8">Rota sihirbazı</h1>
          <p className="mb-0 mt-1 text-ink-faint">
            Kaç gün kalacağını söyle; yerleri yakaya ve mesafeye göre günlere bölelim. Her gün yaklaşık 7 saatlik bir yürüyüş ve ziyaret planı olur.
          </p>
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={etiket}>Kaç gün?</legend>
          <div className="flex flex-wrap gap-2">
            {GUNLER.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={gun === g}
                onClick={() => setGun(g)}
                className={gun === g ? 'cip-acik min-w-[64px] justify-center' : 'cip-kapali min-w-[64px] justify-center'}
              >
                {g} gün
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className={etiket}>Neler ilgini çeker? <span className="font-medium normal-case tracking-normal">(seçmezsen atölyeler dışında hepsi)</span></legend>
          <div className="flex flex-wrap gap-2">
            {ILGILER.map((t) => (
              <button key={t} type="button" aria-pressed={ilgiler.includes(t)} onClick={() => degistir(t)} className={ilgiler.includes(t) ? 'cip-acik' : 'cip-kapali'}>
                <Simge ad={ilgiler.includes(t) ? 'check' : TUR_SIMGE[t]} boyut={16} />
                {MEKAN_TURU[t]}
              </button>
            ))}
          </div>
          {ilgiler.includes('atolye') && (
            <p className="mb-0 mt-2 text-xs text-ink-faint">Atölyeler önceden kayıt ister; plandaki saatler yaklaşıktır.</p>
          )}
        </fieldset>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[14px] bg-surface-raised px-4 py-3">
          <input type="checkbox" checked={erisilebilir} onChange={(e) => setErisilebilir(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--success))]" />
          <span>
            <span className="block font-semibold text-heading">Erişilebilir rota</span>
            <span className="block text-xs text-ink-faint">Merdivenli ve dik yokuşlu yerler çıkarılır, yürüme temposu yavaşlatılır.</span>
          </span>
        </label>

        <div>
          <p aria-live="polite" className="mb-2 mt-0 min-h-[18px] text-xs text-accent">{hata}</p>
          <button type="button" onClick={olustur} disabled={olusturuluyor} aria-busy={olusturuluyor} className="btn-ana min-h-[48px] w-full text-sm">
            <Simge ad={olusturuluyor ? 'progress_activity' : 'route'} className={olusturuluyor ? 'animate-spin' : ''} />
            {olusturuluyor ? 'Günler hesaplanıyor…' : `${gun} günlük rotamı oluştur`}
          </button>
          <p className="mb-0 mt-3 text-xs text-ink-faint">
            Kendi yerlerini seçmek istersen <button type="button" onClick={() => navigate('/kesfet')} className="font-semibold text-accent underline-offset-2 hover:underline">Keşfet</button>'ten kart kaydırarak da rota çıkarabilirsin.
          </p>
        </div>
      </section>
    </div>
  );
}
