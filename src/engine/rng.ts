// Seed'li deterministik RNG (mulberry32). Aynı seed -> aynı sayı dizisi.
export type Rng = () => number;

export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function makeRng(seed: string): Rng {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

export function sample<T>(rng: Rng, arr: T[], n: number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export const shuffle = <T,>(rng: Rng, arr: T[]): T[] => sample(rng, arr, arr.length);

const ALPHA = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
export function randomCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}
