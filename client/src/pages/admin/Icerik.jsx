import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { api, hataMesaji } from '../../services/api.js';
import { useApi } from '../../hooks/useApi.js';
import Yukleniyor, { HataKutusu } from '../../components/common/Yukleniyor.jsx';
import { DogrulanacakRozet } from '../../components/common/Rozetler.jsx';

// Demo içerik düzenleyicisi: her kayıt JSON olarak düzenlenir. Postgres
// sürümünde koleksiyon başına alan bazlı formlarla değiştirilecek.
const KOLEKSIYONLAR = [
  ['mekanlar', 'Mekan ve atölyeler'],
  ['etkinlikler', 'Etkinlikler'],
  ['siirler', 'Şiirler'],
  ['rotalar', 'Rotalar'],
  ['dunbugun', 'Dün-Bugün'],
];

const SABLON = {
  mekanlar: { semtId: 'balat', tur: 'atolye', zanaat: 'cini', ad: '', lat: 41.03, lon: 28.95, kisa: '', erisilebilirlik: { rampa: null, asansor: null, wc: null, basamak: null, zemin: 'duz', not: '' }, damgaKodu: '', kaynak: '', dogrulandi: false },
  etkinlikler: { baslik: '', tur: 'atolye', semtId: 'kadikoy', mekanId: '', baslangic: '2026-12-01T18:00:00+03:00', ucretsiz: false, erisilebilir: false, ornek: false },
  siirler: { sair: '', sairOlum: null, baslik: '', yil: null, semtIdler: [], mekanIdler: [], telifDurumu: 'korumali', metin: null, alinti: null, notlar: '', metinDogrulandi: false, kaynak: '' },
  rotalar: { semtId: '', tur: 'hikaye', ad: '', ozet: '', duraklar: [{ mekanId: '', anlatim: '' }] },
  dunbugun: { semtId: '', mekanId: '', baslik: '', eski: { url: null, yil: '', yazar: null, lisans: null, kaynak: null }, yeni: { url: null, yil: '', yazar: null, lisans: null, kaynak: null } },
};

function Duzenleyici({ deger, onKaydet, onIptal }) {
  const [metin, setMetin] = useState(JSON.stringify(deger, null, 2));
  const [hata, setHata] = useState(null);
  const kaydet = async () => {
    let obj;
    try {
      obj = JSON.parse(metin);
    } catch {
      setHata('JSON geçersiz. Virgül ve tırnakları kontrol edin.');
      return;
    }
    try {
      await onKaydet(obj);
    } catch (err) {
      setHata(hataMesaji(err));
    }
  };
  return (
    <div className="mt-3">
      <label className="sr-only" htmlFor="json">Kayıt (JSON)</label>
      <textarea id="json" className="girdi min-h-[320px] font-mono text-xs" value={metin} onChange={(e) => setMetin(e.target.value)} spellCheck={false} />
      {hata && <p role="alert" className="mt-2 font-semibold text-danger">{hata}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-ana py-1.5 text-sm" onClick={kaydet}><Save size={14} aria-hidden="true" /> Kaydet</button>
        <button type="button" className="btn-ikincil py-1.5 text-sm" onClick={onIptal}><X size={14} aria-hidden="true" /> Vazgeç</button>
      </div>
    </div>
  );
}

export default function Icerik() {
  const [k, setK] = useState('mekanlar');
  const [duzenlenen, setDuzenlenen] = useState(null); // id | 'yeni' | null
  const { veri, yukleniyor, hata, yenile } = useApi(() => api.admin.liste(k), [k]);

  const kaydet = async (obj) => {
    if (duzenlenen === 'yeni') await api.admin.olustur(k, obj);
    else await api.admin.guncelle(k, duzenlenen, obj);
    setDuzenlenen(null);
    yenile();
  };

  const sil = async (item) => {
    const ad = item.ad || item.baslik || item.id;
    if (!window.confirm(`"${ad}" kaydı silinsin mi? Bu işlem geri alınamaz.`)) return;
    await api.admin.sil(k, item.id);
    yenile();
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="koleksiyon" className="etiket">Koleksiyon</label>
          <select id="koleksiyon" className="girdi w-60" value={k} onChange={(e) => { setK(e.target.value); setDuzenlenen(null); }}>
            {KOLEKSIYONLAR.map(([v, ad]) => <option key={v} value={v}>{ad}</option>)}
          </select>
        </div>
        <button type="button" className="btn-ana" onClick={() => setDuzenlenen('yeni')}><Plus size={16} aria-hidden="true" /> Yeni kayıt</button>
      </div>
      <p className="mt-2 text-sm text-ink-muted">Demo sürümde değişiklikler sunucunun yerel dosyasına yazılır; Vercel demosunda yeniden başlatmada sıfırlanır.</p>

      {duzenlenen === 'yeni' && <div className="kart mt-4 p-4"><h2 className="font-body font-bold">Yeni kayıt</h2><Duzenleyici deger={SABLON[k]} onKaydet={kaydet} onIptal={() => setDuzenlenen(null)} /></div>}

      {yukleniyor && <Yukleniyor />}
      {hata && <HataKutusu metin={hata} yenile={yenile} />}
      {veri && (
        <ul className="mt-4 space-y-2">
          {veri.map((item) => (
            <li key={item.id} className="kart p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.ad || item.baslik || item.id}</span>
                <span className="font-mono text-xs text-ink-muted">{item.id}</span>
                {'dogrulandi' in item && <DogrulanacakRozet dogrulandi={item.dogrulandi} />}
                <span className="ml-auto flex gap-2">
                  <button type="button" className="btn-ikincil min-h-0 px-2.5 py-1.5" onClick={() => setDuzenlenen(item.id)} aria-label={`${item.ad || item.baslik || item.id} düzenle`}><Pencil size={14} aria-hidden="true" /></button>
                  <button type="button" className="btn-ikincil min-h-0 px-2.5 py-1.5 text-danger" onClick={() => sil(item)} aria-label={`${item.ad || item.baslik || item.id} sil`}><Trash2 size={14} aria-hidden="true" /></button>
                </span>
              </div>
              {duzenlenen === item.id && <Duzenleyici deger={item} onKaydet={kaydet} onIptal={() => setDuzenlenen(null)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
