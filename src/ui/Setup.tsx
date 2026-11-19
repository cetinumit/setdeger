import { useState } from 'react';
import { ALL_LEAGUES, FIRST_SEASON, LAST_SEASON, PRESETS, normalizeSettings } from '../engine/settings';
import type { PresetId, Settings } from '../engine/types';
import { randomCode } from '../engine/rng';
import { PALETTE, settingsSummary } from './util';

interface Props {
  initial: Settings;
  names: [string, string];
  colors: [string, string];
  onStart: (s: Settings, names: [string, string], colors: [string, string], seed: string, typed: boolean) => void;
  onBack: () => void;
  error?: string | null;
}

const Seg = <T extends string | number | boolean>({ value, options, onChange, label }:
  { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) => (
  <div className="field">
    <span className="flabel">{label}</span>
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={v === value}
          className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  </div>
);

export function Setup({ initial, names: n0, colors: c0, onStart, onBack, error }: Props) {
  const [s, setS] = useState<Settings>(initial);
  const [names, setNames] = useState<[string, string]>(n0);
  const [colors, setColors] = useState<[string, string]>(c0);
  const [seed, setSeed] = useState('');
  const [adv, setAdv] = useState(false);

  const patch = (p: Partial<Settings>) => setS(prev => {
    const next = { ...prev, ...p, preset: 'ozel' as PresetId };
    if ((next.jokerPick || next.jokerBlock) && next.nCards < 3) next.nCards = 3;
    return next;
  });
  const applyPreset = (id: Exclude<PresetId, 'ozel'>) =>
    setS({ ...PRESETS[id].s, leagues: [...PRESETS[id].s.leagues], duel: s.duel });

  const pickColor = (team: 0 | 1, color: string) => {
    const next: [string, string] = [...colors] as [string, string];
    next[team] = color;
    if (next[0] === next[1]) next[1 - team] = colors[team];
    const oldPlural = PALETTE.find(p => p.color === colors[team])?.plural;
    const nn: [string, string] = [...names] as [string, string];
    if (nn[team] === oldPlural) nn[team] = PALETTE.find(p => p.color === color)!.plural;
    const other = 1 - team;
    if (next[other] !== colors[other] && nn[other] === PALETTE.find(p => p.color === colors[other])?.plural) {
      nn[other] = PALETTE.find(p => p.color === next[other])!.plural;
    }
    setColors(next); setNames(nn);
  };

  const toggleLeague = (l: string) => {
    const has = s.leagues.includes(l);
    if (has && s.leagues.length <= 3) return;
    patch({ leagues: has ? s.leagues.filter(x => x !== l) : [...s.leagues, l] });
  };

  const seasons = Array.from({ length: LAST_SEASON - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i);
  const sLabel = (y: number) => `${y}-${String(y + 1).slice(2)}`;

  return (
    <main className="screen setup">
      <header className="bar">
        <button className="ghost" onClick={onBack} aria-label="Geri">←</button>
        <h1>Yeni oyun</h1>
      </header>

      <section className="teams">
        {[0, 1].map(t => (
          <div key={t} className="team-in" style={{ '--own': colors[t] } as React.CSSProperties}>
            <label htmlFor={`tn${t}`}>{t === 0 ? '1. takım' : '2. takım'}</label>
            <input id={`tn${t}`} value={names[t]} maxLength={16}
              onChange={e => { const nn = [...names] as [string, string]; nn[t] = e.target.value; setNames(nn); }} />
            <div className="swatches" role="radiogroup" aria-label="Renk">
              {PALETTE.map(p => (
                <button key={p.color} type="button" role="radio" aria-checked={colors[t] === p.color} aria-label={p.name}
                  className={colors[t] === p.color ? 'on' : ''} style={{ background: p.color }}
                  onClick={() => pickColor(t as 0 | 1, p.color)} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>Kurallar</h2>
        <div className="presets">
          {(Object.keys(PRESETS) as Exclude<PresetId, 'ozel'>[]).map(id => (
            <button key={id} type="button" className={`preset ${s.preset === id ? 'on' : ''}`} onClick={() => applyPreset(id)}>
              <b>{PRESETS[id].title}</b><span>{PRESETS[id].desc}</span>
            </button>
          ))}
          <button type="button" className={`preset ${s.preset === 'ozel' ? 'on' : ''}`} onClick={() => setAdv(true)}>
            <b>Özel</b><span>{s.preset === 'ozel' ? settingsSummary(s) : 'Her şeyi sen ayarla'}</span>
          </button>
        </div>

        <button type="button" className="disclose" aria-expanded={adv} onClick={() => setAdv(!adv)}>
          {adv ? '▾' : '▸'} Gelişmiş ayarlar
        </button>
        {adv && (
          <div className="adv">
            <Seg label="Kart sayısı" value={s.nCards} options={[[3, '3'], [4, '4'], [5, '5']]} onChange={v => patch({ nCards: v })} />
            <Seg label="Rakibe Seç jokeri" value={s.jokerPick} options={[[true, 'Açık'], [false, 'Kapalı']]} onChange={v => patch({ jokerPick: v })} />
            <Seg label="Blokla jokeri" value={s.jokerBlock} options={[[true, 'Açık'], [false, 'Kapalı']]} onChange={v => patch({ jokerBlock: v })} />
            {(s.jokerPick || s.jokerBlock) && (
              <Seg label="Joker hakkı" value={s.jokerUses} options={[[1, '1 kez'], [2, '2 kez']]} onChange={v => patch({ jokerUses: v })} />
            )}
            <Seg label="Süre" value={s.timer} options={[[true, 'Açık'], [false, 'Kapalı']]} onChange={v => patch({ timer: v })} />
            {s.timer && (
              <>
                <div className="field">
                  <label className="flabel" htmlFor="t1">İlk seçen: <b>{s.timeFirst} sn</b></label>
                  <input id="t1" type="range" min={30} max={180} step={15} value={s.timeFirst} onChange={e => patch({ timeFirst: +e.target.value })} />
                </div>
                <div className="field">
                  <label className="flabel" htmlFor="t2">İkinci seçen: <b>{s.timeSecond} sn</b></label>
                  <input id="t2" type="range" min={10} max={90} step={5} value={s.timeSecond} onChange={e => patch({ timeSecond: +e.target.value })} />
                </div>
                <Seg label="Süre dolunca" value={s.timeoutPenalty} options={[[false, 'Rastgele seç'], [true, 'Rastgele + −5M']]} onChange={v => patch({ timeoutPenalty: v })} />
              </>
            )}
            <Seg label="Mevki sayısı" value={s.slots} options={[[11, '11 (tam kadro)'], [6, '6 (hızlı)']]} onChange={v => patch({ slots: v })} />
            <Seg label="Zorluk" value={s.difficulty} options={[['kolay', 'Kolay'], ['normal', 'Normal'], ['uzman', 'Uzman']]} onChange={v => patch({ difficulty: v })} />
            <div className="field">
              <span className="flabel">Sezonlar: <b>{sLabel(s.seasonFrom)} → {sLabel(s.seasonTo)}</b></span>
              <div className="row2">
                <select aria-label="İlk sezon" value={s.seasonFrom} onChange={e => patch({ seasonFrom: +e.target.value })}>
                  {seasons.map(y => <option key={y} value={y} disabled={y > s.seasonTo - 1}>{sLabel(y)}</option>)}
                </select>
                <select aria-label="Son sezon" value={s.seasonTo} onChange={e => patch({ seasonTo: +e.target.value })}>
                  {seasons.map(y => <option key={y} value={y} disabled={y < s.seasonFrom + 1}>{sLabel(y)}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <span className="flabel">Ligler <small>(en az 3)</small></span>
              <div className="chips">
                {ALL_LEAGUES.map(l => (
                  <button key={l} type="button" className={s.leagues.includes(l) ? 'on' : ''} aria-pressed={s.leagues.includes(l)} onClick={() => toggleLeague(l)}>{l}</button>
                ))}
              </div>
            </div>
            <Seg label="Tırmanan risk (kaleciden forvete fiyat ve kâr büyür)" value={s.escalate} options={[[true, 'Açık'], [false, 'Kapalı']]} onChange={v => patch({ escalate: v })} />
            <Seg label="Türk dokunuşu" value={s.turkish} options={[[true, 'Açık'], [false, 'Kapalı']]} onChange={v => patch({ turkish: v })} />
            <Seg label="Skor" value={s.scoreDetail} options={[[false, 'Toplam kâr'], [true, 'Harcanan / Kazanılan']]} onChange={v => patch({ scoreDetail: v })} />
            <Seg label="İlk seçim" value={s.duel} options={[['yazitura', 'Yazı-tura'], ['tkm', 'Taş-kağıt-makas']]} onChange={v => setS({ ...s, duel: v })} />
          </div>
        )}
      </section>

      <section className="seedbox">
        <label htmlFor="seed">Oyun kodu <small>(boş bırak: son oyunlarda çıkan oyuncular gelmez · kod yazarsan: aynı kod hep aynı deste)</small></label>
        <div className="row2">
          <input id="seed" value={seed} placeholder="ör. K7MPR2" maxLength={12} autoCapitalize="characters"
            onChange={e => setSeed(e.target.value.toUpperCase().replace(/\s/g, ''))} />
          <button type="button" className="ghost" onClick={() => setSeed(randomCode())}>Rastgele</button>
        </div>
      </section>

      {error && <p className="err" role="alert">{error}</p>}
      <div className="sticky-cta">
        <button className="cta" onClick={() => onStart(normalizeSettings(s),
          [names[0].trim() || 'Takım 1', names[1].trim() || 'Takım 2'], colors, seed || randomCode(), !!seed)}>
          Başla
        </button>
      </div>
    </main>
  );
}
