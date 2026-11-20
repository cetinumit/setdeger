import { makeRng, pick, sample, shuffle, type Rng } from './rng';
import { slotsFor } from './settings';
import { seasonStart } from './pool';
import type { Card, Deck, Pool, Pos, Settings, Slot } from './types';
import { TEMPLATES, type TCard, type Template } from './templates';

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

export function buildSlotProfile(
  rng: Rng, cands: Card[], pos: Pos, s: Settings, used: Set<number>, avoid: Recent, wantTr: boolean,
): Slot {
  const n = s.nCards;
  const d = DIFF[s.difficulty];
  const P = pos === 'KL' ? PROFILE.KL : s.escalate ? PROFILE[pos] : FLAT;
  const all = cands.filter(c => c.pos === pos && !used.has(c.pid));

  // 4. seviye son çare: son oyunlarda çıkan oyuncular ancak başka hiçbir yol kalmazsa gelir
  for (let relax = 0; relax < 5; relax++) {
    const pool = all.filter(c => (relax < 3 ? c.peak >= d.otherMin : true) && (relax < 4 ? !avoided(avoid, c) : true));
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
      return { pos, cards: shuffle(rng, best.cards), relax: Math.min(relax, 3) };
    }
  }
  throw new Error(`${pos} için uygun kart bulunamadı (lig/sezon filtrelerini genişletin)`);
}


/*
 * Şablon yöntemi (varsayılan): Griddy'nin 66 elinden biri şablon seçilir; şablondaki her kart için
 * havuzdan aynı "rolü" oynayan gerçek bir kart bulunur: benzer fiyat, aynı yönde ve benzer büyüklükte kâr,
 * benzer yaş, yakın sezon, benzer tanınırlık, benzer maç sayısı. Elin tamamı ±%12 ölçeklenir ki
 * her oyun şablonun birebir kopyası olmasın. Böylece fiyat-kâr ilişkisi ("pahalı olan batar"), yaş ve
 * sezon yakınlığı, denge gibi Griddy'nin ortak dağılımları kendiliğinden korunur.
 */
const T_PEAK_FAC: Record<Settings['difficulty'], number> = { kolay: 0.8, normal: 0.55, uzman: 0.3 };
const T_PEAK_MIN: Record<Settings['difficulty'], number> = { kolay: 35, normal: 15, uzman: 10 };
const cls = (k: number) => (k > 1 ? 1 : k < -1 ? -1 : 0);

function adaptTemplate(rng: Rng, t: Template, n: number): TCard[] {
  let cards = t.cards.slice();
  while (cards.length > n) {
    // bir kartı at, ama en az bir artı ve bir eksi kalsın
    const i = Math.floor(rng() * cards.length);
    const rest = cards.filter((_, j) => j !== i);
    if (rest.some(c => c.k > 1) && rest.some(c => c.k < -1)) cards = rest;
  }
  while (cards.length < n) {
    const c = pick(rng, cards), f = 0.8 + rng() * 0.4;
    cards = [...cards, { ...c, v: Math.round(c.v * f), k: Math.round(c.k * (0.8 + rng() * 0.4)) }];
  }
  return cards;
}

// Yaş sıkı eşleşir: gevşek olunca kâr eden kartlar Griddy'dekinden genç geliyor ve
// "hep en genci al" taktiği fazla kazandırıyor (Griddy'de kâr eden/zarar eden yaş farkı 0,5 yıl).
const AGE_SD = 2;

/** Bir kartın şablon kartına uzaklığı (≈ standart sapma kareleri toplamı; 0 = birebir). */
function cardDist(c: Card, x: TCard, scale: number, peakMin: number) {
  const v = x.v * scale, k = x.k * scale;
  const dv = (c.value - v) / Math.max(3, 0.15 * v);
  const dr = cls(k) !== 0
    ? (Math.log(Math.max(0.02, c.nowValue / c.value)) - Math.log(Math.max(0.02, (x.v + x.k) / x.v))) / 0.25
    : (c.profit - k) / 3;
  const da = x.a !== null ? (c.age - x.a) / AGE_SD : 0;
  const ds = x.s !== null ? (+c.season.slice(0, 4) - x.s) / 2 : 0;
  const dm = x.m === null ? 0 : x.m >= 15 ? Math.max(0, 0.6 * x.m - c.apps) / 8 : Math.max(0, c.apps - 20) / 8;
  const dp = Math.max(0, peakMin - c.peak) / 8;
  return dv * dv + dr * dr + da * da + 0.5 * ds * ds + dm * dm + dp * dp - (c.league === x.l ? 0.3 : 0);
}

