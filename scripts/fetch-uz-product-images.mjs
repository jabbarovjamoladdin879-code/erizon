// O'zbekistonda sotiladigan qadoqlangan mahsulotlarning haqiqiy rasmlari — Open Food Facts / Open Beauty Facts
// (erkin litsenziya, countries=uzbekistan). Ishlatish: node scripts/fetch-uz-product-images.mjs [id ...]
// Natija: public/products/<id>.jpg (Commons'dagi umumiy rasmni almashtiradi), public/products/CREDITS-UZ.md
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'products');
const UA = 'ErizonMallImageFetcher/1.0 (student project)';

// id -> [qidiruv so'zlari (rus tilida — O'zbekiston qadoqlari), kategoriya filtri (ixtiyoriy), baza]
const Q = {
  'gr-01': ['мука пшеничная высший сорт'],
  'gr-02': ['рис длиннозерный'],
  'gr-03': ['рис девзира'],
  'gr-04': ['масло подсолнечное рафинированное'],
  'gr-05': ['масло хлопковое'],
  'gr-06': ['сахар песок'],
  'gr-07': ['макароны рожки'],
  'gr-08': ['гречневая крупа'],
  'gr-09': ['зира'],
  'gr-10': ['перец чёрный молотый'],
  'gr-11': ['соль йодированная'],
  'gr-12': ['чай зелёный'],
  'dr-01': ['вода питьевая негазированная'],
  'dr-02': ['вода питьевая 5 л'],
  'dr-03': ['вода минеральная газированная'],
  'dr-04': ['сок яблочный'],
  'dr-05': ['сок апельсиновый'],
  'dr-06': ['Coca-Cola'],
  'dr-07': ['лимонад тархун'],
  'dr-08': ['холодный чай лимон'],
  'dr-09': ['компот'],
  'dr-10': ['энергетический напиток'],
  'me-09': ['колбаса докторская'],
  'me-10': ['сосиски молочные'],
  'da-01': ['молоко 2.5%'],
  'da-02': ['катык'],
  'da-03': ['кефир'],
  'da-04': ['сметана'],
  'da-05': ['творог'],
  'da-06': ['масло сливочное'],
  'da-07': ['сыр голландский'],
  'da-08': ['сузьма'],
  'da-09': ['айран'],
  'da-10': ['йогурт клубника'],
  'sw-04': ['печенье сдобное'],
  'sw-05': ['шоколад молочный'],
  'sw-06': ['конфеты ассорти'],
  'sw-07': ['вафли'],
  'sw-10': ['круассан'],
  'ki-02': ['каша гречневая детская'],
  'ki-03': ['пюре яблочное детское'],
  'ki-04': ['сок детский'],
  'ki-08': ['молочная смесь детская'],
  'ch-01': ['стиральный порошок', 'beauty'],
  'ch-02': ['средство для мытья посуды', 'beauty'],
  'ch-06': ['жидкое мыло', 'beauty'],
  'ch-07': ['зубная паста', 'beauty'],
  'ch-08': ['влажные салфетки', 'beauty'],
  'co-03': ['крем для лица', 'beauty'],
  'co-04': ['крем для рук', 'beauty'],
  'co-07': ['шампунь', 'beauty'],
  'co-08': ['бальзам для волос', 'beauty'],
  'co-09': ['дезодорант', 'beauty'],
  'co-10': ['пена для бритья', 'beauty'],
};

async function search(terms, db) {
  const host = db === 'beauty' ? 'world.openbeautyfacts.org' : 'world.openfoodfacts.org';
  const params = new URLSearchParams({
    search_terms: terms, search_simple: '1', action: 'process', json: '1', page_size: '12',
    tagtype_0: 'countries', tag_contains_0: 'contains', tag_0: 'uzbekistan',
    fields: 'code,product_name,brands,image_front_url,image_front_small_url',
  });
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://${host}/cgi/search.pl?${params}`, { headers: { 'User-Agent': UA } });
      if (r.ok) return (await r.json()).products ?? [];
    } catch {
      /* qayta urinish */
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return [];
}

await mkdir(outDir, { recursive: true });
const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(Q);
const credits = [];
const missing = [];
for (const id of ids) {
  const [terms, db] = Q[id];
  const hits = (await search(terms, db)).filter((p) => p.image_front_url);
  const hit = hits[0];
  if (!hit) {
    missing.push(id);
    console.log("YO'Q ", id, terms);
    continue;
  }
  const r = await fetch(hit.image_front_url, { headers: { 'User-Agent': UA } });
  if (!r.ok) {
    missing.push(id);
    console.log('XATO', id, r.status);
    continue;
  }
  await writeFile(path.join(outDir, `${id}.jpg`), Buffer.from(await r.arrayBuffer()));
  credits.push(`- ${id}: ${hit.brands ?? ''} — ${hit.product_name ?? ''} (barcode ${hit.code}, ${db === 'beauty' ? 'Open Beauty Facts' : 'Open Food Facts'}, CC-BY-SA)`);
  console.log('OK  ', id, '<-', hit.brands, '|', hit.product_name);
  await new Promise((res) => setTimeout(res, 700));
}
if (!only.length) await writeFile(path.join(outDir, 'CREDITS-UZ.md'), `# O'zbekiston do'konlaridagi mahsulotlar (Open Food Facts / Open Beauty Facts)\n\n${credits.join('\n')}\n`);
const present = (await readdir(outDir))
  .filter((f) => f.endsWith('.jpg'))
  .map((f) => f.replace(/\.jpg$/, ''))
  .sort();
await writeFile(
  path.join(root, 'shared', 'productImages.ts'),
  `// Avtomatik yaratiladi: scripts/fetch-product-images.mjs, scripts/fetch-uz-product-images.mjs\n/** public/products/<id>.jpg rasmi mavjud mahsulotlar */\nexport const PRODUCT_PHOTO_IDS: ReadonlySet<string> = new Set(${JSON.stringify(present)});\n`,
);
console.log(`\nTayyor. Topilmadi: ${missing.join(', ') || '—'}`);
