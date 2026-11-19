import { useEffect, useMemo, useRef, useState } from 'react';
import {
  available, block, blockerOf, canUsePickJoker, cardsOf, choose, currentTask, nextRound, other, revealAll, revealNext,
  scores, skipBlock, startReveal, timeFor, usePickJoker, type Match, type TeamIx,
} from '../engine/match';
import { POS_LABEL, POS_SHORT } from '../engine/settings';
import { CardView } from './CardView';
import { Pitch } from './Pitch';
import { buzz, fmtM, fmtProfit, profitClass, sound } from './util';

const BLOCK_SECONDS = 10;

interface Props { m: Match; setM: (m: Match) => void; onQuit: () => void }

export function Game({ m, setM, onQuit }: Props) {
  const r = m.round;
  const cards = cardsOf(m);
  const task = currentTask(r);
  const [sel, setSel] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);
  const [showSquads, setShowSquads] = useState(false);
  const [inter, setInter] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const lastSec = useRef<number>(-1);
  const sc = scores(m);
  const total = m.deck.slots.length;
  const slot = m.deck.slots[r.slot];
  const blocker = blockerOf(r);

  // görev değişince sayaç kur
  const taskKey = `${r.slot}|${r.phase}|${r.tasks.length}|${task?.picker}|${task?.forTeam}|${r.blocked.filter(b => b !== null).length}|${r.pickJokerBy}`;
  useEffect(() => {
    setSel(null);
    lastSec.current = -1;
    if (r.phase === 'pick' && task && m.settings.timer) setDeadline(Date.now() + timeFor(m.settings, task) * 1000);
    else if (r.phase === 'block') setDeadline(Date.now() + BLOCK_SECONDS * 1000);
    else setDeadline(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskKey]);

  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [deadline]);

  const left = deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (left === null) return;
    if (r.phase === 'pick' && left <= 10 && left > 0 && left !== lastSec.current) {
      lastSec.current = left; sound.play('tick');
      if (left === 10) buzz(80);
    }
    if (left === 0) {
      if (r.phase === 'pick') {
        const av = available(r);
        if (av.length) { const i = av[Math.floor(Math.random() * av.length)]; buzz([60, 40, 60]); setM(choose(m, i, { timeout: true })); }
      } else if (r.phase === 'block') setM(skipBlock(m));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  // otomatik açılış
  useEffect(() => {
    if (r.phase !== 'reveal') return;
    const id = setTimeout(() => {
      const c = cards[r.revealOrder[r.revealed]];
      sound.play(c.profit > 0.05 ? 'up' : c.profit < -0.05 ? 'down' : 'flip');
      if (r.owner[r.revealOrder[r.revealed]] !== null) buzz(30);
      setM(revealNext(m));
    }, r.revealed === 0 ? 350 : 1150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.phase, r.revealed]);

  const revealedSet = useMemo(() => new Set(r.revealOrder.slice(0, r.revealed)), [r.revealOrder, r.revealed]);

  const confirm = () => {
    if (sel === null) return;
    sound.play('pick');
    setM(choose(m, sel));
  };

  const goNext = () => {
    const isLast = r.slot === total - 1;
    const after = nextRound(m);
    if (!isLast && total === 11 && (r.slot === 4 || r.slot === 7)) {
      setInter(r.slot === 4 ? 'Defans hattı tamam' : 'Orta saha tamam');
    }
    setM(after);
  };

  const teamStyle = (t: TeamIx) => ({ '--own': m.teams[t].color } as React.CSSProperties);
  const tn = (t: TeamIx) => <b className="tn" style={teamStyle(t)}>{m.teams[t].name}</b>;
  const actor: TeamIx | null = r.phase === 'pick' && task ? task.picker : r.phase === 'block' ? blocker : null;

  let status: React.ReactNode = null;
  if (r.phase === 'pick' && task) {
    if (task.picker !== task.forTeam) status = <>{tn(task.picker)}, {tn(task.forTeam)} için kart seçiyor</>;
    else if (!task.blockable && r.blocked.some(b => b !== null)) status = <>{tn(task.picker)} kalan kartlardan yeniden seçiyor</>;
    else status = <>{tn(task.picker)} seçiyor{task.role === 'first' ? ' (ilk seçim)' : ''}</>;
  } else if (r.phase === 'block' && blocker !== null) {
    status = <>{tn(blocker)}: {tn(r.tasks[0].picker)} takımının seçimini bloklamak ister misin?</>;
  } else if (r.phase === 'ready') status = <>Seçimler tamam. Kartları açma zamanı.</>;
  else if (r.phase === 'reveal') status = <>Kartlar açılıyor…</>;
  else if (r.phase === 'done') status = <>{POS_LABEL[slot.pos]} sonuçları</>;

  const ownerTag = (i: number) => {
    const o = r.owner[i];
    return o === null ? null : m.teams[o].name.slice(0, 1).toUpperCase();
  };
  const noteFor = (i: number) => {
    if (r.blocked[i] !== null) return `${m.teams[r.blocked[i]!].name} blokladı`;
    if (r.assignedBy[i] !== null) return `${m.teams[r.assignedBy[i]!].name} seçti`;
    if (r.timedOut[i]) return 'Süre doldu';
    return null;
  };

  const roundProfit = (t: TeamIx) => {
    if (r.phase !== 'done') return null;
    const i = r.owner.indexOf(t);
    return i < 0 ? null : cards[i].profit;
  };

  return (
    <main className={`screen game ${actor !== null ? '' : 'idle'}`} style={actor !== null ? teamStyle(actor) : undefined}>
      <div className="turnbar" aria-hidden="true" />
      <header className="score">
        {[0, 1].map(t => {
          const team = m.teams[t as TeamIx], s = sc[t];
          const rp = roundProfit(t as TeamIx);
          return (
            <div key={t} className={`sbox ${actor === t ? 'act' : ''}`} style={teamStyle(t as TeamIx)}>
              <span className="sname">{team.name}</span>
              <span className={`sval ${profitClass(s.profit)}`} aria-live="polite">{fmtProfit(s.profit)}</span>
              {m.settings.scoreDetail && <span className="sdet">{fmtM(s.spent)} → {fmtM(s.earned)}</span>}
              {rp !== null && <span className={`sdelta ${profitClass(rp)}`}>bu tur {fmtProfit(rp)}</span>}
              <span className="jk">
                {m.settings.jokerPick && <span className={`j ${team.pickLeft ? '' : 'used'}`} title="Rakibe Seç">RS{team.pickLeft > 1 ? '×2' : ''}</span>}
                {m.settings.jokerBlock && <span className={`j ${team.blockLeft ? '' : 'used'}`} title="Blokla">BL{team.blockLeft > 1 ? '×2' : ''}</span>}
                {team.penalty > 0 && <span className="j pen">−{team.penalty}M</span>}
              </span>
            </div>
          );
        })}
      </header>

      <div className="poshead">
        <span className="step">{r.slot + 1}/{total}</span>
        <h1>{POS_LABEL[slot.pos]}</h1>
        {left !== null && (
          <span className={`timer ${left <= (r.phase === 'block' ? 3 : 10) ? 'hot' : ''}`} role="timer" aria-label={`${left} saniye`}>{left}</span>
        )}
      </div>
      <p className="status">{status}</p>

      <section className={`cards n${cards.length}`}>
        {cards.map((c, i) => {
          const isAvail = r.phase === 'pick' && available(r).includes(i);
          const o = r.owner[i];
          const rev = revealedSet.has(i) || r.phase === 'done';
          return (
            <CardView key={c.id} card={c} num={i + 1} revealed={rev}
              ownerColor={o !== null ? m.teams[o].color : null}
              ownerTag={ownerTag(i)}
              blocked={r.blocked[i] !== null}
              selected={sel === i || r.pending === i}
              disabled={!isAvail && !rev}
              note={noteFor(i)}
              onClick={isAvail ? () => { setSel(i); sound.play('tick'); } : undefined} />
          );
        })}
      </section>

      <footer className="actions">
        {r.phase === 'pick' && task && (
          <>
            {canUsePickJoker(m) && (
              <button className="joker" style={teamStyle(task.picker)} onClick={() => { sound.play('pick'); setM(usePickJoker(m)); }}>
                Rakibe Seç
              </button>
            )}
            <button className="cta" style={teamStyle(task.picker)} disabled={sel === null} onClick={confirm}>
              {sel === null ? 'Bir kart seç' : canUsePickJoker(m) ? `Onayla (${sel + 1})` : `${m.teams[task.picker].name}: ${sel + 1} numarayı onayla`}
            </button>
          </>
        )}
        {r.phase === 'block' && blocker !== null && (
          <>
            <button className="joker danger" style={teamStyle(blocker)} onClick={() => { sound.play('block'); buzz(120); setM(block(m)); }}>
              Blokla ({m.teams[blocker].blockLeft})
            </button>
            <button className="cta alt" onClick={() => setM(skipBlock(m))}>Devam</button>
          </>
        )}
        {r.phase === 'ready' && <button className="cta" onClick={() => { sound.play('flip'); setM(startReveal(m)); }}>Kartları aç</button>}
        {r.phase === 'reveal' && <button className="cta alt" onClick={() => setM(revealAll(m))}>Hepsini aç</button>}
        {r.phase === 'done' && (
          <>
            <button className="cta" onClick={goNext}>{r.slot === total - 1 ? 'Sonuçlar' : `Sonraki: ${POS_SHORT[m.deck.slots[r.slot + 1].pos]}`}</button>
          </>
        )}
      </footer>

      <nav className="minor">
        <button className="ghost" onClick={() => setShowSquads(true)}>Kadrolar</button>
        <button className="ghost" onClick={() => { const v = !muted; setMuted(v); sound.setMuted(v); }}>{muted ? 'Ses kapalı' : 'Ses açık'}</button>
        <button className="ghost" onClick={() => setConfirmQuit(true)}>Menü</button>
      </nav>

      {showSquads && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Kadrolar" onClick={() => setShowSquads(false)}>
          <div className="sheet-in" onClick={e => e.stopPropagation()}>
            <div className="pitches">
              {[0, 1].map(t => <Pitch key={t} m={m} team={t as TeamIx} rounds={r.phase === 'done' ? [...m.history, r] : m.history} />)}
            </div>
            <button className="cta alt" onClick={() => setShowSquads(false)}>Kapat</button>
          </div>
        </div>
      )}

      {inter && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={inter}>
          <div className="sheet-in inter">
            <h2>{inter}</h2>
            <div className="inter-sc">
              {[0, 1].map(t => (
                <div key={t} style={teamStyle(t as TeamIx)}>
                  <span className="tn">{m.teams[t].name}</span>
                  <b className={profitClass(sc[t].profit)}>{fmtProfit(sc[t].profit)}</b>
                </div>
              ))}
            </div>
            <p className="lead">{Math.abs(sc[0].profit - sc[1].profit) < 0.05 ? 'Başa baş!' :
              <>{tn(sc[0].profit > sc[1].profit ? 0 : 1)} {fmtM(Math.abs(sc[0].profit - sc[1].profit)).replace(' €', '')} önde. Risk hücumda büyüyor.</>}</p>
            <button className="cta" onClick={() => setInter(null)}>Devam</button>
          </div>
        </div>
      )}

      {confirmQuit && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Menüye dön">
          <div className="sheet-in inter">
            <h2>Menüye dön?</h2>
            <p>Oyun kaydedildi; ana menüden "Devam et" ile sürdürebilirsin.</p>
            <div className="row2">
              <button className="cta alt" onClick={() => setConfirmQuit(false)}>Vazgeç</button>
              <button className="cta" onClick={onQuit}>Menüye dön</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

