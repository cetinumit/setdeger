# SetDeger — Master Prompt (Claude Code için)

Bu dosyayı baştan sona oku, sonra aşağıdaki planı uygula. Bu klasörde hazır veri ve referans dosyaları var; onları kullan, uydurma veri üretme.

## 0. Ne yapıyoruz?

**SetDeger**, aynı telefonda/bilgisayarda iki takımın karşı karşıya oynadığı bir futbol "scouting" oyunu. Her mevkide ekrana isimleri gizli futbolcu kartları gelir. Kartta sadece o oyuncunun **geçmişteki bir sezona** ait bilgileri yazar: o sezonki piyasa değeri, yaşı, ligi, maç sayısı, gol/asisti. Takımlar oyuncuyu o eski fiyattan "alır". Kartlar açıldığında oyuncunun **bugünkü** piyasa değeri ortaya çıkar. **Kâr = güncel değer − kart değeri.** 11 mevki sonunda toplam kârı en yüksek takım kazanır.

Oyunun eğlencesi üç şeyden gelir:
1. Siluetin arkasındaki oyuncuyu tahmin etmek: "2022, 21 yaş, Premier Lig, 38M… bu Caicedo mu?"
2. Oyuncu tanınsa bile bugünkü değerini kestirmek: balon mu, cevher mi?
3. Rakibi okumak: jokerler, sıra avantajı, skor durumuna göre risk almak.

Bu format bir YouTube programından (6 bölüm) analiz edildi. **Onların adını, logosunu ve görsel kimliğini kullanma.** SetDeger kendi adı ve tasarımıyla özgün bir oyun olacak.

## 1. Teknik çerçeve (kesin kararlar)

