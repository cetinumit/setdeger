import { useEffect, useState } from 'react';
import { buildDeck, historyEntry, recentFrom } from './engine/deck';
import { newMatch, type Match, type TeamIx } from './engine/match';
import { loadPool } from './engine/pool';
import { randomCode } from './engine/rng';
import { defaultSettings, normalizeSettings } from './engine/settings';
import type { Deck, Pool, Settings } from './engine/types';
import { Duel } from './ui/Duel';
import { End } from './ui/End';
import { Game } from './ui/Game';
import { Setup } from './ui/Setup';
import { fmtDate, PALETTE, store } from './ui/util';

type Screen = 'home' | 'setup' | 'duel' | 'game' | 'end' | 'how' | 'about';

interface Pending { s: Settings; names: [string, string]; colors: [string, string]; seed: string; typed: boolean; deck?: Deck }

export default function App() {
  const [pool, setPool] = useState<Pool | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [match, setMatchState] = useState<Match | null>(() => store.loadMatch());
  const [settings, setSettings] = useState<Settings>(() => normalizeSettings({ ...defaultSettings(), ...(store.loadSettings() ?? {}) }));
  const saved = store.loadTeams();
  const [names, setNames] = useState<[string, string]>(saved?.names ?? [PALETTE[0].plural, PALETTE[1].plural]);
  const [colors, setColors] = useState<[string, string]>(saved?.colors ?? [PALETTE[0].color, PALETTE[1].color]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { loadPool().then(setPool).catch(e => setLoadErr(String(e.message || e))); }, []);
  const install = useInstall();
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  const setMatch = (m: Match | null) => { setMatchState(m); store.saveMatch(m); };

  // Elle girilen kod: her zaman aynı deste. Rastgele kod: son oyunlarda çıkan oyuncular dışlanır.
  const makeDeck = (s: Settings, seed: string, typed: boolean): Deck =>
    ({ ...buildDeck(pool!, s, seed, typed ? undefined : recentFrom(store.history())), fresh: !typed });

  const prepare = (s: Settings, n: [string, string], c: [string, string], seed: string, typed: boolean) => {
    if (!pool) return;
    try {
      const deck = makeDeck(s, seed, typed);
      setSettings(s); setNames(n); setColors(c);
      store.saveSettings(s); store.saveTeams({ names: n, colors: c });
      setPending({ s, names: n, colors: c, seed, typed, deck }); setErr(null); setScreen('duel');
    } catch (e) { setErr((e as Error).message); }
  };

  const begin = (first: TeamIx, p: Pending = pending!) => {
    const deck = p.deck ?? makeDeck(p.s, p.seed, p.typed);
    if (deck.fresh) store.pushHistory(historyEntry(deck.slots.flatMap(sl => sl.cards)));
    setMatch(newMatch(p.s, deck, p.names, p.colors, first));
    setScreen('game');
  };

  const setGame = (m: Match) => { setMatch(m); if (m.finished) setScreen('end'); };

  if (loadErr) return <main className="screen center"><h1>Bir sorun var</h1><p>{loadErr}</p><button className="cta" onClick={() => location.reload()}>Yeniden dene</button></main>;

  if (screen === 'setup') return <Setup initial={settings} names={names} colors={colors} onStart={prepare} onBack={() => setScreen('home')} error={err} />;
  if (screen === 'duel' && pending) return <Duel mode={pending.s.duel} names={pending.names} colors={pending.colors} onDone={f => begin(f)} />;
  if (screen === 'game' && match && !match.finished) return <Game m={match} setM={setGame} onQuit={() => setScreen('home')} />;
  if (screen === 'end' && match && pool) {
    const again = (replay: boolean) => {
      const base = { s: match.settings, names: [match.teams[0].name, match.teams[1].name] as [string, string], colors: [match.teams[0].color, match.teams[1].color] as [string, string] };
      try {
        const p: Pending = replay
          ? { ...base, seed: match.deck.seed, typed: true, deck: { ...match.deck, fresh: false } }
          : { ...base, seed: randomCode(), typed: false };
        if (!p.deck) p.deck = makeDeck(p.s, p.seed, false);
        setPending(p); setScreen('duel');
      } catch (e) { setErr((e as Error).message); setScreen('setup'); }
    };
    return <End m={match} dataDate={pool.dataDate} onRematch={() => again(false)} onReplay={() => again(true)} onHome={() => { setMatch(null); setScreen('home'); }} />;
  }
  if (screen === 'how') return <How onBack={() => setScreen('home')} />;
  if (screen === 'about') return <About pool={pool} onBack={() => setScreen('home')} />;

  const resumable = match && !match.finished;
  return (
    <main className="screen home">
      <section className="hero">
        <Logo />
        <p className="tag">Geçmişin genç yeteneklerini o günkü fiyatından al. Bugün kim daha çok kâr ettiyse o kazanır.</p>
        <DemoCards />
      </section>
      <nav className="menu">
        <button className="cta" disabled={!pool} onClick={() => setScreen('setup')}>{pool ? 'Yeni oyun' : 'Kartlar yükleniyor…'}</button>
        {resumable && <button className="cta alt" onClick={() => setScreen('game')}>Devam et · {match!.teams[0].name} – {match!.teams[1].name} ({match!.round.slot + 1}/{match!.deck.slots.length})</button>}
        {match?.finished && <button className="cta alt" onClick={() => setScreen('end')}>Son oyunun sonucu</button>}
        <div className="row2">
          <button className="ghost wide" onClick={() => setScreen('how')}>Nasıl oynanır</button>
          <button className="ghost wide" onClick={() => setScreen('about')}>Hakkında</button>
        </div>
        {install.canInstall && <button className="ghost wide" onClick={install.prompt}>Telefona uygulama olarak ekle</button>}
        {install.iosHint && <p className="fine">iPhone'da uygulama gibi kullanmak için: Safari'de Paylaş → Ana Ekrana Ekle.</p>}
        {install.standalone ? null : <ShareLink />}
      </nav>
    </main>
  );
}

