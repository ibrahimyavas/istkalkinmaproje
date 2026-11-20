import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { damgaEkle, damgalariOku, rozetler, ROZET_ESIGI } from '../lib/pasaport.js';
import { yolTarifiUrl, googleMapsRotaUrl, yandexMapsRotaUrl, appleMapsRotaUrl, mesafeYaz } from '../lib/harita.js';
import { googleTakvimUrl, icsMetni } from '../lib/takvim.js';
import SiirKarti from '../components/kultur/SiirKarti.jsx';

describe('pasaport', () => {
  it('aynı mekanı iki kez damgalamaz', () => {
    const d = { mekanId: 'ayasofya', mekanAd: 'Ayasofya', semtId: 'sultanahmet', semtAd: 'S' };
    expect(damgaEkle(d)).toBe(true);
    expect(damgaEkle(d)).toBe(false);
    expect(damgalariOku()).toHaveLength(1);
  });

  it(`semtte ${ROZET_ESIGI} damgada rozet verir`, () => {
    damgaEkle({ mekanId: 'a', semtId: 'balat' });
    const semtler = [{ id: 'balat', ad: 'Balat' }, { id: 'kuzguncuk', ad: 'Kuzguncuk' }];
    expect(rozetler(damgalariOku(), semtler)[0].kazanildi).toBe(false);
    damgaEkle({ mekanId: 'b', semtId: 'balat' });
    const r = rozetler(damgalariOku(), semtler);
    expect(r[0].kazanildi).toBe(true);
    expect(r[1].kazanildi).toBe(false);
  });
});

describe('harita yardımcıları', () => {
  it('yol tarifi bağlantısı koordinat ve modu içerir', () => {
    const url = yolTarifiUrl({ lat: 41, lon: 29 }, { lat: 41.1, lon: 29.1 }, 'transit');
    expect(url).toContain('origin=41.000000,29.000000');
    expect(url).toContain('destination=41.100000,29.100000');
    expect(url).toContain('travelmode=transit');
  });

  it('mesafeyi okunur yazar', () => {
    expect(mesafeYaz(450)).toBe('450 m');
    expect(mesafeYaz(2340)).toBe('2.3 km');
  });

  it('çok duraklı Google, Yandex ve Apple Maps rota linklerini üretir', () => {
    const duraklar = [
      { lat: 41.0086, lon: 28.9802 },
      { lat: 41.0054, lon: 28.9768 },
      { lat: 41.0107, lon: 28.968 },
    ];
    const g = googleMapsRotaUrl(duraklar, 'walking');
    expect(g).toContain('origin=41.008600,28.980200');
    expect(g).toContain('waypoints=41.005400,28.976800');
    expect(g).toContain('destination=41.010700,28.968000');

    const y = yandexMapsRotaUrl(duraklar, 'walking');
    expect(y).toContain('yandex.com.tr/maps/?rtext=41.008600,28.980200~41.005400,28.976800~41.010700,28.968000');
    expect(y).toContain('rtt=pd');

    const a = appleMapsRotaUrl(duraklar, 'walking');
    expect(a).toContain('maps.apple.com/?saddr=41.008600,28.980200');
    expect(a).toContain('+to:41.010700,28.968000');
  });
});

describe('takvim yardımcıları', () => {
  it('Google Takvim bağlantısı ve geçerli .ics çıktısı üretir', () => {
    const etk = {
      id: 'grup-1',
      baslik: 'Balat Yürüyüşü',
      baslangic: '2026-11-21T10:00:00+03:00',
      sureDk: 120,
      konum: 'Balat, Fatih',
      aciklama: 'Sakin tempo',
    };
    const url = googleTakvimUrl(etk);
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('text=Balat+Y');

    const ics = icsMetni(etk);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Balat Yürüyüşü');
    expect(ics).toContain('END:VEVENT');
  });
});

describe('SiirKarti', () => {
  const temel = { id: 's1', sair: 'Şair', baslik: 'Başlık', kaynak: 'https://ornek.org' };

  it('kamu malı şiirin tam metnini gösterir', () => {
    render(<SiirKarti siir={{ ...temel, telifDurumu: 'kamu-mali', gosterim: { tip: 'tam', metin: 'Birinci dize' } }} />);
    expect(screen.getByText('Birinci dize')).toBeInTheDocument();
    expect(screen.getByText('Kamu malı eser')).toBeInTheDocument();
  });

  it('korumalı ve metinsiz şiirde izin uyarısı gösterir, metin göstermez', () => {
    render(<SiirKarti siir={{ ...temel, telifDurumu: 'korumali', gosterim: { tip: 'yok', metin: null } }} />);
    expect(screen.getByText(/telif koruması altında/)).toBeInTheDocument();
    expect(screen.queryByRole('blockquote')).toBeNull();
    expect(screen.queryByRole('button', { name: /Dinle/ })).toBeNull();
  });
});
