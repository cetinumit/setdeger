import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parsePool } from './pool';
import { buildDeck, historyEntry, recentFrom } from './deck';
import { defaultSettings, PRESETS } from './settings';
import {
  available, block, canUsePickJoker, choose, newMatch, nextRound, revealAll, scores, skipBlock, startReveal, usePickJoker,
  revealNext, type Match,
} from './match';
import type { Settings } from './types';

const pool = parsePool(JSON.parse(fs.readFileSync('public/havuz.json', 'utf8')));
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

describe('deste üretimi', () => {
  it('aynı seed + ayar = aynı deste', () => {
    const s = defaultSettings();
    const a = buildDeck(pool, s, 'ABC123'), b = buildDeck(pool, s, 'ABC123');
    expect(a.slots.map(x => x.cards.map(c => c.id))).toEqual(b.slots.map(x => x.cards.map(c => c.id)));
    const c = buildDeck(pool, s, 'XYZ999');
    expect(c.slots.map(x => x.cards.map(k => k.id))).not.toEqual(a.slots.map(x => x.cards.map(k => k.id)));
  });

  it('önceki oyunun oyuncusu gelmez; daha eskiler ancak 2+ sezon uzak haliyle dönebilir', () => {
    const s = defaultSettings();
    const a = buildDeck(pool, s, 'A1');
    const prev = a.slots.flatMap(x => x.cards);
    const older = buildDeck(pool, s, 'A0').slots.flatMap(x => x.cards);
    const b = buildDeck(pool, s, 'B2', recentFrom([historyEntry(older), historyEntry(prev)]));
    expect(b.fresh).toBe(true);
    for (const c of b.slots.flatMap(x => x.cards)) {
      expect(prev.some(p => p.pid === c.pid)).toBe(false); // bir önceki oyunun oyuncusu hiç gelmez
      for (const p of older) if (p.pid === c.pid) expect(Math.abs(+p.season.slice(0, 4) - +c.season.slice(0, 4))).toBeGreaterThanOrEqual(2);
    }
  });

  it('kalibrasyon: Klasik ayarda 500 seed (videodaki profiller)', () => {
    const s = defaultSettings();
    const bands: number[] = []; let balanced = 0, total = 0;
    const tpl = new Map<string, number>(); let fromTpl = 0;
    const magKL: number[] = [], magSF: number[] = [], valKL: number[] = [], valSF: number[] = [], allProfit: number[] = [], teamExp: number[] = [];
    for (let i = 0; i < 500; i++) {
      const d = buildDeck(pool, s, 'kal' + i);
      teamExp.push(d.slots.reduce((a, sl) => a + sl.cards.reduce((b, c) => b + c.profit, 0) / sl.cards.length, 0));
      const pids = d.slots.flatMap(x => x.cards.map(c => c.pid));
      expect(new Set(pids).size).toBe(pids.length);
      for (const sl of d.slots) {
        if (sl.tpl) { fromTpl++; tpl.set(sl.tpl, (tpl.get(sl.tpl) ?? 0) + 1); }
        const v = sl.cards.map(c => c.value);
        allProfit.push(...sl.cards.map(c => c.profit));
        bands.push(Math.max(...v) - Math.min(...v));
        const up = sl.cards.filter(c => c.profit > 1).length, dn = sl.cards.filter(c => c.profit < -1).length;
        total++; if (up === 2 && dn === 2) balanced++;
        if (sl.pos === 'KL') { magKL.push(...sl.cards.map(c => Math.abs(c.profit))); valKL.push(...v); }
        if (sl.pos === 'SF') { magSF.push(...sl.cards.map(c => Math.abs(c.profit))); valSF.push(...v); }
      }
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(median(bands)).toBeLessThanOrEqual(20);
    expect(balanced / total).toBeGreaterThan(0.5);
    expect(balanced / total).toBeLessThan(0.8);
    // videoda: KL değer ~15M, |kâr| ~10M; SF değer ~47M, |kâr| ~29M
    expect(avg(valKL)).toBeGreaterThan(11); expect(avg(valKL)).toBeLessThan(20);
    expect(avg(valSF)).toBeGreaterThan(40); expect(avg(valSF)).toBeLessThan(54);
    expect(avg(magKL)).toBeGreaterThan(7); expect(avg(magKL)).toBeLessThan(14);
    expect(avg(magSF)).toBeGreaterThan(23); expect(avg(magSF)).toBeLessThan(35);
    // videoda kart başına ort. kâr +2,4M; rastgele oynayan takım 6 bölümde +7…+25M (medyan +19M)
    expect(avg(allProfit)).toBeGreaterThan(-1); expect(avg(allProfit)).toBeLessThan(6);
    expect(median(teamExp)).toBeGreaterThan(5); expect(median(teamExp)).toBeLessThan(30);
    // ellerin neredeyse tamamı Griddy'nin gerçek ellerinden birine dayanıyor ve tek bir şablon baskın değil
    expect(fromTpl / total).toBeGreaterThan(0.9);
    expect(tpl.size).toBeGreaterThan(55);
    expect(Math.max(...tpl.values()) / fromTpl).toBeLessThan(0.05);
  }, 120_000);

  it('tüm ön ayarlar ve uç ayarlar deste üretebilir', () => {
    const variants: Settings[] = [
      PRESETS.klasik.s, PRESETS.ilk.s, PRESETS.hizli.s,
      { ...defaultSettings(), nCards: 5 }, { ...defaultSettings(), escalate: false },
      { ...defaultSettings(), difficulty: 'kolay' }, { ...defaultSettings(), difficulty: 'uzman', turkish: false },
      { ...defaultSettings(), leagues: ['Premier Lig', 'LaLiga', 'Serie A'], seasonFrom: 2021, seasonTo: 2024 },
    ];
    for (const s of variants) for (let i = 0; i < 20; i++) {
      const d = buildDeck(pool, s, 'v' + i);
      expect(d.slots.length).toBe(s.slots);
      d.slots.forEach(sl => expect(sl.cards.length).toBe(s.nCards));
    }
  });
});

function mk(over: Partial<Settings> = {}): Match {
  const s = { ...defaultSettings(), ...over };
  return newMatch(s, buildDeck(pool, s, 'T1'), ['A', 'B'], ['#f60', '#80f'], 0);
}

describe('tur ve jokerler', () => {
  it('normal akış: ilk seçen, ikinci seçen, açılış sırası', () => {
    let m = mk({ jokerBlock: false });
    m = choose(m, 2);
    expect(m.round.owner[2]).toBe(0);
    m = choose(m, 0);
    expect(m.round.phase).toBe('ready');
    expect(m.round.revealOrder.slice(-2)).toEqual([0, 2]); // ikinci seçen, sonra ilk seçen
    m = startReveal(m);
    for (let i = 0; i < 4; i++) m = revealNext(m);
    expect(m.round.phase).toBe('done');
    m = nextRound(m);
    expect(m.round.first).toBe(1);
  });

  it('BLOKLA: ilk seçenin kartı bloklanır, kalanlardan yeniden seçer, ikinci kez bloklanamaz', () => {
    let m = mk();
    m = choose(m, 1);
    expect(m.round.phase).toBe('block');
    m = block(m);
    expect(m.teams[1].blockLeft).toBe(0);
    expect(m.round.blocked[1]).toBe(1);
    expect(available(m.round)).not.toContain(1);
    m = choose(m, 2);               // A yeniden seçti; bloklanamaz
    expect(m.round.owner[2]).toBe(0);
    expect(m.round.phase).toBe('pick');
    m = choose(m, 0);               // B seçti; A blok hakkı var -> pencere
    expect(m.round.phase).toBe('block');
    m = skipBlock(m);
    expect(m.round.phase).toBe('ready');
    expect(m.round.revealOrder[0]).toBe(1); // bloklanan kart seçilmeyenlerle önce açılır
  });

  it('RAKİBE SEÇ: sadece ilk seçenin ilk hamlesinde; atanan kart bloklanırsa sahibi kendi seçer', () => {
    let m = mk();
    expect(canUsePickJoker(m)).toBe(true);
    m = usePickJoker(m);
    expect(m.teams[0].pickLeft).toBe(0);
    m = choose(m, 3);               // A, B'ye 3'ü verdi
    expect(m.round.owner[3]).toBe(1);
    expect(m.round.phase).toBe('block'); // B bloklayabilir
    m = block(m);
    expect(m.round.tasks[0].picker).toBe(1); // B kendisi seçer
    m = choose(m, 0);
    expect(m.round.owner[0]).toBe(1);
    expect(m.round.tasks[0].picker).toBe(0); // sıra A'da (kendine)
    m = choose(m, 1);
    expect(m.round.phase).toBe('ready');      // B'nin bloğu bitti, A'nın bloğu B'nin seçimi için kullanılmadı
  });

  it('3 kartta blok, kart bitirmeyecek şekilde sınırlanır', () => {
    let m = mk({ nCards: 3 });
    m = choose(m, 0); m = block(m);            // B blokladı: 2 kart kaldı, A yeniden seçer
    m = choose(m, 1);                           // A aldı: 1 kart kaldı
    m = choose(m, 2);                           // B aldı; A bloklarsa B'ye kart kalmaz -> pencere açılmamalı
    expect(m.round.phase).toBe('ready');
  });

  it('RAKİBE SEÇ ikinci hamlede kullanılamaz', () => {
    let m = mk();
    m = choose(m, 0); m = skipBlock(m);
    expect(canUsePickJoker(m)).toBe(false);
  });

  it('skor = güncel - kart değeri, süre cezası düşülür', () => {
    let m = mk({ jokerBlock: false, timeoutPenalty: true });
    const cards = m.deck.slots[0].cards;
    m = choose(m, 0, { timeout: true });
    m = choose(m, 1);
    m = revealAll(startReveal(m));
    const sc = scores(m);
    expect(sc[0].profit).toBeCloseTo(cards[0].nowValue - cards[0].value - 5, 5);
    expect(sc[1].profit).toBeCloseTo(cards[1].nowValue - cards[1].value, 5);
  });

  it('tam oyun bitişi', () => {
    let m = mk({ jokerBlock: false, jokerPick: false });
    for (let i = 0; i < 11; i++) {
      const a = available(m.round); m = choose(m, a[0]); m = choose(m, available(m.round)[0]);
      m = nextRound(revealAll(startReveal(m)));
    }
    expect(m.finished).toBe(true);
    expect(m.history.length).toBe(11);
  });
});
