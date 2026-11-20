# Adil karşılaştırma: Griddy'nin 4 bölümü referans; tutulan 1 Griddy bölümü ile bizim 1 oyunumuz
# aynı referansa ne kadar uzak? Bizimki Griddy'nin kendi bölümleri kadar yakınsa "ayırt edilemez" demektir.
import json, subprocess, statistics as st, sys, random
v=json.load(open(__import__('os').path.join(__import__('os').path.dirname(__file__),'video.json'))); g=json.load(open(sys.argv[1])); K=int(sys.argv[2]) if len(sys.argv)>2 else 30
eps=['V3','V4','V5','V6','V7']; gd=sorted(set(x['deck'] for x in g)); random.seed(1)
def ks(ref,test):
    json.dump(ref,open('/tmp/r.json','w')); json.dump(test,open('/tmp/t.json','w'))
    o=subprocess.run(['python3','fp.py','/tmp/r.json','/tmp/t.json'],capture_output=True,text=True).stdout
    return float(o.split('ORTALAMA KS =')[1].split()[0])
gr=[];us=[]
for e in eps:
    ref=[x for x in v if x['deck'] in eps and x['deck']!=e]
    gr.append(ks(ref,[x for x in v if x['deck']==e]))
    for d in random.sample(gd,K//len(eps)): us.append(ks(ref,[x for x in g if x['deck']==d]))
print(f'Griddy bölümü → öbür 4 bölüm: {st.mean(gr):.3f}  |  bizim oyun → aynı 4 bölüm: {st.mean(us):.3f} (n={len(us)})  fark {st.mean(us)-st.mean(gr):+.3f}')
