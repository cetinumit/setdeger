import { makeRng, pick, sample, shuffle, type Rng } from './rng';
import { slotsFor } from './settings';
import { seasonStart } from './pool';
import type { Card, Deck, Pool, Pos, Settings, Slot } from './types';

/*
 * Deste üretimi — programın 6 bölümündeki 253 karttan ölçülen mevki profilleri.
 *
 * Programda (video ortalamaları):
 *   mevki | kart değeri ort. | mevki içi değer farkı | |kâr| ort. | mevki içi kâr farkı
 *   KL    | 15M              | ~10M                  | 10M        | ~27M
 *   Bek   | 26M              | ~12M                  | 16-17M     | ~44M
 *   STP   | 33M              | ~13M                  | 16-21M     | ~55M
 *   DOS   | 36M              | ~15M                  | 23M        | ~64M
 *   MOS   | 44M              | ~20M                  | 29M        | ~68M
 *   OOS   | 46M              | ~22M                  | 29M        | ~80M
 *   Kanat | 42-45M           | ~13M                  | 23-25M     | ~70M
 *   SF    | 47M              | ~10M                  | 29M        | ~80M
 * Yani hücuma doğru hem fiyatlar hem kâr/zarar büyüyor; aynı mevkide fiyatlar yakın, sonuçlar uzak.
 *
 * Denge: programda bir mevkideki kartların kâr ortalaması hafif artıda (medyan +1,2M, ort. +2,6M,
 * aralık −6…+22M); kart başına ort. +2,4M. Yani kârlılar ile zararlılar birbirini kabaca dengeler,
 * rastgele oynayan takım bile maçı eksi yüzlerde bitirmez.
 */
export const SLOT_MEAN: [number, number] = [-7, 14];   // kabul edilen mevki ortalaması (M €)
export const SLOT_MEAN_GOAL: [number, number] = [-2, 7]; // hedef bu aralıktan rastgele

export interface PosProfile {
  anchor: [number, number];   // mevkinin fiyat merkezi bu aralıktan çekilir (M €)
  band: [number, number];     // mevki içi en pahalı - en ucuz farkı (rastgele bu aralıkta)
  target: number;             // hedef ortalama |kâr|
  minSpread: number;          // en iyi kart ile en kötü kart arasındaki asgari kâr farkı
}

export const PROFILE: Record<Pos, PosProfile> = {
  KL: { anchor: [9, 22], band: [6, 16], target: 10, minSpread: 15 },
  SGB: { anchor: [20, 38], band: [10, 22], target: 16, minSpread: 25 },
  SLB: { anchor: [20, 38], band: [10, 22], target: 17, minSpread: 25 },
  STP: { anchor: [27, 45], band: [12, 26], target: 19, minSpread: 30 },
  DOS: { anchor: [29, 50], band: [12, 26], target: 23, minSpread: 38 },
  MOS: { anchor: [38, 62], band: [15, 30], target: 28, minSpread: 42 },
  OOS: { anchor: [38, 60], band: [16, 34], target: 29, minSpread: 45 },
  SGK: { anchor: [38, 64], band: [12, 26], target: 24, minSpread: 40 },
  SLK: { anchor: [36, 60], band: [10, 22], target: 25, minSpread: 40 },
  SF: { anchor: [42, 62], band: [10, 26], target: 29, minSpread: 45 },
};

// Tırmanan risk kapalıyken: tüm mevkiler orta seviyede
const FLAT: PosProfile = { anchor: [20, 45], band: [8, 20], target: 20, minSpread: 30 };

interface Diff { otherMin: number; famousMin: number; famousCount: number }
const DIFF: Record<Settings['difficulty'], Diff> = {
  kolay: { otherMin: 35, famousMin: 50, famousCount: 2 },
  normal: { otherMin: 18, famousMin: 40, famousCount: 1 },
  uzman: { otherMin: 12, famousMin: 30, famousCount: 1 },
};

export function filterPool(pool: Pool, s: Settings): Card[] {
  const leagues = new Set(s.leagues);
  return pool.cards.filter(c => {
    const y = seasonStart(c.season);
    return leagues.has(c.league) && y >= s.seasonFrom && y <= s.seasonTo;
  });
}

function upCount(rng: Rng, n: number): number {
  const r = rng();
  if (n === 4) return r < 0.65 ? 2 : r < 0.9 ? 1 : 3;
  if (n === 3) return r < 0.5 ? 1 : 2;
  return r < 0.5 ? 2 : 3;
}

const TRIES_PER_LEVEL = 160;
const CANDIDATES = 24; // her seviyede en fazla bu kadar geçerli kombinasyon toplanır, hedefe en yakını seçilir

