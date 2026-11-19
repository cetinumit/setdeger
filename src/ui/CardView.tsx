import type { Card } from '../engine/types';
import { fmtM, fmtProfit, initials, profitClass } from './util';

interface Props {
  card: Card;
  num: number;
  revealed: boolean;
  ownerColor?: string | null;
  ownerTag?: string | null;
  blocked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  note?: string | null;
  onClick?: () => void;
}

const Silhouette = () => (
  <svg viewBox="0 0 60 52" className="sil" aria-hidden="true">
    <circle cx="30" cy="17" r="11" />
    <path d="M6 52c0-14 10.7-22 24-22s24 8 24 22z" />
  </svg>
);

export function CardView({ card, num, revealed, ownerColor, ownerTag, blocked, selected, disabled, note, onClick }: Props) {
  const isGK = card.pos === 'KL';
  const style = ownerColor ? ({ '--own': ownerColor } as React.CSSProperties) : undefined;
  const label = revealed
    ? `${card.name}, kâr ${fmtProfit(card.profit)}`
    : `${num}. kart: ${card.season}, ${fmtM(card.value)}, ${card.age} yaş, ${card.league}`;
  return (
    <button
      type="button"
      className={`card ${revealed ? 'is-rev' : ''} ${ownerColor ? 'is-owned' : ''} ${selected ? 'is-sel' : ''} ${blocked ? 'is-blocked' : ''}`}
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
    >
      <span className="card-inner">
        <span className="face front">
          <span className="season">{card.season}</span>
          <span className="num">{num}</span>
          {ownerTag && <span className="own-tag">{ownerTag}</span>}
          <Silhouette />
          <span className="stats">
            <span>Değer</span><b>{fmtM(card.value)}</b>
            <span>Yaş</span><b>{card.age}</b>
            <span>Lig</span><b className="lg">{card.league}</b>
            <span>Maç</span><b>{card.apps}</b>
            {isGK ? (<><span>Y.Gol</span><b>{card.conceded}</b></>) : (<><span>G/A</span><b>{card.goals}/{card.assists}</b></>)}
          </span>
          {blocked && <span className="ban" aria-hidden="true">⊘</span>}
        </span>
        <span className="face back">
          <span className={`badge ${profitClass(card.profit)}`}>{fmtProfit(card.profit)}</span>
          <span className="avatar">{initials(card.name)}</span>
          <span className="pname">{card.name}</span>
          <span className="club">{card.club ?? '—'}</span>
          <span className="stats two">
            <span>Yaş</span><b>{card.nowAge}</b>
            <span>Değer</span><b>{fmtM(card.nowValue)}</b>
            <span>O zaman</span><b>{fmtM(card.value)}</b>
          </span>
          {ownerTag && <span className="own-tag">{ownerTag}</span>}
          {blocked && <span className="ban small" aria-hidden="true">⊘</span>}
        </span>
      </span>
      {note && <span className="note">{note}</span>}
    </button>
  );
}
