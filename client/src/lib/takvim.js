// Google Takvim bağlantısı ve evrensel .ics (Apple Takvim / Outlook) dosya üretimi.

function pad(n) {
  return String(n).padStart(2, '0');
}

function utcStamp(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function gunStamp(date) {
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate());
}

function tarihAraligi({ baslangic, bitis, sureDk }) {
  const ham = String(baslangic || '');
  const tamGun = /^\d{4}-\d{2}-\d{2}$/.test(ham);
  const start = new Date(baslangic);
  if (Number.isNaN(start.getTime())) return null;

  if (tamGun) {
    const endBase = bitis ? new Date(bitis) : new Date(start.getTime());
    const end = new Date(endBase.getTime() + 86400e3);
    return { tamGun: true, startStr: gunStamp(start), endStr: gunStamp(end) };
  }

  let end = bitis ? new Date(bitis) : null;
  if (!end || Number.isNaN(end.getTime()) || end <= start) {
    const dk = Number(sureDk) > 0 ? Number(sureDk) : 120;
    end = new Date(start.getTime() + dk * 60e3);
  }
  return { tamGun: false, startStr: utcStamp(start), endStr: utcStamp(end) };
}

/** Google Takvim "etkinlik oluştur" bağlantısı. */
export function googleTakvimUrl({ baslik, baslangic, bitis, sureDk, aciklama, konum }) {
  const aralik = tarihAraligi({ baslangic, bitis, sureDk });
  if (!aralik) return null;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: baslik || 'Proje 404 Etkinliği',
    dates: `${aralik.startStr}/${aralik.endStr}`,
  });
  if (aciklama) p.set('details', aciklama);
  if (konum) p.set('location', konum);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

function icsKacis(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** RFC 5545 uyumlu .ics takvim içeriği (Apple Takvim, Outlook, Thunderbird). */
export function icsMetni({ id, baslik, baslangic, bitis, sureDk, aciklama, konum, url }) {
  const aralik = tarihAraligi({ baslangic, bitis, sureDk });
  if (!aralik) return null;
  const simdi = utcStamp(new Date());
  const uid = `${(id || 'etkinlik').replace(/[^a-zA-Z0-9_-]/g, '')}@proje404.istanbul`;
  const dtStart = aralik.tamGun ? `DTSTART;VALUE=DATE:${aralik.startStr}` : `DTSTART:${aralik.startStr}`;
  const dtEnd = aralik.tamGun ? `DTEND;VALUE=DATE:${aralik.endStr}` : `DTEND:${aralik.endStr}`;

  const satirlar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Proje 404//Istanbul Etkinlik Takvimi//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${simdi}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsKacis(baslik || 'Proje 404 Etkinliği')}`,
  ];
  if (aciklama) satirlar.push(`DESCRIPTION:${icsKacis(aciklama)}`);
  if (konum) satirlar.push(`LOCATION:${icsKacis(konum)}`);
  if (url) satirlar.push(`URL:${url}`);
  satirlar.push('END:VEVENT', 'END:VCALENDAR');
  return satirlar.join('\r\n');
}

export function icsIndir(etkinlik) {
  const metin = icsMetni(etkinlik);
  if (!metin) return false;
  const blob = new Blob([metin], { type: 'text/calendar;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dosya = String(etkinlik.id || etkinlik.baslik || 'etkinlik')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  a.href = href;
  a.download = `${dosya || 'proje404-etkinlik'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
  return true;
}
