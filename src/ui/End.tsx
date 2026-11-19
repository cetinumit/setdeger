import { useState } from 'react';
import { scores, type Match, type TeamIx } from '../engine/match';
import { POS_SHORT } from '../engine/settings';
import type { Card } from '../engine/types';
import { Pitch } from './Pitch';
import { fmtDate, fmtM, fmtProfit, profitClass } from './util';

interface Props { m: Match; dataDate: string; onRematch: () => void; onReplay: () => void; onHome: () => void }

export function End({ m, dataDate, onRematch, onReplay, onHome }: Props) {
  const sc = scores(m);
  const [copied, setCopied] = useState(false);
  const diff = sc[0].profit - sc[1].profit;
  const winner: TeamIx | null = Math.abs(diff) < 0.05 ? null : diff > 0 ? 0 : 1;
  const style = (t: TeamIx) => ({ '--own': m.teams[t].color } as React.CSSProperties);

  const picks = (t: TeamIx) => m.history.map(r => {
    const i = r.owner.indexOf(t);
    return i < 0 ? null : { c: m.deck.slots[r.slot].cards[i], pos: m.deck.slots[r.slot].pos };
  }).filter(Boolean) as { c: Card; pos: string }[];
  const best = (t: TeamIx) => picks(t).sort((a, b) => b.c.profit - a.c.profit)[0];
  const worst = (t: TeamIx) => picks(t).sort((a, b) => a.c.profit - b.c.profit)[0];
  const missed = m.history.flatMap(r => m.deck.slots[r.slot].cards.filter((_, i) => r.owner[i] === null))
    .sort((a, b) => b.profit - a.profit)[0];

  const text = [
    m.deck.fresh ? 'SetDeğer' : `SetDeğer · kod ${m.deck.seed}`,
    ...[0, 1].map(t => `${m.teams[t].name}: ${fmtProfit(sc[t].profit)}`),
    winner === null ? 'Berabere!' : `Kazanan: ${m.teams[winner].name}`,
    missed ? `Kaçırılan cevher: ${missed.name} (${fmtProfit(missed.profit)})` : '',
  ].filter(Boolean).join('\n');

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };

  const Line = ({ label, x }: { label: string; x?: { c: Card; pos: string } }) => x ? (
    <li><span>{label}</span><b>{x.c.name}</b><small>{POS_SHORT[x.pos as keyof typeof POS_SHORT]} · {x.c.season} · {fmtM(x.c.value)} → {fmtM(x.c.nowValue)}</small>
      <em className={profitClass(x.c.profit)}>{fmtProfit(x.c.profit)}</em></li>
  ) : null;

  return (
    <main className="screen end">
      <section className="trophy" style={winner !== null ? style(winner) : undefined}>
        <span className="kick">Oyun bitti</span>
        <h1>{winner === null ? 'Berabere!' : <><span className="tn">{m.teams[winner].name}</span> kazandı</>}</h1>
        <div className="final">
          {[0, 1].map(t => (
            <div key={t} style={style(t as TeamIx)} className={winner === t ? 'win' : ''}>
              <span className="tn">{m.teams[t].name}</span>
              <b className={profitClass(sc[t].profit)}>{fmtProfit(sc[t].profit)}</b>
              <small>{fmtM(sc[t].spent)} harcadı · {fmtM(sc[t].earned)} değerinde kadro{sc[t].penalty ? ` · −${sc[t].penalty}M ceza` : ''}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="awards">
        {[0, 1].map(t => (
          <div key={t} style={style(t as TeamIx)}>
            <h2 className="tn">{m.teams[t].name}</h2>
            <ul>
              <Line label="En iyi transfer" x={best(t as TeamIx)} />
              <Line label="En kötü transfer" x={worst(t as TeamIx)} />
            </ul>
          </div>
        ))}
        {missed && (
          <div className="missed">
            <h2>Kaçırılan cevher</h2>
            <p><b>{missed.name}</b> — {missed.season}'de {fmtM(missed.value)}, bugün {fmtM(missed.nowValue)} <em className="up">{fmtProfit(missed.profit)}</em>. Kimse almadı.</p>
          </div>
        )}
      </section>

      <section className="pitches">
        {[0, 1].map(t => <Pitch key={t} m={m} team={t as TeamIx} rounds={m.history} />)}
      </section>

      <section className="end-actions">
        <button className="cta" onClick={onRematch}>Rövanş (yeni deste)</button>
        <button className="cta alt" onClick={onReplay}>Aynı desteyi tekrar oyna</button>
        <button className="ghost wide" onClick={copy}>{copied ? 'Kopyalandı' : 'Sonucu kopyala'}</button>
        <button className="ghost wide" onClick={onHome}>Ana menü</button>
        <p className="fine">{!m.deck.fresh && <>Oyun kodu <b>{m.deck.seed}</b> · </>}Güncel değerler: Transfermarkt, {fmtDate(dataDate)}</p>
      </section>
    </main>
  );
}
