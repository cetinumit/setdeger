# ScouThink (Griddy Game Studios) — 6 bölüm analizi
Bölümler: #1 (mro0Q8qZpWs), #3 (uR6yDvb2rSA), #4 (2zCdCQI2Udo), #5 (U3HPU3c6cYY), #6 (hHCPa6eMsOA), #7 (eByZ58mfG4I).
#2 hiç yayınlanmadı (#3'ün girişinde "ses dosyaları kayboldu" deniyor).
Ham veri: scouthink_kartlar.csv (253 kart; 6 bölüm × 11 mevki).

## Çekirdek oyun (bütün bölümlerde aynı)
- 2 takım (2'şer kişi, kırmızı vs turkuaz). Taş-kağıt-makas (#4'ten sonra "bana bir takım söyle" refleks düellosu) ile ilk seçim hakkı belirleniyor; sonra her mevkide ilk seçen sırayla değişiyor.
- 11 mevki, hep aynı sırayla: KL, SĞB, STP, STP, SLB, DOS, MOS, OOS, SĞK, SLK, SF (4-3-3).
- Her mevkide anonim kartlar (siluet). Kartta: sezon rozeti, DEĞER (o sezonki piyasa değeri), YAŞ (o sezonki), LİG, MAÇ, son satır kalecide "Y.GOL" (yenilen gol), diğerlerinde "G/A" (gol/asist).
- İlk seçen 1 kart alır, sonra diğer takım kalanlardan 1 kart alır. Seçilmeyenler kimsenin olmaz ama onlar da açılır.
- Oyuncu kart değerinden "alınır"; kâr = güncel değer − kart değeri. Bütçe yok. 11 mevki sonunda toplam kârı yüksek olan kazanır.
- Açılış sırası: önce seçilmeyen kartlar, sonra takımların seçimleri (gerilim için). Açılan kartta isim, foto, güncel yaş, güncel değer, köşede kâr rozeti (+14M / −5M / ±0).
- Açılış ekranı: iki takımın saha dizilimi (yüz + kâr etiketi) dolar, takım skoru güncellenir.

## Bölümlere göre kural evrimi
- #1: 3 kart/mevki. Skor kutusu: HARCANAN | KAZANILAN | TOPLAM KAR. Sezon tek yıl (2019).
- #3: 4 kart/mevki, "değerler daha yakın, daha zorlayıcı". Skor sadece toplam kâr.
- #4: Joker geldi (oyunda 1 kez): rakibin yerine oyuncu seçme. Kart altında "blok" görseli (siluet üstünde ⊘) da görülüyor.
- #5: Joker ikiye bölündü, her takımda 2 rozet: "BLOKLA!" ve "RAKİBE SEÇ!" (her biri oyunda 1 kez).
  - RAKİBE SEÇ: o mevkide ilk seçim hakkı sendeyken kullanılır; kendin seçmek yerine rakibin hangi kartı alacağını sen seçersin (sonra sen kalanlardan seçersin).
  - BLOKLA: rakip kartını seçtikten sonra kullanılır; o kart bloklanır (kimseye gitmez), rakip kalan 3 karttan yeniden seçer.
  - Joker kullanılınca rozet kararır/sönük olur.
- #6: Süre geldi: ilk seçen takım 90 sn, ikinci seçen 30 sn (rakip 90 sn düşünürken o da düşünebiliyor). Sezon formatı "2023-24" oldu. Kartlara 1-4 numara ile hitap ediliyor.
- #7: #6 ile aynı (2 joker + süre).
- Ayrıca: Griddy'nin bu oyunları oynatan mobil uygulaması var (#6 sonunda QR, #7'de premium reklamsız sürüm anlatılıyor).

