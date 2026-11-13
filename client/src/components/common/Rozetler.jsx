import React from 'react';
import { AlertTriangle, Accessibility, ArrowUpDown, Footprints, Ban, Toilet, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

/** Doğrulanmamış kayıtlar için açık uyarı etiketi. */
export function DogrulanacakRozet({ dogrulandi, className }) {
  if (dogrulandi) return null;
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning', className)}
      title="Bu kayıt demo içindir; bilgiler başvuru öncesi doğrulanacak."
    >
      <AlertTriangle size={12} aria-hidden="true" /> Doğrulanacak
    </span>
  );
}

export function Etiket({ children, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink-muted', className)}>
      {children}
    </span>
  );
}

const ZEMIN = {
  duz: 'Düz zemin',
  arnavut: 'Arnavut kaldırımı',
  yokus: 'Yokuş',
  merdiven: 'Merdiven',
};

function Satir({ ikon: Ikon, deger, evet, hayir }) {
  const bilinmiyor = deger === null || deger === undefined;
  return (
    <li className="flex items-center gap-2">
      {bilinmiyor ? (
        <HelpCircle size={18} className="text-ink-faint" aria-hidden="true" />
      ) : deger ? (
        <Ikon size={18} className="text-success" aria-hidden="true" />
      ) : (
        <Ban size={18} className="text-danger" aria-hidden="true" />
      )}
      <span>{bilinmiyor ? `${evet}: bilgi yok` : deger ? evet : hayir}</span>
    </li>
  );
}

/** Mekanın erişilebilirlik özeti. Metin + ikon (yalnızca renge dayanmaz). */
export function ErisilebilirlikListesi({ e = {} }) {
  return (
    <div>
      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <Satir ikon={Accessibility} deger={e.rampa} evet="Rampa var" hayir="Rampa yok" />
        <Satir ikon={ArrowUpDown} deger={e.asansor} evet="Asansör var" hayir="Asansör yok" />
        <Satir ikon={Toilet} deger={e.wc} evet="WC var" hayir="WC yok" />
        <Satir ikon={Footprints} deger={e.basamak === null || e.basamak === undefined ? null : !e.basamak} evet="Basamaksız giriş" hayir="Girişte basamak var" />
      </ul>
      {e.zemin && <p className="mt-2 text-sm text-ink-muted">Zemin: {ZEMIN[e.zemin] || e.zemin}</p>}
      {e.not && <p className="mt-1 text-sm text-ink-muted">{e.not}</p>}
    </div>
  );
}
