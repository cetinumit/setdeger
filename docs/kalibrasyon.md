# Deste kalibrasyonu: SetDeğer ↔ Griddy (ScouThink)

Amaç: Griddy'nin 6 bölümdeki 253 kartı nasıl seçtiğini ölçmek ve deste üreticisini, üretilen eller Griddy'ninkilerden ayırt edilemeyecek hale gelene kadar yinelemek.

## Veri

- `kalibrasyon/video.json`: 253 video kartı (bölüm, mevki, kart değeri, güncel değer, kâr, yaş, sezon, lig, maç, zirve değer). Transfermarkt verisiyle zenginleştirildi.
- 66 el (mevki): V1'de 3, V3–V7'de 4 kart. Karşılaştırmada 4 kartlı 55 el kullanılıyor.

## Ölçüm araçları (`docs/kalibrasyon/`, bu klasörde çalıştır)

| Araç | Ne ölçer |
|---|---|
| `fp.py video.json gen.json` | Her elden 33 özellik çıkarır: fiyat seviyesi/aralığı, kâr büyüklüğü/dağılımı, büyüme oranları, "en pahalı batar mı", yaş/sezon/lig çeşitliliği, ünlülük, maç sayısı. Mevki grubu başına (KL/DEF/MID/ATT) Kolmogorov–Smirnov mesafesi verir ve ortalamasını alır. |
| `clf.py gen.json` | Rastgele orman sınıflandırıcısı Griddy elini bizimkinden ayırmaya çalışır (5 katlı çapraz doğrulama, 20 tekrar). AUC 0,5 = ayırt edilemez. Bizi ele veren özellikleri de sıralar. |
| `floor.py gen.json` | Adil karşılaştırma: tutulan bir Griddy bölümü ile bizim tek bir oyunumuz, Griddy'nin öbür 4 bölümüne ne kadar uzak? |

Deste dökümü: `EXPORT=gen.json N=300 npx vitest run src/export.test.ts`. Gerçek kullanımdaki gibi tekrar önleme açıktır (son 10 oyunun geçmişi). `NOAVOID=1` kapatır.

## Griddy'nin seçim mantığı (ölçülen)

- Mevki içinde fiyatlar birbirine yakın (fiyat aralığı ort. fiyatın %30–55'i), kâr farkı büyük.
- En pahalı kart ellerin %71'inde zarar ediyor (19 elde kâr ediyor, ör. Declan Rice 2018-19, Dembélé 2021-22). En ucuz kart ellerin %66'sında kâr ediyor. Kural değil, eğilim.
- Kâr edenlerin değeri 1,07 ile 5 kat arasında artmış (medyan 1,87 kat), zarar edenler ortalama yarıya inmiş. Sabit bir kat kuralı yok.
- Yaşlar dar (mevki içi 3–5 yaş), sezonlar yakın (ort. 2,5–3 yıl önce), oyuncular düzenli oynamış (elin en az maçı 24–35).
- Hücum ellerinde en az bir gerçekten tanınan oyuncu (zirve ≥ 40M) her zaman var.
- Rastgele seçen takım 6 bölümün hepsinde artıda bitiyor (+7…+25M).
- Griddy oyuncu tekrarından kaçmıyor: 219 farklı oyuncunun 32'si birden fazla bölümde var (Mac Allister ve Antony 3 bölümde). Bunların çoğu farklı sezonuyla (Caicedo 2021-22 → 2023-24), 10'u aynı sezonuyla geliyor.

## Yinelemeler (300 oyun, son 6 oyunun oyuncuları yasak)

| Sürüm | Değişiklik | Ort. KS | AUC |
|---|---|---|---|
| v0.4 | Mevki profilleri (`PROFILE`) | 0,250 | 0,81 |
| t1 | Griddy'nin 66 elinden şablon, eşik tabanlı eşleştirme | 0,223 | 0,69 |
| t3–t5 | Büyüme oranıyla eşleştirme, en yakın 3 aday | 0,221 | — |
| t6 | Deste düzeyi: rastgele takım +8…+28M bandı | 0,225 | 0,73 |
| t8 | Puanlı el araması (kart + el uzaklığı) | 0,215 | 0,62 |
| t11–t12 | "En kolay şablon" yanlılığı kaldırıldı, profil yedeği %1'e indi | **0,212** | **0,63** |
| (denendi, geri alındı) | Ölçeği yukarı kaydırma, daha gevşek kabul eşiği | 0,206–0,211 | 0,65–0,66 |

Önemli ara bulgu: düz rastgele eşleştirme ucuz kartlara kayıyor, çünkü havuzda ucuz ve az kârlı kart çok daha bol. Şablonlar arasında "en iyi tutanı" seçmek de aynı yanlılığı şablon düzeyinde üretiyor: SGB'de tek şablon ellerin %79'unu alıyordu.

## Sonuç

| Ölçüt | Griddy | v0.4 | v0.5 (şimdi) | Tekrar yasağı olmasa |
|---|---|---|---|---|
| Ortalama KS (0 = aynı) | — | 0,250 | 0,212 | 0,184 |
| Ayırt etme AUC (0,5 = ayırt edilemez) | — | 0,81 | 0,63 | 0,52 |
| Rastgele takım medyanı | +19,3M | +12,1M | +17,4M | +20,0M |
| Rastgele takım alt %10 | +6,8M (en kötü bölüm) | −4,7M | +10,1M | +10,9M |
| En pahalı kartın battığı el oranı | %71 | — | %66 | — |
| Mevki içi yaş aralığı, MID/ATT | 3 / 3 | 6 / 5 | 5 / 4 | 5 / 4 |
| Tek oyun ↔ Griddy bölümü (`floor.py`) | 0,477 | 0,481 | 0,460 | — |

Tek bir oyun düzeyinde, bizim bir oyunumuz Griddy'nin öbür bölümlerine Griddy'nin kendi bölümleri kadar yakın. Fark ancak yüzlerce el yan yana konunca görünüyor.

## Kalan fark ve nedeni: tekrar yasağı

Griddy'ye en çok benzeyen eller, havuzdaki az sayıdaki "ünlü, değeri katlanmış" oyuncuya dayanıyor. Örneğin 30–55M arası, değeri 1,6 katına çıkmış forvetlerden havuzda sadece 8 oyuncu var. Son 6 oyunun oyuncuları yasak olunca bunlar tükeniyor ve zor şablonlar daha ucuz olanlara kayıyor. Bizi ele veren özellikler bu yüzden fiyat seviyesi (DEF/MID %15 düşük) ve hücumdaki en büyük kâr (30M, Griddy'de 40M).

