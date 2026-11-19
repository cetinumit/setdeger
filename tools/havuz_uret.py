#!/usr/bin/env python3
"""
SetDeger kart havuzu üreticisi.

Kaynak: transfermarkt-datasets (github.com/dcaribou/transfermarkt-datasets, CC0).
Bir "kart" = oyuncu + geçmiş bir sezon anlık görüntüsü.
  - kart değeri  : o sezonun sonundaki (1 Tem - 30 Haz arasındaki son) Transfermarkt değeri
  - kart yaşı    : sezon ortasındaki (1 Ocak) yaşı
  - lig          : o sezon oynadığı lig (ligin en çok maça çıktığı)
  - maç / G / A  : o sezon tüm kulüp maçları (lig + kupa + Avrupa)
  - yenilen gol  : kaleciler için, sahada olduğu maçlarda takımın yediği gol
  - güncel değer : veri setindeki en son Transfermarkt değeri
  - kâr          : güncel değer - kart değeri

Kullanım:
  python3 havuz_uret.py --veri ./tm --cikti ../data/havuz.json
  (--veri klasöründe players, player_valuations, appearances, games, clubs .csv.gz olmalı;
   yoksa --indir ile R2 aynasından indirilir.)
"""
import argparse, json, os, sys, urllib.request, unicodedata, re
from datetime import date
import pandas as pd

R2 = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/"
DOSYALAR = ["players", "player_valuations", "appearances", "games", "clubs"]

# Videolardaki lig yelpazesi: büyük 5 + Hollanda + Portekiz + Süper Lig
LIGLER = {"GB1": "Premier Lig", "ES1": "LaLiga", "IT1": "Serie A", "L1": "Bundesliga",
          "FR1": "Ligue 1", "NL1": "Eredivisie", "PO1": "Liga Portugal", "TR1": "Süper Lig"}

MEVKI = {"Goalkeeper": "KL", "Right-Back": "SGB", "Centre-Back": "STP", "Left-Back": "SLB",
         "Defensive Midfield": "DOS", "Central Midfield": "MOS", "Attacking Midfield": "OOS",
         "Right Winger": "SGK", "Right Midfield": "SGK", "Left Winger": "SLK",
         "Left Midfield": "SLK", "Centre-Forward": "SF", "Second Striker": "SF"}

# Videolardan çıkarılan eşikler (bkz. analiz.md)
ILK_SEZON, SON_SEZON = 2018, 2024          # kart sezonları 2018-19 ... 2024-25
YAS_MIN, YAS_MAX = 18, 27                    # videoda 18-28, medyan 23
DEGER_MIN, DEGER_MAX = 5e6, 80e6             # videoda 4-75M
KL_DEGER_MIN, KL_DEGER_MAX = 3e6, 35e6
MIN_MAC = 5                                  # 5-8 maçlık "tuzak" kartlar da videoda var
TANINIRLIK_MIN = 15e6                        # kariyer zirve değeri; tanınmayan oyuncu gelmesin


def indir(klasor):
    os.makedirs(klasor, exist_ok=True)
    for f in DOSYALAR:
        hedef = os.path.join(klasor, f + ".csv.gz")
        if not os.path.exists(hedef):
            print("indiriliyor", f, file=sys.stderr)
            urllib.request.urlretrieve(R2 + f + ".csv.gz", hedef)