## Kart tasarımının mantığı (253 kart üzerinden)
- Sezonlar: #1'de 2018–2023, sonra 2019–2025 arası. Bugünden ~1–7 sezon önce.
- Karttaki yaş 18–28, medyan 23 (en sık 22, 24, 23, 25, 21). "Genç yetenek scout'luyorsun" hissi.
- Kart değeri 4–75M, medyan 35M; kalecilerde medyan 18M.
- Aynı mevkideki kartların değerleri birbirine çok yakın (mevki içi değer aralığı medyan 14M; #6–7'de sık sık 4 kartın hepsi aynı değer: SF'de 4×40M, SĞB'de 4×25M, SLK'da 3×50M).
- Ama sonuçlar çok uzak: mevki içi kâr aralığı medyan 65M. Yani "aynı fiyat, kim patladı?" sorusu.
- 4 kartlı bölümlerde 55 mevkinin 35'i tam 2 kârlı + 2 zararlı. Klasik dengeli şablon budur. Sapmalar: 1 artı 2-3 eksi (14 kez), 3 artı 1 eksi (2 kez). ±0 kart da arada bir var.
- Kâr/zarar büyüklüğü hücuma doğru artıyor (ortalama |kâr|: KL 10M, defans 16-21M, orta saha 24-29M, kanat/forvet 23-29M). Yapımcı açıkça söylüyor: "forvet kartlarında oyun dönebilsin diye daha cesur davranıyoruz".
- Lig dağılımı: Premier Lig 83, Serie A 42, Bundesliga 40, LaLiga 39, Ligue 1 21, Eredivisie 13, Liga Portugal 10, birkaç tane Süper Lig/Ligue 2/League One.
- Tuzak tipleri:
  1. Balon: genç yaşta yüksek değer + parlak sezon → çöküş (Dele Alli 64→1, Sancho 45→18, Vlahović 70→32, Antony 75→40, Mudryk 50→0, Kalvin Phillips 50→2.5).
  2. Gizli cevher: düşük/orta değer, ortalama istatistik → patlama (Gabriel 22→75, Dimarco 10→50, Rice 55→120, Guéhi 30→70, Semenyo 28→80, Pacho 35→80).
  3. Yanıltıcı istatistik: az maç ama pahalı (Tonali 8 maç → patladı; Timber 5 maç → patladı), çok gol yiyen kaleci ama iyi (Trafford 62 YG → +20), çok gol atan forvet ama çöktü (Darwin 34 gol → −20).
  4. Etiket karışıklığı: "LİG ONE" (İngiltere 3. lig) ↔ Ligue 1.
  5. Aynı oyuncu farklı sezonlarla tekrar geliyor (Mac Allister 3 kez, Antony 3, Dele Alli 2, Vlahović 2, Osimhen 2...): kart = oyuncu + sezon anlık görüntüsü.
- Türk izleyici tadı: Süper Lig bağlantılı isimler bilinçli serpiştirilmiş (Zeki Çelik, Kim Min-jae, Ozan Kabak, Merih Demiral, Ferdi Kadıoğlu, Kerem Aktürkoğlu, Kenan Yıldız, Alemdar; güncel kulübü Türkiye olan Osimhen, Singo, Onana, Nübel, Ndidi, Greenwood, Danso).
- Seçilen kartların ortalama kârı (+4 ile +10M) seçilmeyenlerden (−2.8M) iyi: bilgi işe yarıyor ama şans payı büyük.

## Oyuncuların karar verirken kullandığı ipuçları (oyunun "beyni")
- Yaş + sezon → bugünkü yaş, "peak'te mi, düşüşte mi".
- Lig + değer + istatistik → oyuncuyu tanımaya çalışma ("Bu Deklan Rice mı?").
- Lig önyargıları: "Premier Lig balonu", "Hollanda şişirir", "Bundesliga tuzağı".
- Rakibi okuma: rakip neyi seçecek, blok yer miyim, "isim söylemeyelim, bloklar".
- Skor durumu: öndeysen "zararı minimize et", gerideysen "kumar oyna".

## Transfermarkt ile kalibrasyon (havuz üretimi için)
- Kartlar Transfermarkt verisiyle eşleştirildi (246/253 oyuncu bulundu).
- Kart değerleri büyük çoğunlukla, karttaki yılın içindeki bir Transfermarkt değerlemesiyle birebir aynı. Değerler gerçek; uydurma yok.
- Güncel değerlerin %74'ü veri setindeki son değerle (12.06.2026) birebir aynı. Kalanlar, programın kayıt tarihinde güncellenmiş değerler.
- MAÇ ve G/A satırlarında program tutarsız: bazen yalnızca lig, bazen tüm turnuvalar; yıl etiketi bazen sezonun başlangıç, bazen bitiş yılı. Bazı rakamlar hatalı.
- SetDeger tek ve tutarlı kural kullanıyor:
  - Sezon "2022-23" biçiminde yazılır.
  - Kart değeri = o sezonun (1 Tem – 30 Haz) son Transfermarkt değeri.
  - MAÇ/G/A = o sezon tüm kulüp maçları.
  - Kalecide yenilen gol = sahada olduğu maçlarda takımın yediği gol.
  - Yaş = sezon ortasındaki (1 Ocak) yaşı.
- Havuz filtreleri:
  - Sezon 2018-19 ile 2024-25 arası.
  - Kart yaşı 18–27.
  - Kart değeri 5–80M (kalecide 3–35M).
  - En az 5 maç.
  - Kariyer zirve değeri ≥ 15M.
  - Oyuncu hâlâ aktif.
  - Lig: büyük 5 + Eredivisie + Liga Portugal + Süper Lig.
- Sonuç: 1.398 oyuncu, 4.838 kart.