/** Elin bütün olarak şablondan sapması: kart kart yakın olmak yetmiyor, sapmalar birikip
 *  fiyat aralığını açıyor ve en büyük kârı küçültüyor. */
function handDist(cards: Card[], tc: TCard[], scale: number) {
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const rr = (v: number[]) => (Math.max(...v) - Math.min(...v)) / mean(v);
  const d1 = (rr(cards.map(c => c.value)) - rr(tc.map(x => x.v))) / 0.12;
  const pmax = Math.max(...tc.map(x => x.k)) * scale;
  const d2 = (Math.max(...cards.map(c => c.profit)) - pmax) / Math.max(5, 0.2 * Math.abs(pmax));
  const pm = mean(tc.map(x => x.k)) * scale;
  const d3 = (mean(cards.map(c => c.profit)) - pm) / (3 + 0.15 * Math.abs(pm));
  const vm = mean(tc.map(x => x.v)) * scale;
  const d4 = (mean(cards.map(c => c.value)) - vm) / Math.max(2, 0.07 * vm);
  // Sıralar da şablondaki gibi olsun: en genç / en ucuz kart, şablonda da en genç / en ucuz olandır.
  // Yoksa "hep en genci al" gibi tek bir taktik Griddy'dekinden çok daha iyi işliyor.
  const rank = (a: number[]) => a.map(x => a.filter(y => y < x).length + (a.filter(y => y === x).length - 1) / 2);
  const rankGap = (a: number[], b: number[]) => { const ra = rank(a), rb = rank(b); return ra.reduce((t, r, i) => t + (r - rb[i]) ** 2, 0); };
  const d5 = tc.every(x => x.a !== null) ? rankGap(cards.map(c => c.age), tc.map(x => x.a as number)) : 0;
  const d6 = rankGap(cards.map(c => c.value), tc.map(x => x.v));
  const seasons = new Set(cards.map(c => c.season)).size, leagues = new Set(cards.map(c => c.league)).size;
  const order = AGE_RANK_W * d5 + RANK_W * d6;
  return { d: d1 * d1 + d2 * d2 + d3 * d3 + d4 * d4 + order + (seasons < 2 ? 4 : 0) + (leagues < 2 ? 4 : 0), order };
}

/**
 * Şablon eli: Griddy'nin gerçek ellerinden birini seçer ve havuzdan ona en çok benzeyen eli kurar.
 * Her şablon kartı için en yakın birkaç aday bulunur, bunlardan rastgele kombinasyonlar denenir ve
 * kart + el uzaklığı en düşük olan alınır. relax, elin şablondan ne kadar saptığını gösterir.
 */
const RANK_W = 0.5, AGE_RANK_W = 2;
const ACCEPT = 4;
// Şablon ölçeği: aynı Griddy eli her seferinde birebir aynı fiyatlarla gelmesin diye ±%8.
// (Yukarı kaydırmak denendi, 0.98–1.18: benzerlik değişmedi, eşleşme kötüleşti.)
const SCALE: [number, number] = [0.92, 1.08];
const MAX_D = 25; // bundan kötüyse şablonu bırak, profil üreticisine düş