def ascii_ad(s):
    return unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--veri", default="./tm")
    ap.add_argument("--cikti", default="havuz.json")
    ap.add_argument("--indir", action="store_true")
    a = ap.parse_args()
    if a.indir:
        indir(a.veri)
    p = lambda f: os.path.join(a.veri, f + ".csv.gz")

    pl = pd.read_csv(p("players"))
    pv = pd.read_csv(p("player_valuations"), parse_dates=["date"])
    g = pd.read_csv(p("games"), usecols=["game_id", "season", "competition_id", "competition_type",
                                          "home_club_id", "away_club_id", "home_club_goals", "away_club_goals"])
    apz = pd.read_csv(p("appearances"), usecols=["game_id", "player_id", "player_club_id",
                                                 "goals", "assists", "minutes_played"])
    veri_tarihi = pv.date.max().date().isoformat()

    pl = pl[pl.sub_position.isin(MEVKI.keys())]
    pl = pl[pl.market_value_in_eur.notna() & (pl.market_value_in_eur > 0)]
    pl = pl[pl.last_season >= SON_SEZON + 1]                       # hâlâ aktif
    pl = pl[pl.highest_market_value_in_eur >= TANINIRLIK_MIN]
    pl["dob"] = pd.to_datetime(pl.date_of_birth, errors="coerce")
    pl = pl[pl.dob.notna()]
    ids = set(pl.player_id)

    apz = apz[apz.player_id.isin(ids)].merge(g, on="game_id")
    apz = apz[apz.competition_type != "national_team_competition"]
    apz = apz[(apz.season >= ILK_SEZON) & (apz.season <= SON_SEZON)]
    # kaleci için yenilen gol: oynadığı maçta rakibin attığı
    ev = apz.player_club_id == apz.home_club_id
    apz["yenilen"] = apz.away_club_goals.where(ev, apz.home_club_goals)

    sezon = apz.groupby(["player_id", "season"]).agg(
        mac=("game_id", "count"), gol=("goals", "sum"), asist=("assists", "sum"),
        yenilen=("yenilen", "sum"), dakika=("minutes_played", "sum")).reset_index()
    lig_mac = (apz[apz.competition_type == "domestic_league"]
               .groupby(["player_id", "season", "competition_id"]).size().reset_index(name="n")
               .sort_values("n").drop_duplicates(["player_id", "season"], keep="last"))
    sezon = sezon.merge(lig_mac[["player_id", "season", "competition_id"]], on=["player_id", "season"])
    sezon = sezon[sezon.competition_id.isin(LIGLER.keys())]

    pv = pv[pv.player_id.isin(ids)].sort_values("date")
    kartlar = []
    pvg = dict(tuple(pv.groupby("player_id")))
    plx = pl.set_index("player_id")
    bugun = pd.Timestamp(veri_tarihi)
    for r in sezon.itertuples():
        o = plx.loc[r.player_id]
        bas, son = pd.Timestamp(f"{r.season}-07-01"), pd.Timestamp(f"{r.season + 1}-06-30")
        v = pvg.get(r.player_id)
        if v is None:
            continue
        v = v[(v.date >= bas) & (v.date <= son)]
        if v.empty:
            continue
        kart_deger = float(v.market_value_in_eur.iloc[-1])
        mevki = MEVKI[o.sub_position]
        lo, hi = (KL_DEGER_MIN, KL_DEGER_MAX) if mevki == "KL" else (DEGER_MIN, DEGER_MAX)
        if not (lo <= kart_deger <= hi) or r.mac < MIN_MAC:
            continue
        yas = (pd.Timestamp(f"{r.season + 1}-01-01") - o.dob).days // 365
        if not (YAS_MIN <= yas <= YAS_MAX):
            continue
        guncel = float(o.market_value_in_eur)
        kar = guncel - kart_deger
        oran = kar / kart_deger
        etiket = []
        if oran >= 1.0: etiket.append("cevher")
        if oran <= -0.5 and kart_deger >= 30e6: etiket.append("balon")
        if r.mac < 15 and kart_deger >= 25e6: etiket.append("az_mac")
        tr = (o.country_of_citizenship in ("Turkey", "Türkiye") or r.competition_id == "TR1"
              or o.current_club_domestic_competition_id == "TR1")
        if tr: etiket.append("tr_bag")
        kartlar.append({
            "id": f"{r.player_id}-{r.season}",
            "oyuncu_id": int(r.player_id),
            "oyuncu": o["name"],
            "oyuncu_ascii": ascii_ad(o["name"]),
            "mevki": mevki,
            "alt_mevki": o.sub_position,
            "sezon": f"{r.season}-{str(r.season + 1)[2:]}",
            "kart_deger": round(kart_deger / 1e6, 2),
            "kart_yas": int(yas),
            "lig": LIGLER[r.competition_id],
            "mac": int(r.mac),
            "gol": int(r.gol),
            "asist": int(r.asist),
            "yenilen_gol": int(r.yenilen) if mevki == "KL" else None,
            "guncel_deger": round(guncel / 1e6, 2),
            "guncel_yas": int((bugun - o.dob).days // 365),
            "guncel_kulup": o.current_club_name if isinstance(o.current_club_name, str) else None,
            "uyruk": o.country_of_citizenship if isinstance(o.country_of_citizenship, str) else None,
            "zirve_deger": round(float(o.highest_market_value_in_eur) / 1e6, 2),
            "kar": round(kar / 1e6, 2),
            "kar_orani": round(oran, 3),
            "etiketler": etiket,
        })
    out = {"kaynak": "transfermarkt-datasets (CC0)", "veri_tarihi": veri_tarihi,
           "kural_surumu": 1, "kart_sayisi": len(kartlar), "kartlar": kartlar}
    with open(a.cikti, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    print(f"{len(kartlar)} kart -> {a.cikti} (veri tarihi {veri_tarihi})", file=sys.stderr)


if __name__ == "__main__":
    main()
