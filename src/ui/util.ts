import type { Match } from '../engine/match';
import type { Settings } from '../engine/types';

export const fmtM = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1).replace('.', ',')}M €`;
};
export const fmtProfit = (v: number) => {
  const r = Math.round(v * 10) / 10;
  if (Math.abs(r) < 0.05) return '±0';
  const s = Number.isInteger(r) ? String(Math.abs(r)) : Math.abs(r).toFixed(1).replace('.', ',');
  return `${r > 0 ? '+' : '−'}${s}M`;
};
export const profitClass = (v: number) => (v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'flat');
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
export const surname = (name: string) => { const p = name.split(' '); return p.length > 1 ? p.slice(1).join(' ') : name; };
export const fmtDate = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };

export const PALETTE: { name: string; color: string; plural: string }[] = [
  { name: 'Turuncu', color: '#ff7a1a', plural: 'Turuncular' },
  { name: 'Mor', color: '#9b6bff', plural: 'Morlar' },
  { name: 'Kırmızı', color: '#f43f5e', plural: 'Kırmızılar' },
  { name: 'Mavi', color: '#3b8bff', plural: 'Maviler' },
  { name: 'Yeşil', color: '#22c55e', plural: 'Yeşiller' },
  { name: 'Sarı', color: '#facc15', plural: 'Sarılar' },
  { name: 'Turkuaz', color: '#14c8b8', plural: 'Turkuazlar' },
  { name: 'Pembe', color: '#f472b6', plural: 'Pembeler' },
];

const K = { match: 'setdeger.match.v1', settings: 'setdeger.settings.v1', teams: 'setdeger.teams.v1', mute: 'setdeger.mute', recent: 'setdeger.recent.v1' };
const get = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
const set = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* yok say */ } };

export const store = {
  loadMatch: () => { const m = get<Match>(K.match); return m && m.v === 1 ? m : null; },
  saveMatch: (m: Match | null) => set(K.match, m),
  loadSettings: () => get<Settings>(K.settings),
  saveSettings: (s: Settings) => set(K.settings, s),
  loadTeams: () => get<{ names: [string, string]; colors: [string, string] }>(K.teams),
  saveTeams: (t: { names: [string, string]; colors: [string, string] }) => set(K.teams, t),
  /** son 6 oyunda çıkan oyuncular (tekrar gelmesin diye) */
  recentPlayers: () => new Set((get<number[][]>(K.recent) ?? []).flat()),
  pushRecent: (pids: number[]) => set(K.recent, [...(get<number[][]>(K.recent) ?? []), pids].slice(-6)),
  loadMute: () => get<boolean>(K.mute) ?? false,
  saveMute: (b: boolean) => set(K.mute, b),
};

// Kısa sentez sesler (WebAudio). Sadece kullanıcı etkileşiminden sonra çalar.
let ctx: AudioContext | null = null;
let muted = store.loadMute();
export const sound = {
  get muted() { return muted; },
  setMuted(b: boolean) { muted = b; store.saveMute(b); },
  play(kind: 'tick' | 'flip' | 'up' | 'down' | 'pick' | 'block') {
    if (muted) return;
    try {
      ctx = ctx || new AudioContext();
      const o = ctx.createOscillator(), g = ctx.createGain();
      const t = ctx.currentTime;
      const f = { tick: 880, flip: 420, up: 660, down: 180, pick: 520, block: 140 }[kind];
      o.type = kind === 'down' || kind === 'block' ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(f, t);
      if (kind === 'up') o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.18);
      if (kind === 'down') o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.05 : 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'tick' ? 0.06 : 0.3));
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.32);
    } catch { /* ses yok */ }
  },
};
export const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* yok */ } };

export const settingsSummary = (s: Settings) => [
  `${s.nCards} kart`,
  s.jokerPick || s.jokerBlock ? [s.jokerPick && 'Rakibe Seç', s.jokerBlock && 'Blokla'].filter(Boolean).join(' + ') : 'joker yok',
  s.timer ? `${s.timeFirst}/${s.timeSecond} sn` : 'süresiz',
  `${s.slots} mevki`,
].join(' · ');
