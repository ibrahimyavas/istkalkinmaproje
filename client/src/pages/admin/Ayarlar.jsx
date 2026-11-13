import React, { useEffect, useState } from 'react';
import { Save, Sparkles, Map } from 'lucide-react';
import { api, hataMesaji } from '../../services/api.js';
import Yukleniyor from '../../components/common/Yukleniyor.jsx';

const SAGLAYICILAR = [
  ['', 'Bağlı değil'],
  ['anthropic', 'Anthropic (Claude)'],
  ['openai', 'OpenAI'],
  ['google', 'Google (Gemini)'],
  ['openrouter', 'OpenRouter'],
];

export default function Ayarlar() {
  const [mevcut, setMevcut] = useState(null);
  const [f, setF] = useState({ saglayici: '', model: '', aiAnahtar: '', hereAnahtar: '' });
  const [mesaj, setMesaj] = useState(null);

  const yukle = () =>
    api.admin.ayarlar().then((a) => {
      setMevcut(a);
      setF({ saglayici: a.ai.saglayici, model: a.ai.model, aiAnahtar: '', hereAnahtar: '' });
    });
  useEffect(() => {
    yukle();
  }, []);

  const kaydet = async (e) => {
    e.preventDefault();
    setMesaj(null);
    try {
      await api.admin.ayarKaydet({
        ai: { saglayici: f.saglayici, model: f.model, apiAnahtari: f.aiAnahtar },
        here: { apiAnahtari: f.hereAnahtar },
      });
      setMesaj({ tip: 'ok', metin: 'Ayarlar kaydedildi.' });
      yukle();
    } catch (err) {
      setMesaj({ tip: 'hata', metin: hataMesaji(err) });
    }
  };

  const anahtarSil = async (hangi) => {
    await api.admin.ayarKaydet(hangi === 'ai' ? { ai: { apiAnahtari: null } } : { here: { apiAnahtari: null } });
    yukle();
  };

  if (!mevcut) return <Yukleniyor />;

  return (
    <form onSubmit={kaydet} className="grid max-w-2xl gap-6">
      <section className="kart p-5">
        <h2 className="flex items-center gap-2 font-body text-lg font-bold"><Sparkles size={18} className="text-accent" aria-hidden="true" /> Yapay zekâ</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Demo sürümde yapay zekâ kullanılmıyor. Buraya girilen bilgiler ileride rota önerisi ve soru-cevap özellikleri için kullanılacak.
          Anahtar sunucuda saklanır ve tarayıcıya geri gönderilmez.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="saglayici" className="etiket">Sağlayıcı</label>
            <select id="saglayici" className="girdi" value={f.saglayici} onChange={(e) => setF({ ...f, saglayici: e.target.value })}>
              {SAGLAYICILAR.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="model" className="etiket">Model</label>
            <input id="model" className="girdi" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} placeholder="ör. claude-sonnet-5-5" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ai-anahtar" className="etiket">API anahtarı</label>
            <input id="ai-anahtar" type="password" autoComplete="off" className="girdi" value={f.aiAnahtar} onChange={(e) => setF({ ...f, aiAnahtar: e.target.value })}
              placeholder={mevcut.ai.anahtarVar ? `Kayıtlı: ${mevcut.ai.anahtarIpucu} (değiştirmek için yazın)` : 'Henüz anahtar yok'} />
            {mevcut.ai.anahtarVar && <button type="button" className="mt-2 text-sm font-semibold text-danger underline" onClick={() => anahtarSil('ai')}>Kayıtlı anahtarı sil</button>}
          </div>
        </div>
      </section>

      <section className="kart p-5">
        <h2 className="flex items-center gap-2 font-body text-lg font-bold"><Map size={18} className="text-accent" aria-hidden="true" /> HERE (isteğe bağlı yedek)</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Harita ve rotalar kendi OpenStreetMap altyapımızdan gelir. HERE anahtarı girilirse adres arama ve trafik bilgisi için yedek olarak kullanılacak.
        </p>
        <label htmlFor="here-anahtar" className="etiket mt-4">HERE API anahtarı</label>
        <input id="here-anahtar" type="password" autoComplete="off" className="girdi" value={f.hereAnahtar} onChange={(e) => setF({ ...f, hereAnahtar: e.target.value })}
          placeholder={mevcut.here.anahtarVar ? `Kayıtlı: ${mevcut.here.anahtarIpucu} (değiştirmek için yazın)` : 'Henüz anahtar yok'} />
        {mevcut.here.anahtarVar && <button type="button" className="mt-2 text-sm font-semibold text-danger underline" onClick={() => anahtarSil('here')}>Kayıtlı anahtarı sil</button>}
      </section>

      {mesaj && <p role={mesaj.tip === 'hata' ? 'alert' : 'status'} className={`font-semibold ${mesaj.tip === 'hata' ? 'text-danger' : 'text-success'}`}>{mesaj.metin}</p>}
      <div><button type="submit" className="btn-ana"><Save size={16} aria-hidden="true" /> Kaydet</button></div>
    </form>
  );
}
