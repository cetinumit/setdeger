import type { Match, Round, TeamIx } from '../engine/match';
import { fmtProfit, profitClass, surname } from './util';

// 4-3-3 yerleşimi (%x, %y) — saha dikey, kale altta
const SPOT: Record<string, [number, number]> = {
  KL: [50, 91], SGB: [86, 66], STP0: [64, 79], STP1: [36, 79], SLB: [14, 66],
  DOS: [50, 54], MOS: [27, 41], OOS: [73, 41], SGK: [84, 19], SLK: [16, 19], SF: [50, 10],
};

export function squad(m: Match, team: TeamIx, rounds: Round[]) {
  const out: { key: string; name: string; profit: number; spot: [number, number] }[] = [];
  let stp = 0;
  for (const r of rounds) {
    const slot = m.deck.slots[r.slot];
    const spotKey = slot.pos === 'STP' ? `STP${m.deck.slots.length === 6 ? 0 : stp++}` : slot.pos;
    const i = r.owner.indexOf(team);
    if (i < 0) continue;
    const c = slot.cards[i];
    const spot = m.deck.slots.length === 6 && slot.pos === 'STP' ? [50, 76] as [number, number] : SPOT[spotKey];
    out.push({ key: c.id, name: surname(c.name), profit: c.profit, spot });
  }
  return out;
}

export function Pitch({ m, team, rounds }: { m: Match; team: TeamIx; rounds: Round[] }) {
  const players = squad(m, team, rounds);
  const t = m.teams[team];
  return (
    <figure className="pitch" style={{ '--own': t.color } as React.CSSProperties}>
      <figcaption>{t.name}</figcaption>
      <div className="turf">
        <svg viewBox="0 0 100 140" preserveAspectRatio="none" className="lines" aria-hidden="true">
          <rect x="3" y="3" width="94" height="134" />
          <line x1="3" y1="70" x2="97" y2="70" />
          <circle cx="50" cy="70" r="12" />
          <rect x="25" y="3" width="50" height="20" /><rect x="25" y="117" width="50" height="20" />
        </svg>
        {players.map(p => (
          <span key={p.key} className="chip" style={{ left: `${p.spot[0]}%`, top: `${p.spot[1]}%` }}>
            <span className="cn">{p.name}</span>
            <span className={`cp ${profitClass(p.profit)}`}>{fmtProfit(p.profit)}</span>
          </span>
        ))}
      </div>
    </figure>
  );
}