| Tekrar yasağı | Ort. KS | AUC | 300 oyunda en sık oyuncu |
|---|---|---|---|
| Yok | 0,184 | 0,52 | — |
| Son 2 oyun | 0,181 | 0,50 | 98 (her 3 oyunda bir) |
| Son 3 oyun | 0,192 | 0,54 | 74 |
| Son 4 oyun | 0,199 | 0,58 | 60 |
| **Son 6 oyun (varsayılan)** | 0,212 | 0,63 | 43 (her 7 oyunda bir) |

## v0.5.1: kart düzeyinde tekrar önleme

Oyuncu yerine kart yasaklanıyor. Griddy de aynı oyuncuyu başka sezonuyla tekrar kullanıyor.
- Aynı kart ve aynı oyuncunun ±1 sezonu son 6 oyunda çıktıysa gelmez.
- Bir önceki oyunda çıkan oyuncu hiçbir sezonuyla gelmez.
- Son 10 oyunda kaç kez çıktıysa her biri için uzaklığa +1,5 eklenir. Böylece aynı yüz her oyunda belirmez.
- Rastgele takım bandı +3…+32M'ye genişletildi; daha az katı.

| Sürüm | Ort. KS | AUC | 300 oyunda en sık oyuncu | Art arda oyunda aynı oyuncu |
|---|---|---|---|---|
| v0.5 (oyuncu 6 oyun yasak) | 0,212 | 0,63 | 43 | yok |
| Sadece kart yasağı, sıklık cezası yok | 0,199 | 0,61 | 118 (Cucurella) | %4,7 |
| **v0.5.1** | 0,207 | 0,62 | 87 | yok |
| Sıklık cezası 3 / 5 | 0,213 / 0,222 | 0,63 / 0,66 | 69 / 66 | yok |

## v0.5.2: yapay zekâ oyuncularla deneme ve yaş düzeltmesi

7 oyun gerçek kullanımdaki gibi art arda üretildi (`SIM=games.json N=7 npx vitest run src/sim.test.ts`). İki yapay zekâ takımı internetsiz, yalnızca isimsiz kartları görerek oynadı. Her biri her mevkide 4 kartı sıraladı, seçim sırayla yapıldı. Jokerler simüle edilmedi.

| Eşleşme | Sonuç |
|---|---|
| Uzman (güçlü model) – Taraftar (hafif model) | 7–0, Uzman oyun başına ort. +241M, Taraftar +115M |
| Uzman – "hep en genci al" | 6–1 |
| Taraftar – "hep en genci al" | 4–3 |
| İki yapay zekâ da – rastgele | 7–0 |

- Uzman 308 kartın %74'ünü doğru tanıdı (ör. 2021-22 Saka, 2019-20 Valverde). Bekler, stoperler, yedek kaleciler ve 2024-25 kartları en zor tanınanlar.
- Taraftar neredeyse hiç kart tanımadı (2 tahmin) ve genç + ucuz kartı seçti.

Bulgu: oyuncuları tanımayan biri "hep en genci al" taktiğiyle de iyi sonuç alıyordu. Bu taktik Griddy'de de işliyor ama bizde daha güçlüydü:

| | Griddy | v0.5.1 | v0.5.2 |
|---|---|---|---|
| En genç kart kâr ediyor | %64 | %70 | %65 |
| "Hep en genç" taktiğinin mükemmel oyuna oranı | %31 | %45 | %39 |
| "Hep en ucuz" taktiğinin mükemmel oyuna oranı | %40 | %22 | %23 |

Düzeltme: yaş daha sıkı eşleşiyor (`AGE_SD`), elin yaş ve fiyat sırası şablondakine benzetiliyor (`AGE_RANK_W`, `RANK_W`). Kalan fark, tekrar önleme altında havuzda kolay karşılanan şablonların biraz daha sık kullanılmasından geliyor.