export function buildSlot(
  rng: Rng, cands: Card[], pos: Pos, s: Settings, used: Set<number>, avoid: Set<number>, wantTr: boolean,
): Slot {
  const n = s.nCards;
  const d = DIFF[s.difficulty];
  const P = pos === 'KL' ? PROFILE.KL : s.escalate ? PROFILE[pos] : FLAT;
  const all = cands.filter(c => c.pos === pos && !used.has(c.pid));

  for (let relax = 0; relax < 4; relax++) {
    const pool = all.filter(c => (relax < 3 ? c.peak >= d.otherMin : true) && (relax < 2 ? !avoid.has(c.pid) : true));
    if (pool.length < n) continue;
    const widen = 1 + 0.5 * relax;
    const found: { cards: Card[]; score: number }[] = [];
    const goal = P.target * (0.8 + 0.4 * rng()); // her mevkide hedef biraz oynasın
    const meanGoal = SLOT_MEAN_GOAL[0] + rng() * (SLOT_MEAN_GOAL[1] - SLOT_MEAN_GOAL[0]);
    for (let t = 0; t < TRIES_PER_LEVEL && found.length < CANDIDATES; t++) {
      const anchor = relax < 3 ? P.anchor[0] + rng() * (P.anchor[1] - P.anchor[0]) : pick(rng, pool).value;
      const band = (P.band[0] + rng() * (P.band[1] - P.band[0])) * widen;
      const lo = anchor - band / 2, hi = anchor + band / 2;
      const inBand = pool.filter(c => c.value >= lo && c.value <= hi);
      if (inBand.length < n) continue;
      const nUp = upCount(rng, n);
      const zeros = inBand.filter(c => Math.abs(c.profit) <= 1);
      const useZero = rng() < 0.1 && n - nUp >= 2 && zeros.length > 0;
      const nDown = n - nUp - (useZero ? 1 : 0);
      const minMag = 0.25 * P.target / widen, maxMag = 3 * P.target * widen;
      const ok = (c: Card) => Math.abs(c.profit) >= minMag && Math.abs(c.profit) <= maxMag;
      const ups = inBand.filter(c => c.profit > 1 && ok(c));
      const downs = inBand.filter(c => c.profit < -1 && ok(c));
      if (ups.length < nUp || downs.length < nDown) continue;
      const chosen = [...sample(rng, ups, nUp), ...sample(rng, downs, nDown)];
      if (useZero) chosen.push(pick(rng, zeros));
      if (new Set(chosen.map(c => c.pid)).size < n) continue;
      const profits = chosen.map(c => c.profit);
      const spread = Math.max(...profits) - Math.min(...profits);
      if (relax < 2 && spread < P.minSpread) continue;
      const mean = profits.reduce((a, p) => a + p, 0) / n;
      if (relax < 3 && (mean < SLOT_MEAN[0] * widen || mean > SLOT_MEAN[1] * widen)) continue;
      if (relax < 3) {
        if (new Set(chosen.map(c => c.season)).size < 2) continue;
        if (new Set(chosen.map(c => c.league)).size < 2) continue;
        if (chosen.filter(c => c.peak >= d.famousMin).length < Math.min(d.famousCount, n)) continue;
      }
      if (wantTr && relax < 2 && !chosen.some(c => c.tags.includes('tr_bag'))) continue;
      const meanAbs = profits.reduce((a, p) => a + Math.abs(p), 0) / n;
      found.push({ cards: chosen, score: Math.abs(meanAbs - goal) + 1.5 * Math.abs(mean - meanGoal) + Math.max(0, P.minSpread - spread) });
    }
    if (found.length) {
      // en iyi birkaç aday arasından rastgele: hep aynı "mükemmel" kombinasyon gelmesin
      found.sort((a, b) => a.score - b.score);
      const best = pick(rng, found.slice(0, Math.min(4, found.length)));
      return { pos, cards: shuffle(rng, best.cards), relax };
    }
  }
  throw new Error(`${pos} için uygun kart bulunamadı (lig/sezon filtrelerini genişletin)`);
}

/**
 * avoid: son oyunlarda çıkmış oyuncular (tekrar gelmesin diye). Oyun kodu elle girildiyse boş verilir,
 * böylece aynı kod her zaman aynı desteyi üretir.
 */
export function buildDeck(pool: Pool, s: Settings, seed: string, avoid: Set<number> = new Set()): Deck {
  const rng = makeRng(`${seed}|${JSON.stringify(settingsKey(s))}`);
  const cands = filterPool(pool, s);
  const slots = slotsFor(s);
  const used = new Set<number>();
  const trSlots = new Set<number>();
  if (s.turkish) {
    const k = Math.min(slots.length, 2 + Math.floor(rng() * 3));
    const trCount = (p: Pos) => cands.filter(c => c.pos === p && c.tags.includes('tr_bag') && !avoid.has(c.pid)).length;
    const ok = slots.map((_, i) => i).filter(i => slots[i] !== 'KL' && trCount(slots[i]) >= 6);
    sample(rng, ok, Math.min(k, ok.length)).forEach(i => trSlots.add(i));
  }
  const out: Slot[] = slots.map((pos, i) => {
    const slot = buildSlot(rng, cands, pos, s, used, avoid, trSlots.has(i));
    slot.cards.forEach(c => used.add(c.pid));
    return slot;
  });
  return { seed, slots: out, fresh: avoid.size > 0 };
}

/** Desteyi etkileyen ayarlar (aynı seed + aynı ayarlar = aynı deste). */
export function settingsKey(s: Settings) {
  return [s.nCards, s.slots, s.difficulty, s.seasonFrom, s.seasonTo, [...s.leagues].sort(), s.escalate, s.turkish];
}
