# SetDeğer — proje notları (Claude Code için)

Asıl şartname: `MASTER_PROMPT.md`. Bu dosya, projenin şu anki durumunu ve şartnameden sapmaları özetler.

## Durum (v0.1, çalışır sürüm)
- Vite + React 18 + TypeScript. Stil: düz CSS (`src/styles.css`). Tailwind kullanılmadı.
- Oyun motoru `src/engine/` altında, React'ten bağımsız. Testler `src/engine/engine.test.ts`'te; 10 test var: deste kalibrasyonu, joker kenar durumları, skor.
  - `deck.ts`: seed'li deste üretimi (fiyat çapası, denge şablonu, tırmanan risk, çeşitlilik, Türk dokunuşu, gevşetme).
  - `match.ts`: tur/joker durum makinesi (görev kuyruğu; BLOKLA, seçimi yapanın rakibi tarafından kullanılır).
  - `settings.ts`: ön ayarlar (Klasik, İlk Sezon, Hızlı Maç) ve normalizasyon.
- Arayüz `src/ui/` altında: Setup, Duel (yazı-tura / taş-kağıt-makas), Game (sayaç, joker, açılış, ara skor, kadrolar), End, Pitch, CardView.
- Veri: `data/havuz.json` (tam) → `public/havuz.json` (kompakt). Güncellemek için `npm run havuz` çalıştır (Python + pandas gerekir).
- Kalıcılık: `localStorage` (ayarlar, takımlar, devam eden oyun).

## v0.2 değişiklikleri
- Fiyat bandı ayarı (eşit/dar/orta/geniş) kaldırıldı. Deste artık programdan ölçülen mevki profilleriyle (`PROFILE`, deck.ts) üretiliyor: fiyat ve kâr kaleciden forvete büyüyor.
- Tekrar önleme: son 6 oyunda çıkan oyuncular dışlanıyor (oyun kodu elle yazılmadıysa). "Aynı desteyi tekrar oyna" kayıtlı desteyi kullanıyor.

## Şartnameden sapmalar ve varsayımlar
- Blok penceresi 5 değil 10 saniye; aynı ekranda tartışmaya zaman kalsın diye.
- Varsayılan takımlar "Turuncular" ve "Morlar" (8 renklik palet).
- Paylaşım görseli yerine "Sonucu kopyala" butonu var; claude.ai artifact ortamı indirme ve Web Share'e izin vermiyor.
- PWA (manifest/service worker) henüz yok. Artifact ortamında service worker çalışmaz; Vercel/Netlify'a taşınınca eklenmeli.

## Sıradaki işler
1. PWA manifest + offline (kendi hosting'inde).
2. Nasıl Oynanır ekranını görselli slaytlara çevirmek.
3. Paylaşım görseli (canvas → PNG), kendi hosting'inde.
4. Lighthouse kontrolü.
5. Havuzu periyodik güncellemek (`npm run havuz`).

## Komutlar
- `npm install`
- `npm run dev`: geliştirme sunucusu.
- `npm test`: motor testleri.
- `npm run build`: `dist/`, statik ve göreli yollu; her yerde çalışır.
