export type Pos = 'KL' | 'SGB' | 'STP' | 'SLB' | 'DOS' | 'MOS' | 'OOS' | 'SGK' | 'SLK' | 'SF';

export interface Card {
  id: string;
  pid: number;
  name: string;
  pos: Pos;
  season: string;      // "2022-23"
  value: number;       // kart değeri (M €)
  age: number;         // karttaki yaş
  league: string;
  apps: number;
  goals: number;
  assists: number;
  conceded: number | null;
  nowValue: number;    // güncel değer (M €)
  nowAge: number;
  club: string | null;
  nation: string | null;
  peak: number;        // kariyer zirve değeri
  profit: number;      // nowValue - value
  tags: string[];
}

export interface Pool {
  dataDate: string;
  source: string;
  cards: Card[];
}

export type Difficulty = 'kolay' | 'normal' | 'uzman';
export type PresetId = 'klasik' | 'ilk' | 'hizli' | 'ozel';

export interface Settings {
  preset: PresetId;
  nCards: 3 | 4 | 5;
  jokerPick: boolean;
  jokerBlock: boolean;
  jokerUses: 1 | 2;
  timer: boolean;
  timeFirst: number;   // saniye
  timeSecond: number;
  timeoutPenalty: boolean;
  slots: 11 | 6;
  difficulty: Difficulty;
  seasonFrom: number;  // sezon başlangıç yılı (2018)
  seasonTo: number;    // (2024)
  leagues: string[];
  escalate: boolean;
  turkish: boolean;
  scoreDetail: boolean;
  duel: 'yazitura' | 'tkm';
}

export interface Slot {
  pos: Pos;
  cards: Card[];
  relax: number;
  /** Kalibrasyon için: elin dayandığı Griddy şablonu (ör. "V3-2"); yoksa profil üreticisi. */
  tpl?: string;
}

export interface Deck {
  seed: string;
  slots: Slot[];
  /** son oyunlarda çıkan oyuncular dışlanarak üretildi (bu durumda kod aynı desteyi vermez) */
  fresh?: boolean;
}
