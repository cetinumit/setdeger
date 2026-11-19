import type { Card, Pool, Pos } from './types';

type Row = (string | number | null | string[])[];

/** public/havuz.json -> Pool. İlk eleman meta, sonrakiler satır dizileri. */
export function parsePool(raw: unknown[]): Pool {
  const meta = raw[0] as { veri_tarihi: string; kaynak: string; cols: string[] };
  const idx = (c: string) => meta.cols.indexOf(c);
  const I = {
    id: idx('id'), pid: idx('oyuncu_id'), name: idx('oyuncu'), pos: idx('mevki'), season: idx('sezon'),
    value: idx('kart_deger'), age: idx('kart_yas'), league: idx('lig'), apps: idx('mac'), goals: idx('gol'),
    assists: idx('asist'), conceded: idx('yenilen_gol'), nowValue: idx('guncel_deger'), nowAge: idx('guncel_yas'),
    club: idx('guncel_kulup'), nation: idx('uyruk'), peak: idx('zirve_deger'), profit: idx('kar'), tags: idx('etiketler'),
  };
  const cards: Card[] = (raw.slice(1) as Row[]).map(r => ({
    id: r[I.id] as string,
    pid: r[I.pid] as number,
    name: r[I.name] as string,
    pos: r[I.pos] as Pos,
    season: r[I.season] as string,
    value: r[I.value] as number,
    age: r[I.age] as number,
    league: r[I.league] as string,
    apps: r[I.apps] as number,
    goals: r[I.goals] as number,
    assists: r[I.assists] as number,
    conceded: r[I.conceded] as number | null,
    nowValue: r[I.nowValue] as number,
    nowAge: r[I.nowAge] as number,
    club: r[I.club] as string | null,
    nation: r[I.nation] as string | null,
    peak: r[I.peak] as number,
    profit: Math.round(((r[I.nowValue] as number) - (r[I.value] as number)) * 100) / 100,
    tags: (r[I.tags] as string[]) || [],
  }));
  return { dataDate: meta.veri_tarihi, source: meta.kaynak, cards };
}

export async function loadPool(url = './havuz.json'): Promise<Pool> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kart havuzu yüklenemedi');
  return parsePool(await res.json());
}

export const seasonStart = (season: string) => parseInt(season.slice(0, 4), 10);
