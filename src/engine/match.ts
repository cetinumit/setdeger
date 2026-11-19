import type { Card, Deck, Settings } from './types';

/*
 * Bir mevki turunun durum makinesi.
 * Seçim "görevler" (task) kuyruğu ile ilerler:
 *   normal      : [ İlk seçen kendine , İkinci seçen kendine ]
 *   RAKİBE SEÇ  : [ İlk seçen rakibine, İlk seçen kendine ]
 * Her seçimden sonra, seçimi YAPANIN rakibi BLOKLA kullanabilir:
 *   bloklanan kart kimsenin olmaz; aynı görev tekrar edilir (seçimi artık kartın sahibi yapar),
 *   tekrar edilen seçim bir daha bloklanamaz.
 */

export type TeamIx = 0 | 1;
export const other = (t: TeamIx): TeamIx => (t === 0 ? 1 : 0);

export interface Team {
  name: string;
  color: string;
  pickLeft: number;
  blockLeft: number;
  penalty: number;
}

export interface Task { picker: TeamIx; forTeam: TeamIx; blockable: boolean; role: 'first' | 'second' }

export type Phase = 'pick' | 'block' | 'ready' | 'reveal' | 'done';

export interface Round {
  slot: number;
  first: TeamIx;
  owner: (TeamIx | null)[];
  blocked: (TeamIx | null)[];       // kartı kim blokladı
  assignedBy: (TeamIx | null)[];    // RAKİBE SEÇ ile kim atadı
  timedOut: boolean[];
  tasks: Task[];
  phase: Phase;
  pending: number | null;           // blok penceresindeki kart
  pickJokerBy: TeamIx | null;
  revealOrder: number[];
  revealed: number;
}

export interface Match {
  v: 1;
  settings: Settings;
  deck: Deck;
  teams: [Team, Team];
  round: Round;
  history: Round[];
  finished: boolean;
}

export function newRound(slot: number, first: TeamIx): Round {
  return {
    slot, first, owner: [], blocked: [], assignedBy: [], timedOut: [],
    tasks: [
      { picker: first, forTeam: first, blockable: true, role: 'first' },
      { picker: other(first), forTeam: other(first), blockable: true, role: 'second' },
    ],
    phase: 'pick', pending: null, pickJokerBy: null, revealOrder: [], revealed: 0,
  };
}

function initRoundArrays(r: Round, n: number): Round {
  return { ...r, owner: Array(n).fill(null), blocked: Array(n).fill(null), assignedBy: Array(n).fill(null), timedOut: Array(n).fill(false) };
}

export function newMatch(settings: Settings, deck: Deck, names: [string, string], colors: [string, string], first: TeamIx): Match {
  const uses = settings.jokerUses;
  const mk = (i: TeamIx): Team => ({
    name: names[i], color: colors[i],
    pickLeft: settings.jokerPick ? uses : 0,
    blockLeft: settings.jokerBlock ? uses : 0,
    penalty: 0,
  });
  return {
    v: 1, settings, deck, teams: [mk(0), mk(1)],
    round: initRoundArrays(newRound(0, first), deck.slots[0].cards.length),
    history: [], finished: false,
  };
}

export const cardsOf = (m: Match, r: Round = m.round): Card[] => m.deck.slots[r.slot].cards;
export const available = (r: Round): number[] =>
  r.owner.map((o, i) => (o === null && r.blocked[i] === null ? i : -1)).filter(i => i >= 0);
export const currentTask = (r: Round): Task | null => (r.phase === 'pick' ? r.tasks[0] ?? null : null);

export function canUsePickJoker(m: Match): boolean {
  const r = m.round;
  const t = currentTask(r);
  return !!t && m.settings.jokerPick && t.picker === r.first && t.forTeam === r.first && t.role === 'first'
    && r.tasks.length === 2 && r.owner.every(o => o === null) && r.pickJokerBy === null
    && m.teams[r.first].pickLeft > 0;
}

export function usePickJoker(m: Match): Match {
  if (!canUsePickJoker(m)) return m;
  const r = m.round, F = r.first, S = other(F);
  const teams = m.teams.map((t, i) => (i === F ? { ...t, pickLeft: t.pickLeft - 1 } : t)) as [Team, Team];
  return {
    ...m, teams,
    round: {
      ...r, pickJokerBy: F,
      tasks: [
        { picker: F, forTeam: S, blockable: true, role: 'first' },
        { picker: F, forTeam: F, blockable: true, role: 'first' },
      ],
    },
  };
}

function canBlock(m: Match, r: Round, cardIx: number, task: Task): boolean {
  const blocker = other(task.picker);
  if (!m.settings.jokerBlock || !task.blockable || m.teams[blocker].blockLeft <= 0) return false;
  const availAfter = available(r).filter(i => i !== cardIx).length;
  return availAfter >= r.tasks.length; // kalan görevler + tekrar edilecek seçim
}

