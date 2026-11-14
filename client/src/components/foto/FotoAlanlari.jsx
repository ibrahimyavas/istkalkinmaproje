import React, { useId, useRef, useState } from 'react';
import { api, hataMesaji } from '../../services/api.js';
import { fotoHazirla, konumAl } from '../../lib/foto.js';
import Simge from '../common/Simge.jsx';

/**
 * Fotoğraf seçici: seçilen görseli küçültür, önizler. Yükleme `yukle()` ile yapılır.
 * props: deger ({dataUrl}|null), onDegis, etiket
 */
export function FotoSecici({ deger, onDegis, etiket = 'Fotoğraf (isteğe bağlı)' }) {
  const id = useId();
  const girdi = useRef(null);
  const [hata, setHata] = useState(null);
  const [isleniyor, setIsleniyor] = useState(false);

  const sec = async (e) => {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;
    setHata(null);
    setIsleniyor(true);
    try {
      onDegis(await fotoHazirla(dosya));
    } catch (err) {
      setHata(err.message);
    } finally {
      setIsleniyor(false);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="etiket">{etiket}</label>
      <input ref={girdi} id={id} type="file" accept="image/*" capture="environment" onChange={sec} className="sr-only" />
      {deger ? (
        <div className="flex items-center gap-3">
          <img src={deger.dataUrl} alt="Seçilen fotoğrafın önizlemesi" className="h-20 w-28 rounded-lg object-cover" />
          <div className="flex flex-col gap-1 text-xs text-ink-faint">
            <span>{deger.genislik}×{deger.yukseklik} px · konum bilgisi silindi</span>
            <button type="button" onClick={() => onDegis(null)} className="w-fit font-semibold text-accent underline-offset-4 hover:underline">Kaldır</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => girdi.current?.click()} disabled={isleniyor} className="btn-ikincil">
          <Simge ad={isleniyor ? 'progress_activity' : 'add_a_photo'} className={isleniyor ? 'animate-spin' : ''} />
          {isleniyor ? 'Hazırlanıyor…' : 'Fotoğraf seç ya da çek'}
        </button>
      )}
      {hata && <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">{hata}</p>}
    </div>
  );
}

/** Konum paylaşma düğmesi. deger: {lat, lon, dogruluk}|null */
export function KonumPaylas({ deger, onDegis, zorunlu = false }) {
  const [durum, setDurum] = useState({ bekliyor: false, hata: null });
  const al = async () => {
    setDurum({ bekliyor: true, hata: null });
    try {
      onDegis(await konumAl());
      setDurum({ bekliyor: false, hata: null });
    } catch (err) {
      setDurum({ bekliyor: false, hata: err.message });
    }
  };
  return (
    <div>
      <span className="etiket">Konum{zorunlu ? '' : ' (isteğe bağlı)'}</span>
      {deger ? (
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold text-success"><Simge ad="my_location" />Konum eklendi</span>
          <span className="text-xs text-ink-faint">±{Math.round(deger.dogruluk)} m · yalnızca yönetim ekibi görür</span>
          <button type="button" onClick={() => onDegis(null)} className="text-xs font-semibold text-accent">Kaldır</button>
        </p>
      ) : (
        <button type="button" onClick={al} disabled={durum.bekliyor} className="btn-ikincil">
          <Simge ad={durum.bekliyor ? 'progress_activity' : 'my_location'} className={durum.bekliyor ? 'animate-spin' : ''} />
          {durum.bekliyor ? 'Konum alınıyor…' : 'Konumumu ekle'}
        </button>
      )}
      {durum.hata && <p role="alert" className="mt-1.5 text-sm font-semibold text-danger">{durum.hata}</p>}
    </div>
  );
}

/** Mekan sayfasındaki "fotoğraf ekle" formu: moderasyondan sonra galeride görünür. */
export function FotoEkleFormu({ mekanId }) {
  const [foto, setFoto] = useState(null);
  const [f, setF] = useState({ aciklama: '', ad: '', izin: false });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      await api.fotoYukle({ mekanId, dosya: foto.dataUrl, aciklama: f.aciklama, ad: f.ad, izin: f.izin });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[14px] bg-success/10 p-4 font-semibold text-success">
        <Simge ad="check_circle" boyut={20} />Teşekkürler! Fotoğrafınız incelendikten sonra galeride yayınlanacak.
      </p>
    );
  }

  return (
    <form onSubmit={gonder} className="grid gap-4" noValidate>
      <FotoSecici deger={foto} onDegis={setFoto} etiket="Fotoğraf" />
      <div>
        <label htmlFor="foto-aciklama" className="etiket">Kısa açıklama (isteğe bağlı)</label>
        <input id="foto-aciklama" className="girdi" maxLength={200} value={f.aciklama} onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </div>
      <div>
        <label htmlFor="foto-ad" className="etiket">Adınız ya da rumuzunuz (fotoğrafla birlikte yazılır)</label>
        <input id="foto-ad" className="girdi" maxLength={60} value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </div>
      <label className="flex items-start gap-3 text-[13px]">
        <input type="checkbox" className="mt-0.5 h-5 w-5" checked={f.izin} onChange={(e) => setF({ ...f, izin: e.target.checked })} />
        <span>Fotoğrafı ben çektim; yayınlanmasına ve Proje 404'te kullanılmasına izin veriyorum. Fotoğrafta tanınabilir kişiler varsa onların da izni var.</span>
      </label>
      {durum.hata && <p role="alert" className="m-0 font-semibold text-danger">{durum.hata}</p>}
      <div>
        <button type="submit" className="btn-ana" disabled={!foto || !f.izin || durum.gonderiliyor}>
          <Simge ad="upload" />{durum.gonderiliyor ? 'Yükleniyor…' : 'Fotoğrafı gönder'}
        </button>
      </div>
    </form>
  );
}