export function buildSlotTemplate(
  rng: Rng, cands: Card[], pos: Pos, s: Settings, used: Set<number>, avoid: Recent, wantTr: boolean, usedT: Set<string>,
): Slot | null {
  const n = s.nCards;
  const tplPos = pos === 'KL' || s.escalate ? pos : pick(rng, ['SGB', 'STP', 'SLB', 'DOS', 'MOS', 'OOS', 'SGK', 'SLK', 'SF'] as Pos[]);
  const list = shuffle(rng, (TEMPLATES[tplPos] ?? []).filter(t => !usedT.has(t.src)));
  const base = cands.filter(c => c.pos === pos && !used.has(c.pid) && !avoided(avoid, c));
  const TOP = 6;
  // Şablonlar arasında "en kolayı" seçmiyoruz: öyle yapınca havuzda karşılığı bol olan birkaç şablon
  // (ucuz ve küçük kârlı olanlar) eli ele geçiriyor. Sıradaki şablon yeterince karşılanabiliyorsa o kullanılır.
  let best: { d: number; fit: number; cards: Card[]; src: string } | null = null;
  for (const t of list.slice(0, 8)) {
    let bestT: { d: number; fit: number; cards: Card[]; src: string } | null = null;
    const tc = adaptTemplate(rng, t, n);
    const scale = SCALE[0] + rng() * (SCALE[1] - SCALE[0]);
    // her şablon kartı için en yakın adaylar (rastgele kırpıntı: hep aynı oyuncu gelmesin)
    const near = tc.map(x => {
      const peakMin = Math.max(T_PEAK_MIN[s.difficulty], x.p * T_PEAK_FAC[s.difficulty]);
      return base
        .filter(c => cls(c.profit) === cls(x.k * scale))
        .map(c => ({ c, d: cardDist(c, x, scale, peakMin) + SEEN_PENALTY * (avoid.seen.get(c.pid) ?? 0) + rng() * 0.4 }))
        .sort((a, b) => a.d - b.d).slice(0, TOP);
    });
    if (near.some(l => !l.length)) continue;
    // Türk dokunuşu: Türk adayı en yakın olan şablon kartı Türk karttan seçilir
    let trIdx = -1;
    if (wantTr) {
      let bd = Infinity;
      tc.forEach((x, i) => {
        const peakMin = Math.max(T_PEAK_MIN[s.difficulty], x.p * T_PEAK_FAC[s.difficulty]);
        for (const c of base) {
          if (!c.tags.includes('tr_bag') || cls(c.profit) !== cls(x.k * scale)) continue;
          const d = cardDist(c, x, scale, peakMin);
          if (d < bd) { bd = d; trIdx = i; near[i] = [{ c, d }]; }
        }
      });
      if (trIdx < 0) continue;
      // yalnızca en iyi Türk eşleşmesi kalsın
      tc.forEach((x, i) => {
        if (i !== trIdx && near[i].length === 1 && near[i][0].c.tags.includes('tr_bag')) {
          const peakMin = Math.max(T_PEAK_MIN[s.difficulty], x.p * T_PEAK_FAC[s.difficulty]);
          near[i] = base.filter(c => cls(c.profit) === cls(x.k * scale))
            .map(c => ({ c, d: cardDist(c, x, scale, peakMin) })).sort((a, b) => a.d - b.d).slice(0, TOP);
        }
      });
    }
    for (let tr = 0; tr < 40; tr++) {
      const cards: Card[] = []; let dSum = 0, ok = true;
      for (const l of near) {
        const opts = l.filter(o => !cards.some(c => c.pid === o.c.pid));
        if (!opts.length) { ok = false; break; }
        const w = opts.map(o => Math.exp(-0.7 * (o.d - opts[0].d)));
        let r = rng() * w.reduce((a, b) => a + b, 0), j = 0;
        while (j < w.length - 1 && (r -= w[j]) > 0) j++;
        cards.push(opts[j].c); dSum += Math.max(0, opts[j].d);
      }
      if (!ok) continue;
      // sıra uyumu en iyi kombinasyonu seçerken sayılır ama şablonu elemek için sayılmaz,
      // yoksa bazı şablonlar hiç karşılanamıyor ve çeşitlilik düşüyor
      const h = handDist(cards, tc, scale);
      const d = dSum / n + h.d;
      if (!bestT || d < bestT.d) bestT = { d, fit: d - h.order, cards, src: t.src };
    }
    if (bestT && (!best || bestT.fit < best.fit)) best = bestT;
    if (bestT && bestT.fit < ACCEPT) { best = bestT; break; }
  }
  if (!best || best.fit > MAX_D) return null;
  usedT.add(best.src);
  const relax = best.fit < 1.5 ? 0 : best.fit < 3.5 ? 1 : best.fit < 7 ? 2 : 3;
  return { pos, cards: shuffle(rng, best.cards), relax, tpl: best.src };
}

/**
 * Tekrar önleme. Griddy aynı oyuncuyu farklı bölümlerde tekrar kullanıyor (219 oyuncunun 32'si),
 * bu yüzden oyuncuyu uzun süre yasaklamıyoruz:
 *  - aynı kart (ve aynı oyuncunun ±1 sezonu) son 6 oyunda çıktıysa gelmez,
 *  - bir önceki oyunda çıkan oyuncu hiçbir sezonuyla gelmez,
 *  - son 10 oyunda ne kadar sık çıktıysa o kadar zor gelir (aynı yüz her oyunda belirmesin).
 * Böylece oyuncu, en az 2 sezon uzak bir haliyle geri dönebilir (ör. önce 2018-19, sonra 2023-24).
 * Oyun kodu elle girildiyse geçmiş boş verilir, böylece aynı kod herkese aynı desteyi verir.
 */
