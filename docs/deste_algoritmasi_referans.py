#!/usr/bin/env python3
"""
SetDeger deste üretimi — REFERANS PROTOTİP (TypeScript'e taşınacak: src/engine/deck.ts)

Çalıştır:  python3 docs/deste_algoritmasi_referans.py   (klasör kökünden)
300 seed'de: 0 hata, mevki içi fiyat bandı medyanı ~8M, |kâr| kalecide ~5M -> forvette ~18M.

Not: Python'un random modülü kullanıldı; TS'de seed'li mulberry32 gibi bir RNG kullanın.
Aynı seed + aynı ayar = aynı deste olmalı.
"""
import json, random, collections, statistics as st

SLOTS_11 = ['KL', 'SGB', 'STP', 'STP', 'SLB', 'DOS', 'MOS', 'OOS', 'SGK', 'SLK', 'SF']
SLOTS_6 = ['KL', 'STP', 'MOS', 'OOS', 'SLK', 'SF']


def build_deck(pool, n_cards=4, spread=15, seed=None, escalate=True, slots=SLOTS_11,
               famous_min=40, famous_count=2, other_min=20, tries_per_level=100, levels=4,
               anchor_gk=(8, 25), anchor_out=(20, 60)):
    """pool: havuz.json['kartlar'] (lig/sezon filtreleri önceden uygulanmış olmalı)
    Zorluk 'Normal': her mevkide en az famous_count kart zirve_deger >= famous_min,
    diğerleri zirve_deger >= other_min. Kolay: other_min=famous_min=40. Uzman: other_min=15, famous_count=1.
    anchor_*: mevkinin "fiyat çapası" bu aralıktan çekilir (videodaki kart değerleri: KL medyan 18M,
    diğerleri medyan ~35M); böylece desteler 5-10M'lik silik kartlarla dolmaz."""
    rng = random.Random(seed)
    by_pos = collections.defaultdict(list)
    for c in pool:
        by_pos[c['mevki']].append(c)
    used_players, deck, meta = set(), [], []
    for i, pos in enumerate(slots):
        base = 6 if pos == 'KL' else 14
        idx = SLOTS_11.index(pos) if pos in SLOTS_11 else i   # risk, tam kadrodaki sıraya göre tırmanır
        mag = base * (0.6 + 0.08 * idx) if escalate else base
        chosen, relax = None, 0
        for t in range(tries_per_level * levels):
            relax = t // tries_per_level                       # 0..3: gevşetme seviyesi
            band = spread * (1.5 ** relax)
            lo_m, hi_m = 0.35 * mag / (1 + relax), 2.5 * mag * (1 + relax)
            need_diversity = relax < 3
            cands = [c for c in by_pos[pos] if c['oyuncu_id'] not in used_players
                     and c['zirve_deger'] >= other_min]
            lo_a, hi_a = anchor_gk if pos == 'KL' else anchor_out
            anchor = rng.uniform(lo_a, hi_a) if relax < 2 else rng.choice(cands)['kart_deger']
            in_band = [c for c in cands if abs(c['kart_deger'] - anchor) <= band / 2]
            # denge şablonu
            r = rng.random()
            if n_cards == 4:
                n_up = 2 if r < 0.65 else (1 if r < 0.90 else 3)
            elif n_cards == 3:
                n_up = rng.choice([1, 2])
            else:
                n_up = rng.choice([2, 3])
            fits = lambda c: lo_m <= abs(c['kar']) <= hi_m
            ups = [c for c in in_band if c['kar'] > 1 and fits(c)]
            downs = [c for c in in_band if c['kar'] < -1 and fits(c)]
            # %10: bir eksiğin yerine ±0 kart
            zero_slot = rng.random() < 0.10 and n_cards - n_up >= 2
            zeros = [c for c in in_band if abs(c['kar']) <= 1]
            n_down = n_cards - n_up - (1 if zero_slot and zeros else 0)
            if len(ups) < n_up or len(downs) < n_down:
                continue
            pick = rng.sample(ups, n_up) + rng.sample(downs, n_down)
            if zero_slot and zeros:
                pick.append(rng.choice(zeros))
            if len({c['oyuncu_id'] for c in pick}) < n_cards:
                continue
            if need_diversity:
                if len({c['sezon'] for c in pick}) < 2 or len({c['lig'] for c in pick}) < 2:
                    continue
                if sum(c['zirve_deger'] >= famous_min for c in pick) < min(famous_count, n_cards):
                    continue
            chosen = pick
            break
        if chosen is None:
            raise RuntimeError(f'{pos} için deste kurulamadı')
        rng.shuffle(chosen)
        deck.append({'mevki': pos, 'kartlar': chosen})
        meta.append({'mevki': pos, 'gevsetme': relax})
        used_players |= {c['oyuncu_id'] for c in chosen}
    return deck, meta


if __name__ == '__main__':
    pool = json.load(open('data/havuz.json', encoding='utf-8'))['kartlar']
    fails, bands, mags, comp = 0, [], collections.defaultdict(list), collections.Counter()
    for s in range(300):
        try:
            deck, meta = build_deck(pool, seed=s)
        except RuntimeError:
            fails += 1
            continue
        for i, p in enumerate(deck):
            cs = p['kartlar']
            bands.append(max(c['kart_deger'] for c in cs) - min(c['kart_deger'] for c in cs))
            mags[p['mevki'] + str(i)].extend(abs(c['kar']) for c in cs)
            comp[(sum(c['kar'] > 1 for c in cs), sum(c['kar'] < -1 for c in cs))] += 1
    print('hata', fails, '| fiyat bandı medyanı', st.median(bands), 'M')
    print('şablon dağılımı', dict(comp))
    print('ortalama |kâr|', {k: round(st.mean(v), 1) for k, v in mags.items()})
    deck, _ = build_deck(pool, seed=42)
    for p in deck:
        print(p['mevki'], ' | '.join(f"{c['sezon']} {c['kart_deger']}M {c['kart_yas']}y {c['lig']} -> "
                                    f"{c['oyuncu']} {c['guncel_deger']}M ({c['kar']:+})" for c in p['kartlar']))
