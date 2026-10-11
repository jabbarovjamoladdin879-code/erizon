// Mahsulot rasmlarini Wikimedia Commons'dan (erkin litsenziyali) yuklab, public/products/<id>.jpg ga saqlaydi.
// Ishlatish: node scripts/fetch-product-images.mjs [id1 id2 ...]   (id berilmasa — hammasi)
// Natija: public/products/*.jpg, shared/productImages.ts (mavjud rasmlar ro'yxati), public/products/CREDITS.md
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'products');

// id -> Commons qidiruv so'rovi (aniq mahsulot fotosi uchun)
const Q = {
  'cl-01': 'men white dress shirt', 'cl-02': 'blue jeans trousers', 'cl-03': 'tracksuit sportswear', 'cl-04': 'men winter jacket parka',
  'cl-05': 'summer dress woman', 'cl-06': 'women blouse', 'cl-07': 'knitted sweater', 'cl-08': 'women wool coat',
  'cl-09': 'children t-shirt', 'cl-10': 'child snowsuit winter', 'cl-11': 'school uniform', 'cl-12': 'children pajamas',
  'gr-01': 'wheat flour bag', 'gr-02': 'uncooked white rice grains', 'gr-03': 'rice grains devzira', 'gr-04': 'sunflower oil bottle',
  'gr-05': 'cottonseed oil', 'gr-06': 'white sugar', 'gr-07': 'pasta penne rigate', 'gr-08': 'buckwheat groats',
  'gr-09': 'cumin seeds', 'gr-10': 'ground black pepper', 'gr-11': 'table salt', 'gr-12': 'green tea leaves',
  'dr-01': 'bottled water', 'dr-02': 'water bottle 5 litre', 'dr-03': 'sparkling mineral water bottle', 'dr-04': 'apple juice glass',
  'dr-05': 'orange juice glass', 'dr-06': 'cola bottle', 'dr-07': 'tarragon lemonade', 'dr-08': 'iced tea lemon',
  'dr-09': 'apricot compote', 'dr-10': 'energy drink can',
  'me-01': 'raw beef meat', 'me-02': 'beef ribs raw', 'me-03': 'raw lamb meat', 'me-04': 'lamb leg raw',
  'me-05': 'whole raw chicken', 'me-06': 'chicken breast fillet raw', 'me-07': 'chicken thighs raw', 'me-08': 'ground meat minced',
  'me-09': 'boiled sausage sliced', 'me-10': 'sausages frankfurter', 'me-11': 'kazy horse meat sausage',
  'ff-01': 'hamburger', 'ff-02': 'cheeseburger', 'ff-03': 'double cheeseburger', 'ff-04': 'beef lavash wrap',
  'ff-05': 'chicken wrap lavash', 'ff-06': 'hot dog', 'ff-07': 'pizza margherita', 'ff-08': 'pepperoni pizza',
  'ff-09': 'french fries', 'ff-10': 'chicken nuggets', 'ff-11': 'shawarma',
  'da-01': 'glass of milk', 'da-02': 'katyk yogurt', 'da-03': 'kefir', 'da-04': 'sour cream',
  'da-05': 'cottage cheese tvorog', 'da-06': 'butter block', 'da-07': 'gouda cheese', 'da-08': 'suzma strained yogurt',
  'da-09': 'ayran drink', 'da-10': 'strawberry yogurt',
  'pr-01': 'green apple', 'pr-02': 'bananas', 'pr-03': 'tomatoes', 'pr-04': 'cucumbers',
  'pr-05': 'potatoes', 'pr-06': 'onions', 'pr-07': 'yellow carrots', 'pr-08': 'lemon',
  'pr-09': 'husayni grapes', 'pr-10': 'melon', 'pr-11': 'fresh herbs dill cilantro',
  'sw-01': 'uzbek tandoor bread non', 'sw-02': 'bread loaf', 'sw-03': 'napoleon cake', 'sw-04': 'milk biscuits cookies',
  'sw-05': 'milk chocolate bar', 'sw-06': 'assorted chocolates candy', 'sw-07': 'wafer cookies', 'sw-08': 'pishmaniye halva',
  'sw-09': 'chak-chak', 'sw-10': 'chocolate croissant',
  'ch-01': 'laundry detergent powder', 'ch-02': 'dishwashing liquid', 'ch-03': 'bleach bottle', 'ch-04': 'floor cleaner bottle',
  'ch-05': 'toilet paper rolls', 'ch-06': 'liquid soap dispenser', 'ch-07': 'toothpaste tube', 'ch-08': 'wet wipes pack',
  'ch-09': 'garbage bags roll', 'ch-10': 'glass cleaner spray',
  'co-01': 'perfume bottle men', 'co-02': 'perfume bottle women', 'co-03': 'face cream jar', 'co-04': 'hand cream tube',
  'co-05': 'lipstick', 'co-06': 'mascara', 'co-07': 'shampoo bottle', 'co-08': 'hair conditioner bottle',
  'co-09': 'roll-on deodorant', 'co-10': 'shaving foam can',
  'ki-01': 'baby diapers', 'ki-02': 'baby cereal porridge', 'ki-03': 'baby food apple puree jar', 'ki-04': 'juice box children',
  'ki-05': 'lego city set', 'ki-06': 'teddy bear toy', 'ki-07': 'baby shampoo bottle', 'ki-08': 'infant formula milk powder',
  'ki-09': 'remote control car toy', 'ki-10': 'colored pencils set',
  'home-01': 'electric kettle', 'home-02': 'cast iron kazan cauldron', 'home-03': 'non-stick frying pan', 'home-04': 'dinnerware set plates',
  'home-05': 'uzbek tea bowls piala', 'home-06': 'towels set folded', 'home-07': 'duvet blanket bed', 'home-08': 'pillow',
  'home-09': 'steam iron', 'home-10': 'LED light bulb E27',
};

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'ErizonMallImageFetcher/1.0 (student project)';
const BAD = /(logo|icon|diagram|map|flag|svg|drawing|painting|poster|stamp|coat of arms|\bpdf\b|book|screenshot)/i;

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('API xato: ' + url);
}