export type History = [number, number][][]; // oyun başına [oyuncuId, sezonYılı]; eskiden yeniye
export const HISTORY_GAMES = 10, CARD_GAMES = 6, PLAYER_GAMES = 1, SEEN_PENALTY = 1.5;
export interface Recent { keys: Set<string>; seen: Map<number, number> }
export const historyEntry = (cards: { pid: number; season: string }[]): [number, number][] =>
  cards.map(c => [c.pid, +c.season.slice(0, 4)]);
export function recentFrom(history: History): Recent {
  const keys = new Set<string>(), seen = new Map<number, number>();
  history.slice(-HISTORY_GAMES).forEach((game, i, all) => {
    const age = all.length - i; // 1 = bir önceki oyun
    for (const [pid, y] of game) {
      seen.set(pid, (seen.get(pid) ?? 0) + 1);
      if (age <= CARD_GAMES) for (const k of [y - 1, y, y + 1]) keys.add(`${pid}:${k}`);
      if (age <= PLAYER_GAMES) keys.add(`${pid}:*`);
    }
  });
  return { keys, seen };
}
const NO_RECENT: Recent = { keys: new Set(), seen: new Map() };
const avoided = (r: Recent, c: Card) => r.keys.size > 0 && (r.keys.has(`${c.pid}:*`) || r.keys.has(`${c.pid}:${c.season.slice(0, 4)}`));
/** Rastgele seçen takımın beklenen kârı: mevki başına kâr ortalamalarının toplamı. */
export function randTeam(slots: Slot[]) {
  return slots.reduce((a, sl) => a + sl.cards.reduce((b, c) => b + c.profit, 0) / sl.cards.length, 0);
}
const RAND_TEAM: [number, number] = [3, 32];

export function buildDeck(pool: Pool, s: Settings, seed: string, avoid: Recent = NO_RECENT): Deck {
  const rng = makeRng(`${seed}|${JSON.stringify(settingsKey(s))}`);
  const cands = filterPool(pool, s);
  const slots = slotsFor(s);
  const trSlots = new Set<number>();
  if (s.turkish) {
    const k = Math.min(slots.length, 2 + Math.floor(rng() * 3));
    const trCount = (p: Pos) => cands.filter(c => c.pos === p && c.tags.includes('tr_bag') && !avoided(avoid, c)).length;
    const ok = slots.map((_, i) => i).filter(i => slots[i] !== 'KL' && trCount(slots[i]) >= 6);
    sample(rng, ok, Math.min(k, ok.length)).forEach(i => trSlots.add(i));
  }
  // Griddy'nin 6 oyununda "rastgele seçen takım" hep hafif artıda bitiyor (+7…+25M).
  // Desteyi birkaç kez kurup bu banda düşeni alıyoruz; düşmezse banda en yakın olanı.
  let out: Slot[] = [], bestGap = Infinity;
  for (let attempt = 0; attempt < 8; attempt++) {
    const used = new Set<number>();
    const usedT = new Set<string>();
    const cand: Slot[] = slots.map((pos, i) => {
      const slot = buildSlotTemplate(rng, cands, pos, s, used, avoid, trSlots.has(i), usedT)
        ?? buildSlotProfile(rng, cands, pos, s, used, avoid, trSlots.has(i));
      slot.cards.forEach(c => used.add(c.pid));
      return slot;
    });
    const rt = randTeam(cand) * 11 / cand.length;
    const gap = Math.max(0, RAND_TEAM[0] - rt, rt - RAND_TEAM[1]);
    if (gap < bestGap) { bestGap = gap; out = cand; }
    if (gap === 0) break;
  }
  return { seed, slots: out, fresh: avoid.keys.size > 0 };
}

/** Desteyi etkileyen ayarlar (aynı seed + aynı ayarlar = aynı deste). */
export function settingsKey(s: Settings) {
  return [s.nCards, s.slots, s.difficulty, s.seasonFrom, s.seasonTo, [...s.leagues].sort(), s.escalate, s.turkish];
}
