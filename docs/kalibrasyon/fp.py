# Parmak izi: el (mevki) ve deste düzeyinde özellikler + Griddy ile karşılaştırma
import json, statistics as st, collections, math, sys
GROUP={'KL':'KL','SGB':'DEF','STP':'DEF','SLB':'DEF','DOS':'MID','MOS':'MID','OOS':'MID','SGK':'ATT','SLK':'ATT','SF':'ATT'}

def slot_feats(cards):
    n=len(cards); v=[c['value'] for c in cards]; p=[c['profit'] for c in cards]
    ages=[c['age'] for c in cards if c.get('age') is not None]
    seas=[c['season'] for c in cards if c.get('season') is not None]
    peaks=[c['peak'] for c in cards if c.get('peak') is not None]
    apps=[c['apps'] for c in cards if c.get('apps') is not None]
    vm=st.mean(v)
    pr=sorted(range(n),key=lambda i:v[i])
    best=max(range(n),key=lambda i:p[i]); worst=min(range(n),key=lambda i:p[i])
    f=dict(
      pos=cards[0]['pos'], grp=GROUP[cards[0]['pos']], slot=cards[0]['slot'], n=n,
      v_mean=vm, v_range=max(v)-min(v), v_rel_range=(max(v)-min(v))/vm, v_equal=n-len(set(v)),
      p_mean=st.mean(p), p_abs=st.mean(abs(x) for x in p), p_spread=max(p)-min(p),
      p_max=max(p), p_min=min(p), up_share=sum(x>1 for x in p)/n, down_share=sum(x<-1 for x in p)/n,
      zero_share=sum(abs(x)<=1 for x in p)/n, rel_swing=st.mean(abs(x) for x in p)/vm,
      up_ratio=st.mean([c['now']/c['value'] for c in cards if c['profit']>1] or [float('nan')]),
      down_ratio=st.mean([c['now']/c['value'] for c in cards if c['profit']<-1] or [float('nan')]),
      best_vrank=pr.index(best)/(n-1), worst_vrank=pr.index(worst)/(n-1),
      priciest_loses=float(p[pr[-1]]<-1), cheapest_wins=float(p[pr[0]]>1),
      age_mean=st.mean(ages) if ages else float('nan'), age_range=(max(ages)-min(ages)) if ages else float('nan'),
      ago_mean=(2025-st.mean(seas)) if seas else float('nan'), n_seasons=len(set(seas))/n if seas else float('nan'),
      n_leagues=len(set(c['league'] for c in cards))/n, pl_share=sum(c['league']=='Premier Lig' for c in cards)/n,
      peak_max=max(peaks) if peaks else float('nan'), peak_min=min(peaks) if peaks else float('nan'),
      famous40=sum(x>=40 for x in peaks)/n if peaks else float('nan'), famous70=sum(x>=70 for x in peaks)/n if peaks else float('nan'),
      nowage=st.mean(c['nowage'] for c in cards), apps_min=min(apps) if apps else float('nan'),
      now_mean=st.mean(c['now'] for c in cards),
    )
    return f

def deck_feats(slots):
    sm=[s['p_mean'] for s in slots]
    return dict(rand_team=sum(sm), slots_pos=sum(x>0 for x in sm)/len(sm), best=max(s['p_max'] for s in slots), worst=min(s['p_min'] for s in slots),
                tr=sum(s.get('_tr',0) for s in slots), esc_ratio=st.mean(s['p_abs'] for s in slots[-3:])/st.mean(s['p_abs'] for s in slots[:1]))

def load(path):
    cards=json.load(open(path)); by=collections.defaultdict(list)
    for c in cards: by[(c['deck'],c['slot'])].append(c)
    slots=[]; decks=collections.defaultdict(list)
    for (d,s),cs in sorted(by.items()):
        f=slot_feats(cs); f['_tr']=sum(1 for c in cs if c.get('tr')); f['deck']=d; slots.append(f); decks[d].append(f)
    dfe=[deck_feats(sorted(v,key=lambda x:x['slot'])) for v in decks.values()]
    return slots, dfe

def ks(a,b):
    a=sorted(x for x in a if x==x); b=sorted(x for x in b if x==x)
    if not a or not b: return float('nan')
    vals=sorted(set(a+b)); import bisect
    return max(abs(bisect.bisect_right(a,x)/len(a)-bisect.bisect_right(b,x)/len(b)) for x in vals)

def q(a,p):
    a=sorted(x for x in a if x==x); 
    if not a: return float('nan')
    k=(len(a)-1)*p; f=math.floor(k); c=math.ceil(k); return a[f]+(a[c]-a[f])*(k-f)

SLOT_KEYS=['v_mean','v_range','v_rel_range','v_equal','p_mean','p_abs','p_spread','p_max','p_min','up_share','zero_share','rel_swing','up_ratio','down_ratio',
           'best_vrank','worst_vrank','priciest_loses','cheapest_wins','age_mean','age_range','ago_mean','n_seasons','n_leagues','pl_share','peak_max','peak_min','famous40','famous70','nowage','apps_min','now_mean']
DECK_KEYS=['rand_team','slots_pos','best','worst','tr','esc_ratio']

def compare(vpath,gpath,groups=('KL','DEF','MID','ATT'),show=True):
    vs,vd=load(vpath); gs,gd=load(gpath)
    vs4=[s for s in vs if s['n']==4]  # 4 kartlı bölümler (#3-#7) ana referans
    rows=[]; tot=[]
    for k in SLOT_KEYS:
        line=[k]
        for g in groups:
            a=[s[k] for s in vs4 if s['grp']==g]; b=[s[k] for s in gs if s['grp']==g]
            d=ks(a,b); tot.append(d)
            line.append(f"{q(a,.5):7.2f}|{q(b,.5):7.2f} ks{d:.2f}")
        rows.append(line)
    drows=[]
    vd4=[x for x,s in zip(vd,sorted(set(s['deck'] for s in vs))) if s!='V1']
    for k in DECK_KEYS:
        a=[x[k] for x in vd4]; b=[x[k] for x in gd]; d=ks(a,b); tot.append(d)
        drows.append(f"{k:12} video med {q(a,.5):7.2f} [{min(a):.1f}..{max(a):.1f}] | biz med {q(b,.5):7.2f} p10 {q(b,.1):.1f} p90 {q(b,.9):.1f}  ks {d:.2f}")
    score=st.mean(x for x in tot if x==x)
    if show:
        print(f"{'özellik':14}"+''.join(f"{g:>26}" for g in groups)+"   (video medyan | biz medyan, KS)")
        for r in rows: print(f"{r[0]:14}"+''.join(f"{x:>26}" for x in r[1:]))
        print('\n'.join(drows))
        print(f"ORTALAMA KS = {score:.3f}  (0 = aynı dağılım, 1 = tamamen farklı)")
    return score

if __name__=='__main__':
    compare(sys.argv[1],sys.argv[2])
