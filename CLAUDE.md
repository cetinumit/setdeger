# SetDeğer — proje notları (Claude Code için)

Asıl şartname: `MASTER_PROMPT.md`. Bu dosya, projenin şu anki durumunu ve şartnameden sapmaları özetler.

## Durum (v0.5)
- Vite + React 18 + TypeScript. Stil: düz CSS (`src/styles.css`). Tailwind kullanılmadı.
- Oyun motoru `src/engine/` altında, React'ten bağımsız. Testler `src/engine/engine.test.ts`'te; 11 test var: deste kalibrasyonu, joker kenar durumları, skor.
  - `deck.ts`: seed'li deste üretimi (fiyat çapası, denge şablonu, tırmanan risk, çeşitlilik, Türk dokunuşu, gevşetme).
  - `match.ts`: tur/joker durum makinesi (görev kuyruğu; BLOKLA, seçimi yapanın rakibi tarafından kullanılır).
  - `settings.ts`: ön ayarlar (Klasik, İlk Sezon, Hızlı Maç) ve normalizasyon.
- Arayüz `src/ui/` altında: Setup, Duel (yazı-tura / taş-kağıt-makas), Game (sayaç, joker, açılış, ara skor, kadrolar), End, Pitch, CardView.
- Veri: `data/havuz.json` (tam) → `public/havuz.json` (kompakt). Güncellemek için `npm run havuz` çalıştır (Python + pandas gerekir).
- Kalıcılık: `localStorage` (ayarlar, takımlar, devam eden oyun).

## v0.2 değişiklikleri
- Fiyat bandı ayarı (eşit/dar/orta/geniş) kaldırıldı. Deste artık programdan ölçülen mevki profilleriyle (`PROFILE`, deck.ts) üretiliyor: fiyat ve kâr kaleciden forvete büyüyor.
- Tekrar önleme: son 6 oyunda çıkan oyuncular dışlanıyor (oyun kodu elle yazılmadıysa). "Aynı desteyi tekrar oyna" kayıtlı desteyi kullanıyor.

## v0.3 değişiklikleri
- PWA: `public/manifest.webmanifest`, ikonlar, `public/sw.js` (çevrimdışı). Service worker sadece kendi sitesinde (https, iframe değil) kaydolur.
- Ana menüde "Telefona uygulama olarak ekle" (Android) ve iPhone ipucu, "Arkadaşına gönder" var.
- Yayın: `.github/workflows/deploy.yml`, main'e her push'ta test + build + GitHub Pages. Adres: https://cetinumit.github.io/setdeger/
- Commit'ler sadece Ümit Çetin adına atılır, Co-Authored-By satırı eklenmez.

## v0.4 değişiklikleri
- Kâr dengesi: her mevkideki kartların kâr ortalaması videodaki gibi hafif artıda tutuluyor (kabul −7…+14M, hedef −2…+7M). Kart başına ort. kâr ≈ +2M; rastgele oynayan takım ort. ≈ +20M bitirir. Eskiden ≈ −12M'ydi ve oyunlar −150'lerde bitiyordu.
- Fiyat çapaları yükseltildi: kart değeri ort. KL 16M → SF 44M (video 15 → 47M).

## v0.5 değişiklikleri
- Deste artık Griddy'nin 66 gerçek elinden şablonla üretiliyor (`templates.ts`, `buildSlotTemplate`). Profil üreticisi yedek.
- Deste, rastgele seçen takımın beklentisi +8…+28M bandına düşene kadar (en fazla 8 kez) yeniden kuruluyor.
- Tekrar yasağı son çare dışında hiçbir seviyede delinmiyor.
- Ölçüm araçları `docs/kalibrasyon/`: `fp.py` (parmak izi + KS), `clf.py` (Griddy elini bizimkinden ayırma testi, AUC), `floor.py`. Deste dökümü: `EXPORT=çıktı.json N=300 npx vitest run src/export.test.ts` (`NOAVOID=1` tekrar yasağını kapatır, `W=3` pencereyi değiştirir). Ayrıntı: `docs/kalibrasyon.md`.

## Şartnameden sapmalar ve varsayımlar
- Blok penceresi 5 değil 10 saniye; aynı ekranda tartışmaya zaman kalsın diye.
- Varsayılan takımlar "Turuncular" ve "Morlar" (8 renklik palet).
- Paylaşım görseli yerine "Sonucu kopyala" butonu var; claude.ai artifact ortamı indirme ve Web Share'e izin vermiyor.

## Sıradaki işler
1. Nasıl Oynanır ekranını görselli slaytlara çevirmek.
2. Paylaşım görseli (canvas → PNG), kendi hosting'inde.
3. Lighthouse kontrolü.
4. Havuzu periyodik güncellemek (`npm run havuz`).

## Komutlar
- `npm install`
- `npm run dev`: geliştirme sunucusu.
- `npm test`: motor testleri.
- `npm run build`: `dist/`, statik ve göreli yollu; her yerde çalışır.
