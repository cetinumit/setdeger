import type { Pos, PresetId, Settings } from './types';

export const ALL_LEAGUES = ['Premier Lig', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie', 'Liga Portugal', 'Süper Lig'];
export const FIRST_SEASON = 2018;
export const LAST_SEASON = 2024;

export const SLOTS_11: Pos[] = ['KL', 'SGB', 'STP', 'STP', 'SLB', 'DOS', 'MOS', 'OOS', 'SGK', 'SLK', 'SF'];
export const SLOTS_6: Pos[] = ['KL', 'STP', 'MOS', 'OOS', 'SLK', 'SF'];

export const POS_LABEL: Record<Pos, string> = {
  KL: 'Kaleci', SGB: 'Sağ Bek', STP: 'Stoper', SLB: 'Sol Bek', DOS: 'Defansif Orta Saha',
  MOS: 'Merkez Orta Saha', OOS: 'Ofansif Orta Saha', SGK: 'Sağ Kanat', SLK: 'Sol Kanat', SF: 'Santrfor',
};
export const POS_SHORT: Record<Pos, string> = {
  KL: 'KL', SGB: 'SĞB', STP: 'STP', SLB: 'SLB', DOS: 'DOS', MOS: 'MOS', OOS: 'OOS', SGK: 'SĞK', SLK: 'SLK', SF: 'SF',
};

const base: Settings = {
  preset: 'klasik', nCards: 4, jokerPick: true, jokerBlock: true, jokerUses: 1,
  timer: true, timeFirst: 90, timeSecond: 30, timeoutPenalty: false, slots: 11,
  difficulty: 'normal', seasonFrom: FIRST_SEASON, seasonTo: LAST_SEASON,
  leagues: [...ALL_LEAGUES], escalate: true, turkish: true, scoreDetail: false, duel: 'yazitura',
};

export const PRESETS: Record<Exclude<PresetId, 'ozel'>, { title: string; desc: string; s: Settings }> = {
  klasik: { title: 'Klasik', desc: '4 kart · 2 joker · 90/30 sn', s: { ...base } },
  ilk: {
    title: 'İlk Sezon', desc: '3 kart · joker yok · süresiz',
    s: { ...base, preset: 'ilk', nCards: 3, jokerPick: false, jokerBlock: false, timer: false, scoreDetail: true },
  },
  hizli: {
    title: 'Hızlı Maç', desc: '6 mevki · blok · 45/15 sn',
    s: { ...base, preset: 'hizli', jokerPick: false, timeFirst: 45, timeSecond: 15, slots: 6 },
  },
};

export const defaultSettings = (): Settings => ({ ...PRESETS.klasik.s, leagues: [...ALL_LEAGUES] });

/** Ayarları tutarlı hale getirir (ör. joker açıkken en az 3 kart). */
export function normalizeSettings(s: Settings): Settings {
  const { band: _b, ...rest } = s as Settings & { band?: unknown };
  const out = { ...rest, leagues: rest.leagues.filter(l => ALL_LEAGUES.includes(l)) } as Settings;
  if (out.leagues.length < 3) out.leagues = [...ALL_LEAGUES];
  if (out.seasonFrom > out.seasonTo) [out.seasonFrom, out.seasonTo] = [out.seasonTo, out.seasonFrom];
  out.timeFirst = Math.min(180, Math.max(30, out.timeFirst));
  out.timeSecond = Math.min(90, Math.max(10, out.timeSecond));
  return out;
}

export const slotsFor = (s: Settings): Pos[] => (s.slots === 6 ? SLOTS_6 : SLOTS_11);
