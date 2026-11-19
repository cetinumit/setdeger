// data/havuz.json -> public/havuz.json (kompakt: ilk eleman meta, sonra her satır bir kart dizisi)
import fs from 'node:fs';
const src = JSON.parse(fs.readFileSync('data/havuz.json', 'utf8'));
const cols = ['id','oyuncu_id','oyuncu','mevki','sezon','kart_deger','kart_yas','lig','mac','gol','asist','yenilen_gol','guncel_deger','guncel_yas','guncel_kulup','uyruk','zirve_deger','kar','etiketler'];
const lines = [JSON.stringify({ veri_tarihi: src.veri_tarihi, kaynak: src.kaynak, cols })];
for (const k of src.kartlar) lines.push(JSON.stringify(cols.map(c => k[c])));
fs.writeFileSync('public/havuz.json', '[\n' + lines.join(',\n') + '\n]\n');
console.log('public/havuz.json', src.kartlar.length, 'kart');
