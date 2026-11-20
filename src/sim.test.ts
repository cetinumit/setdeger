// Simülasyon için: gerçek kullanım gibi art arda N oyun üretir (geçmiş zinciriyle) ve JSON'a yazar.
import { it } from 'vitest';
import fs from 'node:fs';
import { parsePool } from './engine/pool';
import { buildDeck, historyEntry, recentFrom, type History } from './engine/deck';
import { defaultSettings } from './engine/settings';
import { makeRng } from './engine/rng';
it.skipIf(!process.env.SIM)('sim', () => {
  const pool = parsePool(JSON.parse(fs.readFileSync('public/havuz.json', 'utf8')));
  const rng = makeRng(process.env.SEED || 'sim');
  const hist: History = []; const games: object[] = [];
  for (let i = 0; i < +(process.env.N || 7); i++) {
    const seed = 'S' + Math.floor(rng() * 1e8).toString(36).toUpperCase();
    const d = buildDeck(pool, defaultSettings(), seed, recentFrom(hist));
    hist.push(historyEntry(d.slots.flatMap(s => s.cards)));
    games.push({ seed, slots: d.slots.map(s => ({ pos: s.pos, tpl: s.tpl, cards: s.cards })) });
  }
  fs.writeFileSync(process.env.SIM!, JSON.stringify(games));
});