interface BIPEvent extends Event { prompt: () => Promise<void> }

function useInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  let standalone = false, inFrame = true;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches; inFrame = window.self !== window.top; } catch { /* yok */ }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    canInstall: !!evt && !standalone,
    iosHint: ios && !standalone && !inFrame,
    standalone,
    prompt: async () => { try { await evt?.prompt(); } catch { /* yok */ } setEvt(null); },
  };
}

function ShareLink() {
  const [msg, setMsg] = useState<string | null>(null);
  let inFrame = true;
  try { inFrame = window.self !== window.top; } catch { /* yok */ }
  if (inFrame) return null; // claude.ai önizlemesinde adres oyunun kendi adresi değil
  const url = location.origin + location.pathname;
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'SetDeğer', text: 'Futbol scouting oyunu: kim daha iyi scout?', url }); return; }
      await navigator.clipboard.writeText(url); setMsg('Link kopyalandı');
    } catch { setMsg(url); }
  };
  return (<>
    <button className="ghost wide" onClick={share}>Arkadaşına gönder</button>
    {msg && <p className="fine">{msg}</p>}
  </>);
}

function Logo() {
  return (
    <div className="logo" aria-label="SetDeğer">
      <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 36 L18 24 L26 30 L42 12" /><path d="M32 12 H42 V22" /></svg>
      <span>Set<b>Değer</b></span>
    </div>
  );
}

function DemoCards() {
  return (
    <div className="demo" aria-hidden="true">
      {[['2021-22', '35M €', '21', 'Premier Lig', '+40M', 'up'], ['2020-21', '60M €', '22', 'Bundesliga', '−35M', 'down'], ['2022-23', '30M €', '24', 'Serie A', '?', 'flat']].map(([s, v, a, l, p, cls], i) => (
        <div key={i} className={`mini m${i}`}>
          <span className="season">{s}</span>
          <svg viewBox="0 0 60 52" className="sil"><circle cx="30" cy="17" r="11" /><path d="M6 52c0-14 10.7-22 24-22s24 8 24 22z" /></svg>
          <span className="mv">{v}</span><span className="ml">{a} yaş · {l}</span>
          <span className={`badge ${cls}`}>{p}</span>
        </div>
      ))}
    </div>
  );
}

function How({ onBack }: { onBack: () => void }) {
  return (
    <main className="screen prose">
      <header className="bar"><button className="ghost" onClick={onBack} aria-label="Geri">←</button><h1>Nasıl oynanır</h1></header>
      <ol className="steps">
        <li><b>İki takım, tek ekran.</b> Telefonu ortaya koyun, tartışarak oynayın. Yazı-tura ya da taş-kağıt-makas ile ilk seçimi kimin yapacağı belirlenir.</li>
        <li><b>11 mevki, isimsiz kartlar.</b> Kaleciden santrfora her mevkide birkaç kart gelir. Kartta sadece geçmiş bir sezon yazar: o zamanki piyasa değeri, yaşı, ligi, maç, gol/asist (kalecide yenilen gol).</li>
        <li><b>Sırayla seç.</b> İlk seçen bir kart alır, sonra rakip kalanlardan birini. Bir sonraki mevkide ilk seçim hakkı karşı takıma geçer.</li>
        <li><b>Kâr = bugünkü değer − kart değeri.</b> Kartlar açılınca oyuncunun bugünkü değeri çıkar. Balon mu aldın, cevher mi? 11 mevki sonunda toplam kârı yüksek olan kazanır.</li>
        <li><b>Jokerler (her biri 1 kez).</b> <em>Rakibe Seç</em>: ilk seçim sendeyken, rakibinin hangi kartı alacağını sen seçersin, sonra kendi kartını alırsın. <em>Blokla</em>: rakibin seçtiği kartı iptal edersin; kalanlardan yeniden seçmek zorunda kalır.</li>
        <li><b>İpuçları.</b> Aynı mevkide fiyatlar birbirine yakındır ama sonuçlar çok uzak olabilir. Hücuma doğru risk büyür, geriden gelen takımın şansı sona kadar sürer.</li>
      </ol>
      <button className="cta" onClick={onBack}>Anladım</button>
    </main>
  );
}

function About({ pool, onBack }: { pool: Pool | null; onBack: () => void }) {
  return (
    <main className="screen prose">
      <header className="bar"><button className="ghost" onClick={onBack} aria-label="Geri">←</button><h1>Hakkında</h1></header>
      <p>SetDeğer, aynı ekranda iki takımın oynadığı bir futbol scouting oyunudur.</p>
      <p>Piyasa değerleri Transfermarkt kaynaklıdır; açık veri seti <a href="https://github.com/dcaribou/transfermarkt-datasets">transfermarkt-datasets</a> (CC0) üzerinden alınmıştır.
        {pool && <> Kart havuzu: <b>{pool.cards.length.toLocaleString('tr-TR')}</b> kart. Güncel değerler: <b>{fmtDate(pool.dataDate)}</b>.</>}</p>
      <p>Kart değeri = o sezonun sonundaki Transfermarkt değeri. Maç, gol ve asist o sezonun tüm kulüp maçlarıdır. Yaş, sezonun ortasındaki yaştır.</p>
      <p className="fine">Oyuncu fotoğrafı ya da kulüp logosu kullanılmaz. Değerler tahmindir; yatırım tavsiyesi değildir.</p>
      <button className="cta" onClick={onBack}>Geri</button>
    </main>
  );
}