function finishTasks(m: Match, r: Round): Round {
  if (r.tasks.length > 0) return { ...r, phase: 'pick' };
  const n = r.owner.length, F = r.first, S = other(F);
  const unowned = Array.from({ length: n }, (_, i) => i).filter(i => r.owner[i] === null);
  const sIx = r.owner.indexOf(S), fIx = r.owner.indexOf(F);
  return { ...r, phase: 'ready', pending: null, revealOrder: [...unowned, sIx, fIx].filter(i => i >= 0) };
}

export function choose(m: Match, cardIx: number, opts: { timeout?: boolean } = {}): Match {
  const r = m.round;
  const task = currentTask(r);
  if (!task || !available(r).includes(cardIx)) return m;
  const owner = r.owner.slice(); owner[cardIx] = task.forTeam;
  const assignedBy = r.assignedBy.slice(); if (task.picker !== task.forTeam) assignedBy[cardIx] = task.picker;
  const timedOut = r.timedOut.slice(); timedOut[cardIx] = !!opts.timeout;
  let teams = m.teams;
  if (opts.timeout && m.settings.timeoutPenalty) {
    teams = teams.map((t, i) => (i === task.picker ? { ...t, penalty: t.penalty + 5 } : t)) as [Team, Team];
  }
  let nr: Round = { ...r, owner, assignedBy, timedOut };
  if (canBlock(m, nr, cardIx, task)) {
    nr = { ...nr, phase: 'block', pending: cardIx };
  } else {
    nr = finishTasks(m, { ...nr, tasks: r.tasks.slice(1) });
  }
  return { ...m, teams, round: nr };
}

export function block(m: Match): Match {
  const r = m.round;
  if (r.phase !== 'block' || r.pending === null) return m;
  const task = r.tasks[0];
  const blocker = other(task.picker);
  const ix = r.pending;
  const owner = r.owner.slice(); owner[ix] = null;
  const blocked = r.blocked.slice(); blocked[ix] = blocker;
  const assignedBy = r.assignedBy.slice(); assignedBy[ix] = null;
  const teams = m.teams.map((t, i) => (i === blocker ? { ...t, blockLeft: t.blockLeft - 1 } : t)) as [Team, Team];
  const redo: Task = { picker: task.forTeam, forTeam: task.forTeam, blockable: false, role: 'second' };
  return { ...m, teams, round: { ...r, owner, blocked, assignedBy, pending: null, phase: 'pick', tasks: [redo, ...r.tasks.slice(1)] } };
}

export function skipBlock(m: Match): Match {
  const r = m.round;
  if (r.phase !== 'block') return m;
  return { ...m, round: finishTasks(m, { ...r, pending: null, tasks: r.tasks.slice(1) }) };
}

export function startReveal(m: Match): Match {
  if (m.round.phase !== 'ready') return m;
  return { ...m, round: { ...m.round, phase: 'reveal', revealed: 0 } };
}

export function revealNext(m: Match): Match {
  const r = m.round;
  if (r.phase !== 'reveal') return m;
  const revealed = r.revealed + 1;
  return { ...m, round: { ...r, revealed, phase: revealed >= r.revealOrder.length ? 'done' : 'reveal' } };
}

export function revealAll(m: Match): Match {
  const r = m.round;
  if (r.phase !== 'reveal' && r.phase !== 'ready') return m;
  return { ...m, round: { ...r, revealed: r.revealOrder.length, phase: 'done' } };
}

export function nextRound(m: Match): Match {
  const r = m.round;
  if (r.phase !== 'done') return m;
  const history = [...m.history, r];
  const slot = r.slot + 1;
  if (slot >= m.deck.slots.length) return { ...m, history, finished: true };
  const nr = initRoundArrays(newRound(slot, other(r.first)), m.deck.slots[slot].cards.length);
  return { ...m, history, round: nr };
}

export interface Score { spent: number; earned: number; penalty: number; profit: number }

/** Skor: geçmiş turlar + (isteğe bağlı) bu turda açılmış kartlar. */
export function scores(m: Match, includeRevealed = true): [Score, Score] {
  const sc: [Score, Score] = [0, 1].map(i => ({ spent: 0, earned: 0, penalty: m.teams[i].penalty, profit: 0 })) as [Score, Score];
  const add = (r: Round, idxs: number[]) => {
    const cards = m.deck.slots[r.slot].cards;
    for (const i of idxs) {
      const o = r.owner[i];
      if (o === null || o === undefined) continue;
      sc[o].spent += cards[i].value;
      sc[o].earned += cards[i].nowValue;
    }
  };
  for (const r of m.history) add(r, r.owner.map((_, i) => i));
  if (includeRevealed && !m.finished && (m.round.phase === 'reveal' || m.round.phase === 'done')) {
    add(m.round, m.round.revealOrder.slice(0, m.round.revealed));
  }
  for (const s of sc) s.profit = Math.round((s.earned - s.spent - s.penalty) * 100) / 100;
  return sc;
}

/** Blok penceresinde kararı veren takım. */
export const blockerOf = (r: Round): TeamIx | null => (r.phase === 'block' ? other(r.tasks[0].picker) : null);

export const timeFor = (s: Settings, t: Task) => (t.role === 'first' ? s.timeFirst : s.timeSecond);
