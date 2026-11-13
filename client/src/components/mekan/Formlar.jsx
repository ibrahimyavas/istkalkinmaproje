import React, { useId, useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { api, hataMesaji } from '../../services/api.js';
import { FotoSecici, KonumPaylas } from '../foto/FotoAlanlari.jsx';

function Alan({ etiket, children, ipucu }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="etiket">{etiket}</label>
      {React.cloneElement(children, { id, 'aria-describedby': ipucu ? `${id}-ipucu` : undefined })}
      {ipucu && <p id={`${id}-ipucu`} className="mt-1 text-xs text-ink-muted">{ipucu}</p>}
    </div>
  );
}

function Basarili({ children }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-xl bg-success/10 p-4 font-semibold text-success">
      <CheckCircle2 size={20} className="shrink-0" aria-hidden="true" /> {children}
    </p>
  );
}

/** Atölye deneyim talebi. Demoda talep admin paneline düşer; ödeme alınmaz. */
export function TalepFormu({ mekan }) {
  const [f, setF] = useState({ ad: '', iletisim: '', kisi: 1, tarihTercihi: '', erisilebilirlikIhtiyaci: '', not: '' });
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      await api.talep({ ...f, kisi: Number(f.kisi), mekanId: mekan.id });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) return <Basarili>Talebiniz alındı. Atölye sizinle iletişime geçecek.</Basarili>;

  return (
    <form onSubmit={gonder} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Alan etiket="Adınız"><input className="girdi" value={f.ad} onChange={set('ad')} required autoComplete="name" /></Alan>
      <Alan etiket="E-posta veya telefon"><input className="girdi" value={f.iletisim} onChange={set('iletisim')} required autoComplete="email" /></Alan>
      <Alan etiket="Kişi sayısı">
        <input className="girdi" type="number" min="1" max={mekan.deneyim?.kapasite || 20} value={f.kisi} onChange={set('kisi')} required />
      </Alan>
      <Alan etiket="Tercih ettiğiniz tarih"><input className="girdi" type="date" value={f.tarihTercihi} onChange={set('tarihTercihi')} /></Alan>
      <div className="sm:col-span-2">
        <Alan etiket="Erişilebilirlik ihtiyacınız (isteğe bağlı)" ipucu="Örneğin: tekerlekli sandalye, işitme cihazı, oturarak çalışma.">
          <input className="girdi" value={f.erisilebilirlikIhtiyaci} onChange={set('erisilebilirlikIhtiyaci')} />
        </Alan>
      </div>
      <div className="sm:col-span-2">
        <Alan etiket="Notunuz (isteğe bağlı)"><textarea className="girdi min-h-[88px]" value={f.not} onChange={set('not')} /></Alan>
      </div>
      {durum.hata && <p role="alert" className="font-semibold text-danger sm:col-span-2">{durum.hata}</p>}
      <div className="sm:col-span-2">
        <button type="submit" className="btn-ana" disabled={durum.gonderiliyor}>
          <Send size={16} aria-hidden="true" /> {durum.gonderiliyor ? 'Gönderiliyor…' : 'Talep gönder'}
        </button>
      </div>
    </form>
  );
}

/**
 * Erişilebilirlik sorunu / yorum bildirimi; isteğe bağlı fotoğraf ve konumla.
 * Mekansız kullanımda (sahadan bildirim) konum zorunludur. Admin onayından sonra yayınlanır;
 * konum hiçbir zaman herkese açık gösterilmez.
 */
export function BildirimFormu({ mekan }) {
  const konumZorunlu = !mekan;
  const [f, setF] = useState({ tur: 'erisilebilirlik', metin: '', ad: '' });
  const [foto, setFoto] = useState(null);
  const [fotoIzin, setFotoIzin] = useState(false);
  const [konum, setKonum] = useState(null);
  const [durum, setDurum] = useState({ gonderiliyor: false, hata: null, tamam: false });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const gonder = async (e) => {
    e.preventDefault();
    if (konumZorunlu && !konum) {
      setDurum({ gonderiliyor: false, hata: 'Sahadan bildirim için konumunuzu ekleyin.', tamam: false });
      return;
    }
    if (foto && !fotoIzin) {
      setDurum({ gonderiliyor: false, hata: 'Fotoğraf için izin kutusunu işaretleyin ya da fotoğrafı kaldırın.', tamam: false });
      return;
    }
    setDurum({ gonderiliyor: true, hata: null, tamam: false });
    try {
      let fotoIdler;
      if (foto) {
        const y = await api.fotoYukle({ mekanId: mekan?.id, dosya: foto.dataUrl, aciklama: 'Bildirim fotoğrafı', ad: f.ad, izin: true, konum: konum || undefined });
        fotoIdler = [y.id];
      }
      await api.bildirim({ ...f, mekanId: mekan?.id, konum: konum || undefined, fotoIdler });
      setDurum({ gonderiliyor: false, hata: null, tamam: true });
    } catch (err) {
      setDurum({ gonderiliyor: false, hata: hataMesaji(err), tamam: false });
    }
  };

  if (durum.tamam) return <Basarili>Teşekkürler! Bildiriminiz incelendikten sonra yayınlanacak.</Basarili>;

  return (
    <form onSubmit={gonder} className="grid gap-4" noValidate>
      <fieldset>
        <legend className="etiket">Bildirim türü</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ['erisilebilirlik', 'Erişilebilirlik sorunu'],
            ['yorum', 'Yorum / öneri'],
            ['hata', 'Yanlış bilgi'],
          ].map(([v, ad]) => (
            <label key={v} className={`btn-ikincil cursor-pointer ${f.tur === v ? 'border-accent text-accent' : ''}`}>
              <input type="radio" name="tur" value={v} checked={f.tur === v} onChange={set('tur')} className="sr-only" />
              {ad}
            </label>
          ))}
        </div>
      </fieldset>
      <Alan etiket="Açıklama" ipucu="Örneğin: 'Ana girişteki rampa kapalı, yan kapı kullanılabiliyor.'">
        <textarea className="girdi min-h-[100px]" value={f.metin} onChange={set('metin')} required />
      </Alan>
      <FotoSecici deger={foto} onDegis={setFoto} />
      {foto && (
        <label className="flex items-start gap-3 text-[13px]">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={fotoIzin} onChange={(e) => setFotoIzin(e.target.checked)} />
          <span>Fotoğrafı ben çektim ve yönetim ekibinin incelemesi için paylaşıyorum.</span>
        </label>
      )}
      <KonumPaylas deger={konum} onDegis={setKonum} zorunlu={konumZorunlu} />
      <Alan etiket="Adınız (isteğe bağlı)"><input className="girdi" value={f.ad} onChange={set('ad')} autoComplete="name" /></Alan>
      {durum.hata && <p role="alert" className="font-semibold text-danger">{durum.hata}</p>}
      <div>
        <button type="submit" className="btn-ana" disabled={durum.gonderiliyor}>
          <Send size={16} aria-hidden="true" /> {durum.gonderiliyor ? 'Gönderiliyor…' : 'Bildir'}
        </button>
      </div>
    </form>
  );
}
