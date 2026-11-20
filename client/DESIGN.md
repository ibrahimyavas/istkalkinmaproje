# Proje 404 — Tasarım Sistemi

Kaynak: Claude Design "Proje 404 Preview v2" (`tasarim/` klasörü) ve sade görünüm kuralları (`docs/OTURUM-OZETI.md` §3.2). Son kontrol: 20 Kasım 2026.

## Renkler
Tokenlar `src/index.css` içinde RGB kanal üçlüsü olarak tanımlı (`:root` / `.light` ve `.dark`), `tailwind.config.js` içinde anlamsal adlara bağlı. Koyu tema `html.dark` sınıfıyla açılır.

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| canvas | `#F2F5F9` | `#0B132B` | Sayfa zemini |
| surface | `#FFFFFF` | `#1C2541` | Kartlar, paneller |
| surface-raised | `#F2F5F9` | `#141C36` | İç içe yüzeyler (ton farkı) |
| ink / ink-muted / ink-faint | `#0F172A` / `#475569` / `#64748B` | `#F8FAFC` / `#CBD5E1` / `#94A3B8` | Metin |
| heading, fill | `#0A2540` lacivert | `#F8FAFC` | Başlıklar, koyu dolgu (ikon kutuları, numaralar) |
| navy | `#0A2540` | `#0A2540` | Temadan bağımsız lacivert (üst bant, kahraman, alt bilgi) |
| accent | `#C84B26` kiremit | `#E06A45` | Düğme, bağlantı, etkin durum |
| accent-soft | `#F9EDE9` | `#392F42` | Vurgu zemini (%10), kart üzerine gelme |
| lale | accent ile aynı | accent ile aynı | Şiir çizgisi ve damga (artık ayrı renk değil) |
| success / warning / danger | `#1B8755` / `#B45309` / `#B91C1C` | `#34B27A` / `#FBBF24` / `#F87171` | Durum |
| border, border-subtle, border-strong | `#E2E8F0` … | `#2A3557` … | Yalnızca form alanlarında (`hairline*`) |

Kurallar:
- Bileşenlerde hex renk yazılmaz. Kabul edilen istisnalar:
  - MapLibre katman renkleri (`HaritaGorunumu.jsx`, `IstanbulOsmHarita.jsx`, `IstanbulSvgHarita.jsx`, `lib/vapurRenkleri.js`): CSS değişkenleri harita boyasına geçmiyor. Vapur sayfasındaki Sol/Sağ rozetleri haritadaki pinlerle aynı olsun diye `VAPUR_RENK`'i kullanır (Sol `#174C9E`, Sağ `#C84B26`).
  - Üçüncü taraf marka renkleri (`RotaLinkleri.jsx`: Google/Yandex/Apple Maps; `MuzikOneriKarti.jsx`: YouTube Music/Spotify/Apple Music).
- Durum yalnızca renkle anlatılmaz; her zaman ikon ve metin eşlik eder (erişilebilirlik bilgisi, rozetler).

## Sade görünüm
- Çizgi yok, durağan hâlde gölge yok, gradyan yok; küçük büyük harfli üst etiket yok.
- Yüzeyler ton farkıyla ayrılır: `.kart` → `rounded-[14px] bg-surface`, `.panel` → `rounded-[20px] bg-surface p-5`.
- Düğmeler tam yuvarlak. Seçili olmayan çip ve ikincil düğme: `bg-heading/[.07]`.
- Gölge yalnızca üstte duran katmanlarda (açılır menüler, Keşfet üst kartı, sağ menü rayı).
- Kaydırma çubukları `--kaydirma` / `--kaydirma-ust` tokenlarıyla; koyu zeminde `.kaydirma-koyu`.

## Tipografi
- Başlık (`font-display`): **Plus Jakarta Sans**.
- Gövde (`font-body`): **Inter**, 14 px / 22 px.
- Sayılar ve kodlar (`font-mono`): sistem monospace yazı tipi.
- İkonlar: **Material Symbols Outlined**.
- "Büyük yazı" tercihi (`html.buyuk-yazi`) kök yazı boyutunu %118,75'e çıkarır; rem tabanlı ölçüler birlikte büyür. Düğmesi başlıktan kaldırıldı, tercih kodda duruyor.

## Erişilebilirlik
- Dokunma hedefleri en az 44 px; odak halkası `:focus-visible` ile 2 px vurgu rengi, 2 px boşluk.
- "İçeriğe geç" bağlantısı, ARIA etiketli anahtarlar, `aria-live` ile değişen rota özeti.
- `prefers-reduced-motion` açıksa animasyonlar kapanır.
