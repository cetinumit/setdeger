import { useState } from 'react';
import type { TeamIx } from '../engine/match';
import { sound } from './util';

interface Props {
  mode: 'yazitura' | 'tkm';
  names: [string, string];
  colors: [string, string];
  onDone: (first: TeamIx) => void;
}

const HANDS = [['tas', 'Taş', '✊'], ['kagit', 'Kâğıt', '✋'], ['makas', 'Makas', '✌️']] as const;
type Hand = typeof HANDS[number][0];
const beats: Record<Hand, Hand> = { tas: 'makas', kagit: 'tas', makas: 'kagit' };

export function Duel({ mode, names, colors, onDone }: Props) {
  const [winner, setWinner] = useState<TeamIx | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [hands, setHands] = useState<(Hand | null)[]>([null, null]);
  const [turn, setTurn] = useState<0 | 1 | 'pass'>(0);
  const [tie, setTie] = useState(false);

  const flip = () => {
    if (spinning) return;
    setSpinning(true); setWinner(null); sound.play('flip');
    const w: TeamIx = Math.random() < 0.5 ? 0 : 1;
    setTimeout(() => { setWinner(w); setSpinning(false); sound.play('up'); }, 1400);
  };

  const choose = (h: Hand) => {
    sound.play('pick');
    if (turn === 0) { setHands([h, null]); setTurn('pass'); return; }
    if (turn === 1) {
      const a = hands[0]!;
      if (a === h) { setTie(true); setHands([null, null]); setTurn(0); return; }
      setHands([a, h]); setTie(false);
      setWinner(beats[a] === h ? 0 : 1); sound.play('up');
    }
  };

  const style = (t: TeamIx) => ({ '--own': colors[t] } as React.CSSProperties);

  return (
    <main className="screen duel">
      <h1>İlk seçim kimde?</h1>
      {mode === 'yazitura' ? (
        <div className="coin-wrap">
          <button className={`coin ${spinning ? 'spin' : ''}`} onClick={flip} disabled={spinning || winner !== null}
            style={winner !== null ? style(winner) : undefined} aria-label="Parayı at">
            <span>{winner === null ? (spinning ? '' : 'At') : names[winner][0]}</span>
          </button>
          <p className="legend"><b style={style(0)} className="tn">{names[0]}</b> yazı · <b style={style(1)} className="tn">{names[1]}</b> tura</p>
        </div>
      ) : winner === null ? (
        turn === 'pass' ? (
          <div className="handoff">
            <p>Seçim gizli kaydedildi. Telefonu <b style={style(1)} className="tn">{names[1]}</b> takımına ver.</p>
            <button className="cta" onClick={() => setTurn(1)}>Hazırım</button>
          </div>
        ) : (
          <div className="rps">
            {tie && <p className="note-line">Berabere! Tekrar.</p>}
            <p><b style={style(turn)} className="tn">{names[turn]}</b> gizlice seçsin:</p>
            <div className="hands">
              {HANDS.map(([id, label, icon]) => (
                <button key={id} className="hand" onClick={() => choose(id)} aria-label={label}>
                  <span aria-hidden="true">{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        <p className="rps-res">
          {names[0]}: {HANDS.find(h => h[0] === hands[0])?.[2]} &nbsp;—&nbsp; {names[1]}: {HANDS.find(h => h[0] === hands[1])?.[2]}
        </p>
      )}
      {winner !== null && (
        <div className="duel-res" style={style(winner)}>
          <p><b className="tn">{names[winner]}</b> ilk mevkide ilk seçimi yapacak.</p>
          <button className="cta" onClick={() => onDone(winner)}>Oyuna başla</button>
        </div>
      )}
    </main>
  );
}