- **Platform:** Sadece web. Önce mobil (360px genişlikten başlayarak), masaüstünde de düzgün görünecek. Native uygulama yok.
- **Oyun modu:** Aynı ekranda 2 takım (pass-and-play). Sunucu, hesap, online yok.
- **Stack:** Vite + React + TypeScript + Tailwind CSS. Durum yönetimi için Zustand ya da useReducer kullan. Testler Vitest ile. Animasyonlar CSS ya da Framer Motion ile.
- **Kalıcılık:** Ayarlar ve devam eden oyun `localStorage`'a otomatik kaydedilir. Sayfa yenilense de oyun kaldığı yerden sürer.
- **Dağıtım:** Statik build (Vercel/Netlify/GitHub Pages'te çalışsın). PWA manifest ekle; ana ekrana eklenebilsin, çevrimdışı açılabilsin.
- **Dil:** Arayüz tamamen Türkçe. Kodda değişken ve fonksiyon isimleri İngilizce olsun. Para formatı `45M €`, ondalıkta virgül (`1,5M €`).
- **Mimari:** Oyun motoru (deste üretimi, sıra, joker, puan) saf TypeScript modülü olsun (`src/engine/`) ve React'ten bağımsız kalsın. Tamamı birim testli olsun. UI sadece motoru çağırsın.

## 2. Klasördeki dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `data/havuz.json` | **Ana kart havuzu.** 1.398 oyuncudan 4.838 kart (oyuncu + sezon anlık görüntüsü). Kaynak: transfermarkt-datasets (CC0). |
| `tools/havuz_uret.py` | Havuzu yeniden üreten script. `python3 tools/havuz_uret.py --indir --veri ./tm --cikti data/havuz.json` komutu en güncel Transfermarkt verisini indirir. |
| `docs/analiz.md` | Programın 6 bölümünün analizi: kurallar, kart tasarım mantığı, istatistikler. **Oku.** |
| `docs/video_kartlari.csv` | Programda kullanılan 253 kartın tamamı. Kalibrasyon ve test referansı; oyunda içerik olarak kullanılmayacak. |
| `docs/deste_algoritmasi_referans.py` | Deste üretiminin çalışan Python prototipi. TypeScript'e taşınacak. |

`havuz.json` şeması (her kart):
```json
{
  "id": "433177-2021", "oyuncu_id": 433177, "oyuncu": "Bukayo Saka", "oyuncu_ascii": "Bukayo Saka",
  "mevki": "SGK", "alt_mevki": "Right Winger", "sezon": "2021-22",
  "kart_deger": 65.0, "kart_yas": 20, "lig": "Premier Lig",
  "mac": 39, "gol": 11, "asist": 7, "yenilen_gol": null,
  "guncel_deger": 110.0, "guncel_yas": 24, "guncel_kulup": "Arsenal FC", "uyruk": "England",
  "zirve_deger": 150.0, "kar": 45.0, "kar_orani": 0.692,
  "etiketler": []
}
```
Notlar:
- Değerler milyon € cinsinden.
- `mevki` kodları şunlar: KL, SGB, STP, SLB, DOS, MOS, OOS, SGK, SLK, SF. Arayüzde Türkçe karakterle göster: KL, SĞB, STP, SLB, DOS, MOS, OOS, SĞK, SLK, SF.
- Kalecilerde son satır `yenilen_gol` olur, diğer mevkilerde `gol/asist`.
- Üst seviyedeki `veri_tarihi` alanı güncel değerlerin hangi tarihe ait olduğunu söyler. Bunu "Hakkında" ekranında ve oyun sonunda küçük yazıyla göster: "Güncel değerler: Transfermarkt, 12.06.2026".
- JSON'u build sırasında import et ya da `public/` altından fetch et. Uygulama açılırken bir kez yükle ve mevkiye göre indeksle.

## 3. Oyun akışı

### 3.1 Ekranlar
1. **Ana menü:** Yeni Oyun, Devam Et (kayıt varsa), Nasıl Oynanır, Ayarlar, Hakkında.
2. **Yeni oyun:**
   - Takım adları (varsayılan "Kırmızılar" / "Maviler"), takım renkleri (önceden tanımlı paletten seçilir).
   - Kural ön ayarı ve "Gelişmiş ayarlar" (bkz. §5).
   - Oyun kodu (seed): boş bırakılırsa rastgele üretilir. Aynı kod aynı desteleri üretir, böylece arkadaşlar aynı oyunu başka bir cihazda tekrar oynayabilir.
3. **İlk seçim düellosu:** Varsayılan yazı-tura animasyonu. Alternatif olarak taş-kağıt-makas: iki oyuncu sırayla gizli seçim yapar, cihaz el değiştirir. Kazanan ilk mevkide ilk seçim hakkını alır.
4. **Mevki turu** (11 kez, sıra KL, SĞB, STP, STP, SLB, DOS, MOS, OOS, SĞK, SLK, SF):
   - Üstte iki takımın skor kutusu (toplam kâr), joker rozetleri ve sıradaki takımın vurgusu. Ortada N adet anonim kart; altta mevki adı ve sayaç.
   - **İlk seçen** bir kart seçer. Seçim iki adımlıdır: karta dokun, sonra "Onayla". Hemen ardından **ikinci seçen** kalan kartlardan birini seçer.
   - Seçilen kart takım rengine boyanır.
   - Bir sonraki mevkide ilk seçim hakkı diğer takıma geçer (sırayla değişir).
5. **Açılış (reveal):** Herkes seçtikten sonra "Kartları Aç" butonu gelir. Gerilim için şu sırayla açılır:
   1. Seçilmeyen kartlar, tek tek.
   2. İkinci seçenin kartı.
   3. İlk seçenin kartı.

   Her açılışta kart döner. Ön yüzde oyuncunun adı, baş harflerinden avatar, güncel yaşı, güncel değeri, güncel kulübü ve köşede kâr rozeti (`+14M` yeşil, `−5M` kırmızı, `±0` sarı) görünür. Skor kutusu sayarak güncellenir. **Gerçek oyuncu fotoğrafı kullanma**; telif ve kişilik hakkı sorunu var. Baş harf avatarı ve forma rengi temalı bir siluet yeterli.
6. **Saha görünümü:** Her açılıştan sonra iki takımın 4-3-3 dizilimi (yan yana iki mini saha) güncellenir. Her oyuncu küçük bir çip olarak görünür (soyad + kâr). Bloklanan/seçilmeyen kartlar sahaya girmez.
7. **Ara skor:** Defans hattı bittiğinde (5. mevki sonrası) ve orta saha bittiğinde (8. mevki sonrası) kısa bir "ara durum" kartı gösterilir.
8. **Oyun sonu:**
   - Kazanan ve iki takımın toplamları.
   - Her takımın en iyi ve en kötü transferi.
   - "Kaçırılan cevher": seçilmeyen kartlar arasındaki en yüksek kâr.
   - İki takımın tam kadrosu.
   - "Rövanş (aynı kurallar, yeni deste)" ve "Aynı desteyi yeniden oyna" butonları.
   - Paylaşılabilir sonuç görseli (canvas ile PNG üret, Web Share API varsa paylaş).

### 3.2 Aynı ekranda oynama detayları
- Kartlar iki takıma da açık. Bu oyunda gizli bilgi yok; takımlar yüksek sesle tartışır. Bu yüzden cihaz devri gerekmez. Sadece taş-kağıt-makas için "telefonu rakibe ver" ara ekranı var.
- Sıradaki takımın adı ve rengi ekranın üst kenarında büyük bir şeritle gösterilir. Yanlış takımın seçim yapmasını önlemek için onay butonunda takım adı yazar: "Kırmızılar: Onayla".
- Telefon yatay tutulursa kartlar tek sıraya dizilir. Dikey ekranda 2x2 grid olur; 3 kartta 3'lü sıra, 5 kartta 3+2.

## 4. Jokerler (Klasik ön ayarda açık)

Her takımın oyun boyunca **birer kez** kullanabileceği iki jokeri var. Rozetleri skor kutusunun yanında görünür; kullanılınca sönükleşir. Hangi takımın hangi mevkide joker kullandığı kayda geçer ve açılışta ikonla gösterilir.

**RAKİBE SEÇ**
- Sadece o mevkide ilk seçim hakkı sendeyken, seçim yapmadan önce kullanılabilir.
- Kendine kart seçmek yerine rakibin hangi kartı alacağını sen belirlersin.
- Sonra kalan kartlardan kendi kartını sen seçersin.
- Bu mevkide sıra şöyle olur: A (rakip için seçer) → A (kendisi için seçer).

**BLOKLA**
- Rakip bir kart seçip onayladıktan sonra, sıradaki adıma geçilmeden önce kullanılır.
- Ekranda 5 saniyelik "Blokla?" penceresi çıkar, ya da rozete dokunulur.
- Bloklanan kart kimsenin olmaz. Oyundan çıkar ama açılışta ⊘ işaretiyle gösterilir.
- Rakip kalan kartlardan yeniden seçer.
- Hem ilk seçen hem ikinci seçen, rakibinin seçimini bloklayabilir.
- RAKİBE SEÇ ile sana atanan kart da bloklanabilir. Bu durumda kalanlardan kendin seçersin.

Kenar durumları (motor testlerinde mutlaka olsun):
- Her adımda seçilebilir en az 1 kart kalmalı. Jokerler açıkken kart sayısı en az 3 olmalı; ayarlar ekranı bunu zorlar.
- Bir mevkide aynı takım iki jokerini birden kullanabilir, ama aynı jokeri iki kez kullanamaz.
- Blok, bloklanmış kartın yerine seçilen yeni karta tekrar uygulanamaz. Bir mevkide bir seçim en fazla bir kez bloklanır.
- Süre açıksa joker kararı süreyi durdurmaz. Blokla penceresi kendi 5 saniyesini kullanır.

Bunu açık bir durum makinesi olarak modelle. Örnek durumlar: `firstPick`, `blockWindowAfterFirst`, `secondPick`, `blockWindowAfterSecond`, `readyToReveal`, `revealing`, `done`.

## 5. Ayarlanabilir kurallar

**Ön ayarlar:**

| Ön ayar | Kart/mevki | Joker | Süre (ilk/ikinci) | Mevki sayısı |
|---|---|---|---|---|
| **Klasik** (varsayılan) | 4 | RAKİBE SEÇ + BLOKLA | 90 sn / 30 sn | 11 |
| **İlk Sezon** | 3 | Yok | Yok | 11 |
| **Hızlı Maç** | 4 | Sadece BLOKLA | 45 sn / 15 sn | 6 (KL, STP, MOS, OOS, SLK, SF) |

Fiyat bandı ayarı **yok**: mevki içi fiyat farkı ve fiyat seviyesi, programdan ölçülen mevki profillerinden gelir (§6).
| **Özel** | Kullanıcı seçer | | | | |

**Gelişmiş ayarlar** (Özel'de hepsi açık; diğer ön ayarlar burada değiştirilince otomatik olarak "Özel"e geçer):

- **Kart sayısı:** 3 / 4 / 5.
- **Jokerler:** RAKİBE SEÇ açık/kapalı, BLOKLA açık/kapalı. Her biri için kullanım hakkı 1–2.
- **Süre:** Kapalı ya da ilk seçen 30–180 sn, ikinci seçen 10–90 sn.
  - Süre dolarsa varsayılan davranış: kalan kartlardan rastgele seçilir ve "Süre doldu, rastgele seçildi" bildirimi çıkar.
  - Alternatif davranış: "−5M ceza ve rastgele seçim".
- **Mevki sayısı:** 11 (tam kadro) ya da 6 (hızlı).
- **Zorluk:** Oyuncuların ne kadar tanınır olacağını belirler.
  - Kolay: zirve değeri ≥ 40M.
  - Normal: her mevkide en az 2 kart zirve ≥ 40M, diğerleri ≥ 20M.
  - Uzman: zirve ≥ 15M, derin isimler de gelir.
- **Sezon aralığı:** 2018-19 ile 2024-25 arasında, iki uçlu slider.
- **Ligler:** Premier Lig, LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal, Süper Lig (çoklu seçim, en az 3 tanesi seçili olmalı).
- **Tırmanan risk:** Açık/kapalı (varsayılan açık). Açıkken hem kart fiyatları hem kâr/zarar büyüklüğü kaleciden forvete doğru artar (§6 profilleri). Kapalıyken tüm mevkiler orta seviyede olur.
- **Türk dokunuşu:** Açık/kapalı (varsayılan açık). Açıkken her oyunda Süper Lig bağlantılı (`tr_bag`) 2–4 kart dağıtılır.
- **Skor gösterimi:** Sadece toplam kâr, ya da Harcanan / Kazanılan / Toplam.
- **İlk seçim:** Yazı-tura ya da taş-kağıt-makas.

## 6. Deste üretimi (en kritik kısım)

Referans: `docs/deste_algoritmasi_referans.py` ve `docs/analiz.md`. TypeScript'te `src/engine/deck.ts` olarak yaz, **seed'li deterministik RNG** kullan (ör. mulberry32). Bütün oyunun destesi oyun başında tek seferde üretilir ve kaydedilir.

Programdaki 253 karttan ölçülen mevki profilleri. Deste bunlara uymalı:

| Mevki | Kart değeri ort. | Mevki içi fiyat farkı | Ort. \|kâr\| | Mevki içi kâr farkı |
|---|---|---|---|---|
| KL | 15M | ~10M | 10M | ~27M |
| SĞB / SLB | 26M | ~12M | 16–17M | ~44M |
| STP | 33M | ~13M | 16–21M | ~55M |
| DOS | 36M | ~15M | 23M | ~64M |
| MOS | 44M | ~20M | 29M | ~68M |
| OOS | 46M | ~22M | 29M | ~80M |
| SĞK / SLK | 42–45M | ~13M | 23–25M | ~70M |
| SF | 47M | ~10M | 29M | ~80M |

**Ana yöntem: Griddy şablonları (v0.5).** Programdaki 66 elin her biri (fiyat, kâr, yaş, sezon, maç, zirve değer, lig) `src/engine/templates.ts` içinde şablon olarak durur. Bir mevki için:
1. O mevkinin şablonlarından biri rastgele seçilir (aynı oyunda aynı şablon iki kez kullanılmaz), kart sayısına uyarlanır ve fiyatları ±%8 oynatılır.
2. Her şablon kartı için havuzdaki en yakın 6 aday bulunur. Uzaklık: fiyat farkı, büyüme oranı (güncel/kart değeri), yaş, sezon, maç sayısı, zirve değer ve lig.
3. Bu adaylardan 40 kombinasyon denenir. Kart uzaklıklarına el düzeyinde sapma eklenir: göreli fiyat aralığı, en büyük kâr, kâr ortalaması, fiyat ortalaması, sezon ve lig çeşitliliği. En düşük toplam alınır.
4. Şablon yeterince karşılanıyorsa (toplam < 4) kullanılır. Karşılanmıyorsa sıradaki şablona geçilir. Şablonlar arasında "en kolayı" seçilmez; öyle yapınca havuzda karşılığı bol olan ucuz şablonlar eli ele geçiriyor.
5. Hiçbir şablon tutmazsa aşağıdaki `PROFILE` üreticisine düşülür (300 oyunda ~%1).

Yedek yöntem: `PROFILE` tablosu. Her mevki için fiyat çapası aralığı, fiyat bandı aralığı, hedef ortalama |kâr| ve asgari kâr farkı tanımlı. Her mevkide 24'e kadar geçerli kombinasyon toplanır, hedefe en yakın 4 tanesinden biri rastgele seçilir.

**Deste düzeyi:** Griddy'nin 6 oyununda "rastgele seçen takım" hep artıda bitiyor (+7…+25M, medyan +19M). Deste 8 kereye kadar yeniden kurulur ve rastgele takım beklentisi +3…+32M bandına düşen ilk deste alınır.

Ölçüm yöntemi ve sonuçlar: `docs/kalibrasyon.md`.

**Kâr dengesi:** Programda bir mevkideki kartların kâr ortalaması hafif artıdadır (medyan +1,2M, ortalama +2,6M, aralık −6…+22M). Kart başına ortalama +2,4M'dir. Deste de bunu korumalı: mevki ortalaması −7…+14M aralığında kalmalı. Böylece rastgele oynayan takım bile maçı eksi yüzlerde bitirmez.

**Tekrar önleme:** Oyun kodu boş bırakıldıysa (`localStorage`, son 10 oyun): aynı kart ve aynı oyuncunun ±1 sezonu son 6 oyunda çıktıysa gelmez; bir önceki oyunun oyuncuları hiç gelmez; son 10 oyunda sık çıkan oyuncuya ceza puanı eklenir. Oyuncu, en az 2 sezon uzak bir haliyle geri dönebilir (Griddy de böyle yapıyor). Kod elle yazıldıysa dışlama yapılmaz; aynı kod hep aynı desteyi verir.

Genel kurallar:
1. **Değer yakın, sonuç uzak.** Aynı mevkideki kartların değerleri birbirine yakındır, ama kâr farkları büyüktür (yukarıdaki tablo). Tahmin edilmesi gereken şey "aynı fiyat, kim patladı?".
2. **Denge şablonu.** 4 kartlı mevkilerin %64'ünde tam 2 kâr eden ve 2 zarar eden kart vardır. Ağırlıklı rastgele şablon kullan:
   - 4 kart: %65 (2 artı, 2 eksi), %25 (1 artı, 3 eksi), %10 (3 artı, 1 eksi).
   - 3 kart: (1 artı, 2 eksi) ya da (2 artı, 1 eksi).
   - 5 kart: (2 artı, 3 eksi) ya da (3 artı, 2 eksi).
   - |kâr| ≤ 1M olan "±0" kart ara sıra bir eksiğin yerine geçebilir (%10).
3. **Tırmanan risk.** Fiyat ve |kâr| kaleciden forvete büyür (tablo). Maç sona doğru açılır, geriden gelen takımın şansı kalır.
4. **Çeşitlilik.**
   - Her mevkide en az 2 farklı sezon ve 2 farklı lig olmalı.
   - Aynı oyuncu bir oyunda iki kez gelmez (farklı sezonuyla bile).
   - Zorluk ayarına göre en az bir "tanınır" kart bulunur.
5. **Tuzak çeşitleri havuzda etiketli.** `etiketler` alanında `tr_bag` (Süper Lig bağlantılı), `balon`: pahalıydı, çöktü. `cevher`: değeri en az 2 katına çıktı. `az_mac`: pahalı ama az maç oynamış. Deste üretici bir oyunda en az 2 `balon` ve 2 `cevher` bulunmasını tercih etsin; zorunlu değil, puanlamada ağırlık olarak kullansın.
6. **Gevşetme.** Bir mevki için 100 denemede uygun kombinasyon bulunamazsa sırayla gevşet: fiyat bandını 1,5 katına çıkar, büyüklük aralığını genişlet, çeşitlilik kuralını gevşet. Hangi gevşetmenin yapıldığını deste metadatasına yaz (debug için).
7. **Fiyat çapası.** Mevkinin fiyat merkezi havuzdan rastgele değil, profildeki aralıktan çekilir. Böylece desteler silik isimlerle dolmaz.
8. Kartlar mevki içinde karıştırılır.

Mevcut TS uygulaması 60 oyunluk ölçümde şu sonuçları verdi:
- Kart değeri ortalaması kalecide 16M, forvette 46M.
- |kâr| ortalaması kalecide 10M, forvette 28M.
- Mevki içi kâr farkı kalecide 27M, forvette 72M.
- Tekrar önleme açıkken en sık çıkan oyuncu 60 oyunun 11'inde geldi.

**Kalibrasyon testi** (Vitest): 500 seed ile Klasik ayarda deste üret ve şunları doğrula:
- Ellerin %90'ından fazlası bir Griddy şablonuna dayanıyor, 55'ten fazla farklı şablon kullanılıyor, hiçbir şablon %5'i geçmiyor.
- Rastgele takım beklentisinin medyanı +8…+28M.
- Hiç hata yok.
- Mevki içi değer farkı medyanı ≤ 20M.
- (2 artı, 2 eksi) şablonunun oranı %50–80 arasında.
- Kalecide kart değeri ortalaması 11–20M, forvette 40–54M.
- Kalecide |kâr| ortalaması 7–14M, forvette 23–35M.
- Hiçbir destede tekrar eden oyuncu yok.

## 7. Kart tasarımı

**Kapalı kart (ön yüz):**
- Sol üstte eğik rozet içinde sezon (`2022-23`).
- Ortada siluet.
- Altında 5 satırlık tablo: DEĞER `38M €` · YAŞ `21` · LİG `Premier Lig` · MAÇ `37` · G/A `1/1` (kalecide Y.GOL `32`).
- Kartın üstünde küçük sıra numarası (1–4). Böylece takımlar sesli konuşurken "2 numara" diyebilir.

**Seçilmiş kart:** Takım rengine boyanır, köşede takım baş harfi görünür.

**Açılmış kart:** İsim (uzun isimlerde font otomatik küçülür), baş harfli avatar, YAŞ (güncel), DEĞER (güncel), kulüp ve kâr rozeti. Bloklanan kartın üstüne ⊘ işareti gelir.

**Görsel kimlik:**
- SetDeger'e özgü olsun.
- Koyu lacivert/antrasit zemin. Takım renkleri kullanıcı seçimine bağlı; varsayılan kırmızı ve turkuaz olmasın, örneğin turuncu ve mor.
- Okunaklı sans-serif yazı tipi. Rakamlar için tabular-nums.
- Logo: basit tipografik "SetDeğer" yazısı ve bir çizgi grafik/ok ikonu.

## 8. Kabul kriterleri

- [ ] 360×640 ekranda kaydırmadan bir mevki turu oynanabiliyor; kartlar ve iki skor görünüyor.
- [ ] Klasik ön ayarla 11 mevkilik bir oyun baştan sona oynanıyor; yenilenince kaldığı yerden devam ediyor.
- [ ] RAKİBE SEÇ ve BLOKLA, §4'teki tüm kenar durumlarıyla çalışıyor ve testleri var.
- [ ] Süre bitince rastgele seçim yapılıyor; sayaç son 10 saniyede kırmızıya dönüyor ve titreşiyor (`navigator.vibrate` varsa).
- [ ] Açılış sırası: seçilmeyenler → ikinci seçen → ilk seçen. Kâr rozetleri ve skor sayacı animasyonlu.
- [ ] Aynı seed + aynı ayarlar = birebir aynı deste (test var).
- [ ] Kalibrasyon testi (§6) geçiyor.
- [ ] Ayarlardaki her seçenek desteye ve akışa gerçekten yansıyor.
- [ ] Oyun sonu ekranı, istatistikler ve paylaşım görseli çalışıyor.
- [ ] "Hakkında" ekranında veri kaynağı ve tarihi var: "Piyasa değerleri Transfermarkt kaynaklı, transfermarkt-datasets (CC0) üzerinden, {veri_tarihi}".
- [ ] Lighthouse mobil: Performance ≥ 85, Accessibility ≥ 90. PWA kurulabiliyor.
- [ ] `npm run build` hatasız; `npm test` yeşil.

## 9. Çalışma planı

Her aşamanın sonunda çalışan bir şey göster, sonra devam et.

1. **İskelet + motor:**
   - Proje kurulumu.
   - Havuzun yüklenmesi ve tiplerin tanımlanması.
   - Seed'li RNG.
   - `deck.ts` ve kalibrasyon testi.
   - Tur/joker durum makinesi (`match.ts`) ve testleri.
   - Puanlama.
2. **Temel UI:** Ana menü → yeni oyun → yazı-tura → mevki turu (seçim + onay) → basit açılış → oyun sonu. Henüz animasyon yok.
3. **Jokerler + süre:** Rozetler, blok penceresi, RAKİBE SEÇ akışı, sayaç.
4. **Açılış şovu + saha:** Kart çevirme, sıralı açılış, kâr rozetleri, skor sayacı, 4-3-3 mini sahalar, ara skorlar.
5. **Ayarlar + ön ayarlar + kalıcılık:** Tüm §5 seçenekleri, localStorage, devam et.
6. **Cila:**
   - Nasıl Oynanır ekranı (3–4 slaytlık, görselli).
   - Paylaşım görseli.
   - PWA.
   - Ses efektleri (açılabilir/kapatılabilir; kısa "flip" ve "ding" sesleri, kendin sentezle ya da lisanssız kullan).
   - Erişilebilirlik (kontrast, odak halkaları, `aria-live` ile skor duyurusu).

Başlamadan önce bu planı kendi cümlelerinle bir `CLAUDE.md` dosyasına özetle; proje boyunca güncel tut. Bu dokümanda belirsiz kalan bir şey olursa makul bir varsayım yap, `CLAUDE.md`'de "Varsayımlar" başlığı altına yaz ve devam et. Kullanıcıya ancak geri dönüşü zor bir kararda sor.

## 10. Yapma listesi

- Gerçek oyuncu fotoğrafı, kulüp logosu ya da forma görseli kullanma.
- Programın adını, logosunu, sunucu isimlerini ya da renk/yerleşimini birebir kopyalama.
- Havuzda olmayan oyuncu ya da değer uydurma. Yeni veri gerekirse `tools/havuz_uret.py` ile üret.
- Motoru React bileşenlerinin içine gömme.
- Reklam, hesap, analytics ekleme.