async function find(query) {
  const data = await api({
    action: 'query', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12',
    prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '640',
  });
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== 'image/jpeg' || BAD.test(p.title)) continue;
    if (ii.width < 500 || ii.height < 400) continue;
    const ratio = ii.width / ii.height;
    if (ratio < 0.6 || ratio > 1.9) continue;
    const meta = ii.extmetadata ?? {};
    return {
      url: ii.thumburl ?? ii.url,
      title: p.title,
      page: ii.descriptionurl,
      license: meta.LicenseShortName?.value ?? '',
      author: (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim(),
    };
  }
  return null;
}

await mkdir(outDir, { recursive: true });
const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(Q);
const credits = [];
const failed = [];
for (const id of ids) {
  const file = path.join(outDir, `${id}.jpg`);
  try {
    const hit = await find(Q[id]);
    if (!hit) {
      failed.push(id);
      console.log("YO'Q ", id, Q[id]);
      continue;
    }
    const r = await fetch(hit.url, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await writeFile(file, Buffer.from(await r.arrayBuffer()));
    credits.push(`- ${id}: [${hit.title}](${hit.page}) — ${hit.license}${hit.author ? ', ' + hit.author : ''}`);
    console.log('OK  ', id, '<-', hit.title);
  } catch (e) {
    failed.push(id);
    console.log('XATO', id, String(e.message ?? e));
  }
  await new Promise((res) => setTimeout(res, 400));
}

if (!only.length) await writeFile(path.join(outDir, 'CREDITS.md'), `# Rasm manbalari (Wikimedia Commons)\n\n${credits.join('\n')}\n`);
const present = (await readdir(outDir))
  .filter((f) => f.endsWith('.jpg'))
  .map((f) => f.replace(/\.jpg$/, ''))
  .sort();
await writeFile(
  path.join(root, 'shared', 'productImages.ts'),
  `// Avtomatik yaratiladi: node scripts/fetch-product-images.mjs\n/** public/products/<id>.jpg rasmi mavjud mahsulotlar */\nexport const PRODUCT_PHOTO_IDS: ReadonlySet<string> = new Set(${JSON.stringify(present)});\n`,
);
console.log(`\nTayyor: ${present.length} ta rasm. Topilmadi: ${failed.join(', ') || '—'}`);
