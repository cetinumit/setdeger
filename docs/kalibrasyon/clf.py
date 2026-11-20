# "Ayırt edilebilir mi?" testi: bir sınıflandırıcı Griddy'nin ellerini bizimkilerden ayırabiliyor mu?
# AUC 0.5 = ayırt edilemez, 1.0 = tamamen ayrılıyor. Önemli özellikler bizi neyin ele verdiğini söyler.
import json, sys, random, numpy as np, collections
from fp import load
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
vs,_=load('video.json'); gs,_=load(sys.argv[1])
vs=[s for s in vs if s['n']==4]
KEYS=[k for k,x in vs[0].items() if isinstance(x,(int,float)) and k not in ('slot','n','_tr')]
GO=['KL','DEF','MID','ATT']
def X(s): return [0 if (s[k] is None or s[k]!=s[k]) else s[k] for k in KEYS]+[GO.index(s['grp'])]
aucs=[]; imp=collections.Counter(); rnd=random.Random(0)
for r in range(20):
    g=rnd.sample(gs,len(vs)*3)
    Xs=np.array([X(s) for s in vs+g]); y=np.array([1]*len(vs)+[0]*len(g))
    m=RandomForestClassifier(300,min_samples_leaf=3,random_state=r,class_weight='balanced')
    aucs.append(cross_val_score(m,Xs,y,cv=StratifiedKFold(5,shuffle=True,random_state=r),scoring='roc_auc').mean())
    m.fit(Xs,y); 
    for k,v in zip(KEYS+['grp'],m.feature_importances_): imp[k]+=v/20
print(f'AUC {np.mean(aucs):.3f} ± {np.std(aucs):.3f}   (n Griddy eli={len(vs)})')
print('ele veren özellikler:',', '.join(f'{k} {v:.3f}' for k,v in imp.most_common(8)))
