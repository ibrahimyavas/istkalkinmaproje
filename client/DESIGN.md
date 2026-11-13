# Proje 404 — Tasarım Sistemi

## Renkler
Tokenlar `src/index.css` içinde RGB kanal üçlüsü olarak tanımlı, `tailwind.config.js` içinde anlamsal adlara bağlı. Bileşenlerde hex renk yazılmaz. Tek istisna: MapLibre katman renkleri (`HaritaGorunumu.jsx`), çünkü CSS değişkenleri harita boyasına geçmiyor.

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| canvas | `#F7F4EE` kâğıt | `#0E1420` gece mavisi | Sayfa zemini |
| surface | `#FFFFFF` | `#151D2D` | Kartlar |
| ink | `#181A21` | `#EEF0F5` | Ana metin |
| accent | `#174C9E` İznik mavisi | `#5EC4D0` turkuaz çini | Düğme, bağlantı, etkin durum |
| lale | `#B02030` | `#F0808C` | Yalnızca şiir çizgisi ve damga |

Kurallar:
- Her tema yalnızca kendi vurgusunu kullanır; iki vurgu aynı öğede karışmaz.
- Durum yalnızca renkle anlatılmaz; her zaman ikon ve metin eşlik eder (erişilebilirlik bilgisi, rozetler).

## Tipografi
- Başlık: **Fraunces** (Türkçe karakter desteği, kültürel ve edebî ton).
- Gövde: **Source Sans 3** (yüksek okunurluk).
- Etiket ve sayılar: **JetBrains Mono**.
- "Büyük yazı" tercihi kök yazı boyutunu %118,75'e çıkarır; tüm ölçüler rem tabanlı olduğu için birlikte büyür.

## Erişilebilirlik
- Dokunma hedefleri en az 44 px; odak halkası 3 px vurgu rengi.
- "İçeriğe geç" bağlantısı, ARIA etiketli anahtarlar, `aria-live` ile değişen rota özeti.
- `prefers-reduced-motion` açıksa animasyonlar kapanır.
