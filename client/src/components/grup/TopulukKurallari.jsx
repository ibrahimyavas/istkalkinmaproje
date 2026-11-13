import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const KURALLAR = [
  'Buluşma her zaman rotanın ilk durağında, herkese açık bir yerde yapılır.',
  'İlk kez tanıştığınız kişilerle özel bir mekâna ya da araca binmeyin.',
  'Telefon, adres gibi kişisel bilgilerinizi grup sayfasında paylaşmayın; iletişim bilginizi yalnızca grubu açan kişi görür.',
  'Saygılı olun; taciz, ayrımcılık ve ticari tanıtım yasaktır. Uygunsuz grupları "Bildir" ile iletin.',
  'Acil durumda 112\'yi arayın. Rotadaki her durağın en yakın deprem toplanma alanı rota sayfasında yazar.',
];

export default function TopulukKurallari() {
  return (
    <section aria-labelledby="kurallar" className="rounded-2xl bg-surface-raised p-4">
      <h2 id="kurallar" className="flex items-center gap-2 font-body font-bold"><ShieldCheck size={18} className="text-success" aria-hidden="true" /> Topluluk ve güvenlik kuralları</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
        {KURALLAR.map((k) => <li key={k}>{k}</li>)}
      </ul>
    </section>
  );
}
