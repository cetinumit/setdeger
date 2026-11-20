// Kalibrasyon için: N oyun üretir (tekrar önleme zinciriyle, gerçek kullanım gibi) ve JSON'a yazar.
import { it } from 'vitest';
import fs from 'node:fs';
import { parsePool } from './engine/pool';
import { buildDeck, historyEntry, recentFrom, type History } from './engine/deck';
import { defaultSettings } from './engine/settings';
it.skipIf(!process.env.EXPORT)('export', () => {
  const pool = parsePool(JSON.parse(fs.readFileSync('public/havuz.json', 'utf8')));
  const N = +(process.env.N || 300);
  const out: object[] = []; const recent: History = [];
  for (let i = 0; i < N; i++) {
    const avoid = recentFrom(process.env.NOAVOID ? [] : recent);
    const d = buildDeck(pool, defaultSettings(), 'X' + i, avoid);
    d.slots.forEach((sl, k) => sl.cards.forEach(c => out.push({
      deck: 'G' + i, src: 'gen', slot: k, pos: sl.pos, name: c.name, value: c.value, now: c.nowValue, profit: c.profit,
      age: c.age, nowage: c.nowAge, season: +c.season.slice(0, 4), league: c.league, apps: c.apps, peak: c.peak,
      pid: c.pid, tr: c.tags.includes('tr_bag'), relax: sl.relax, tpl: sl.tpl ?? 'profil',
    })));
    recent.push(historyEntry(d.slots.flatMap(s => s.cards))); if (recent.length > 10) recent.shift();
  }
  fs.writeFileSync(process.env.EXPORT!, JSON.stringify(out));
});
