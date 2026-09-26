import type { CategoryId, Gender, Product, ProductColor, Unit } from './types.js';

/**
 * Mock mahsulotlar. Kelajakda bu ma'lumotlar backend API'dan keladi
 * (qarang: src/services/catalogService.ts).
 */

interface Seed {
  id: string;
  name: string;
  price: number;
  old?: number;
  r: number;
  n: number;
  unit?: Unit;
  out?: boolean;
  e: string;
  d: string;
  exp?: string;
  mf?: string;
  gender?: Gender;
  sizes?: string[];
  colors?: ProductColor[];
  prep?: number;
  cut?: boolean;
  specs?: Record<string, string>;
  rel?: string[];
}

const BASE_DATE = Date.UTC(2026, 8, 20);
let seq = 0;

function build(
  categoryId: CategoryId,
  hue: number,
  defaults: { unit: Unit; halal?: boolean },
  seeds: Seed[],
): Product[] {
  return seeds.map((s, i) => {
    seq += 1;
    const daysAgo = (seq * 7 + i * 3) % 58;
    return {
      id: s.id,
      name: s.name,
      categoryId,
      price: s.price,
      oldPrice: s.old,
      rating: s.r,
      reviewsCount: s.n,
      description: s.d,
      unit: s.unit ?? defaults.unit,
      inStock: !s.out,
      emoji: s.e,
      hue: (hue + i * 11) % 360,
      createdAt: new Date(BASE_DATE - daysAgo * 86_400_000).toISOString(),
      popularity: Math.round(s.n * s.r),
      expiry: s.exp,
      manufacturer: s.mf,
      halal: defaults.halal,
      gender: s.gender,
      sizes: s.sizes,
      colors: s.colors,
      prepTime: s.prep,
      cuttable: s.cut,
      specs: s.specs,
      relatedIds: s.rel,
    };
  });
}

const ADULT = ['S', 'M', 'L', 'XL', 'XXL'];
const KIDS = ['3-4', '5-6', '7-8', '9-10', '11-12'];
const C = {
  black: { name: 'Qora', hex: '#111827' },
  white: { name: 'Oq', hex: '#f9fafb' },
  navy: { name: "To'q ko'k", hex: '#1e3a8a' },
  grey: { name: 'Kulrang', hex: '#6b7280' },
  beige: { name: 'Bej', hex: '#d6c3a3' },
  red: { name: 'Qizil', hex: '#dc2626' },
  green: { name: 'Yashil', hex: '#15803d' },
  pink: { name: 'Pushti', hex: '#f472b6' },
  blue: { name: 'Havorang', hex: '#60a5fa' },
  brown: { name: 'Jigarrang', hex: '#78350f' },
};

const clothing = build('clothing', 262, { unit: 'pcs' }, [
  { id: 'cl-01', name: "Erkaklar klassik ko'ylagi", price: 189_000, old: 239_000, r: 4.7, n: 128, e: '👔', gender: 'men', sizes: ADULT, colors: [C.white, C.blue, C.black], d: "100% paxtadan tikilgan klassik ko'ylak. Ofis va bayramlar uchun mos, dazmollash oson.", mf: 'Beruniy Tekstil', specs: { Material: '100% paxta', Mavsum: 'Barcha mavsum' } },
  { id: 'cl-02', name: 'Erkaklar jinsi shimi', price: 249_000, r: 4.6, n: 94, e: '👖', gender: 'men', sizes: ADULT, colors: [C.navy, C.black, C.grey], d: "Zich denimdan tikilgan, to'g'ri bichimli jinsi shim. Kundalik kiyish uchun qulay.", mf: 'Denim Style', specs: { Material: '98% paxta, 2% elastan', Bichim: "To'g'ri" } },
  { id: 'cl-03', name: 'Sport kostyumi', price: 329_000, old: 399_000, r: 4.8, n: 211, e: '🏃', gender: 'men', sizes: ADULT, colors: [C.black, C.navy, C.grey], d: "Nafas oladigan matodan tikilgan sport kostyumi — mashg'ulot va dam olish uchun.", mf: 'ActiveWear', specs: { Material: 'Poliester, paxta', Mavsum: 'Bahor-kuz' } },
  { id: 'cl-04', name: 'Erkaklar qishki kurtkasi', price: 690_000, old: 850_000, r: 4.9, n: 76, e: '🧥', gender: 'men', sizes: ADULT, colors: [C.black, C.green], d: "-25°C gacha issiq saqlaydigan, suv o'tkazmaydigan qishki kurtka.", mf: 'NordTex', specs: { "To'ldiruvchi": 'Sintepon 300 g/m²', Harorat: '-25°C gacha' } },
  { id: 'cl-05', name: "Ayollar yozgi ko'ylagi (platye)", price: 279_000, r: 4.7, n: 143, e: '👗', gender: 'women', sizes: ADULT, colors: [C.pink, C.white, C.blue], d: 'Yengil shifon matodan tikilgan nafis yozgi platye.', mf: 'Lola Fashion', specs: { Material: 'Shifon', Uzunlik: 'Midi' } },
  { id: 'cl-06', name: 'Ayollar bluzkasi', price: 159_000, old: 199_000, r: 4.5, n: 88, e: '👚', gender: 'women', sizes: ADULT, colors: [C.white, C.beige, C.pink], d: "Ofis uslubidagi yumshoq bluzka, uzoq kiyishda ham g'ijimlanmaydi.", mf: 'Lola Fashion', specs: { Material: 'Viskoza' } },
  { id: 'cl-07', name: 'Ayollar trikotaj sviteri', price: 219_000, r: 4.6, n: 67, e: '🧶', gender: 'women', sizes: ADULT, colors: [C.beige, C.grey, C.red], d: 'Issiq va yumshoq trikotaj sviter — salqin kunlar uchun ideal.', mf: 'WarmKnit', specs: { Material: "Jun aralash", Mavsum: 'Kuz-qish' } },
  { id: 'cl-08', name: 'Ayollar paltosi', price: 790_000, old: 950_000, r: 4.8, n: 45, e: '🧥', gender: 'women', sizes: ADULT, colors: [C.beige, C.black, C.brown], d: 'Klassik bichimdagi kashemir aralash palto.', mf: 'Elegance', specs: { Material: 'Kashemir aralash', Uzunlik: 'Tizzagacha' } },
  { id: 'cl-09', name: 'Bolalar futbolkasi', price: 59_000, r: 4.6, n: 156, e: '👕', gender: 'kids', sizes: KIDS, colors: [C.blue, C.red, C.green], d: 'Tabiiy paxtadan tikilgan rangli bolalar futbolkasi.', mf: 'Beruniy Tekstil', specs: { Material: '100% paxta' } },
  { id: 'cl-10', name: 'Bolalar qishki kombinezoni', price: 459_000, old: 520_000, r: 4.9, n: 58, e: '⛄', gender: 'kids', sizes: KIDS, colors: [C.pink, C.blue], d: "Issiq, yengil va suv o'tkazmaydigan bolalar kombinezoni.", mf: 'KidsWarm', specs: { Harorat: '-20°C gacha' } },
  { id: 'cl-11', name: 'Maktab formasi (to\'plam)', price: 349_000, r: 4.7, n: 102, unit: 'set', e: '🎒', gender: 'kids', sizes: KIDS, colors: [C.navy, C.black], d: "Kostyum-shim va jiletdan iborat maktab formasi to'plami.", mf: 'School Line', specs: { "Tarkibi": 'Pidjak, shim, jilet' } },
  { id: 'cl-12', name: 'Bolalar pijamasi', price: 89_000, r: 4.5, n: 73, e: '🌙', gender: 'kids', sizes: KIDS, colors: [C.blue, C.pink], out: true, d: 'Yumshoq flanel matodan tikilgan bolalar pijamasi.', mf: 'KidsWarm', specs: { Material: 'Flanel' } },
]);

const grocery = build('grocery', 38, { unit: 'pcs' }, [
  { id: 'gr-01', name: 'Bug\'doy uni oliy nav, 2 kg', price: 16_000, r: 4.8, n: 312, unit: 'pack', e: '🌾', d: 'Oliy navli bug\'doy unidan non, somsa va xamir ovqatlar tayyorlash mumkin.', exp: '2027-03-01', mf: 'Xorazm Don Mahsulotlari', specs: { "Og'irligi": '2 kg' } },
  { id: 'gr-02', name: 'Guruch "Lazer"', price: 24_000, old: 27_000, r: 4.9, n: 405, unit: 'kg', e: '🍚', d: 'Palov uchun eng mashhur guruch navi — donador va xushbo\'y.', exp: '2027-06-01', mf: 'Xorazm Guruch', specs: { Nav: 'Lazer' }, rel: ['me-03', 'gr-04', 'pr-07', 'pr-06', 'gr-09'] },
  { id: 'gr-03', name: 'Guruch "Devzira"', price: 38_000, r: 4.9, n: 188, unit: 'kg', e: '🍚', d: 'Farg\'ona devzirasi — to\'yimli, bayramona palov uchun.', exp: '2027-06-01', mf: "Farg'ona Agro", specs: { Nav: 'Devzira' } },
  { id: 'gr-04', name: "Kungaboqar yog'i, 1 L", price: 21_000, old: 24_000, r: 4.7, n: 276, unit: 'l', e: '🌻', d: "Tozalangan, hidsizlantirilgan kungaboqar yog'i.", exp: '2027-01-15', mf: 'Oltin Yog\'', specs: { Hajmi: '1 L' } },
  { id: 'gr-05', name: "Paxta yog'i, 1 L", price: 23_000, r: 4.8, n: 198, unit: 'l', e: '🍶', d: "An'anaviy o'zbek palovi uchun paxta yog'i.", exp: '2027-01-15', mf: 'Oltin Yog\'', specs: { Hajmi: '1 L' } },
  { id: 'gr-06', name: 'Shakar, 1 kg', price: 13_500, r: 4.7, n: 221, unit: 'pack', e: '🍬', d: 'Oq kristall shakar.', exp: '2028-01-01', mf: 'Xorazm Shakar', specs: { "Og'irligi": '1 kg' } },
  { id: 'gr-07', name: 'Makaron "Shoxcha", 400 g', price: 7_500, r: 4.5, n: 164, unit: 'pack', e: '🍝', d: "Qattiq bug'doy navidan tayyorlangan makaron.", exp: '2027-09-01', mf: 'Pasta Uz' },
  { id: 'gr-08', name: 'Grechka, 900 g', price: 17_000, old: 19_500, r: 4.6, n: 97, unit: 'pack', e: '🥣', d: "Tozalangan grechka yormasi — foydali nonushta uchun.", exp: '2027-04-01', mf: 'Don Plus' },
  { id: 'gr-09', name: 'Zira, 50 g', price: 9_000, r: 4.9, n: 142, unit: 'pack', e: '🌿', d: 'Palov va go\'sht taomlari uchun xushbo\'y zira.', exp: '2027-12-01', mf: 'Ziravorlar Olami' },
  { id: 'gr-10', name: 'Qora murch (maydalangan), 50 g', price: 8_000, r: 4.7, n: 119, unit: 'pack', e: '🧂', d: "Go'sht va salatlar uchun maydalangan qora murch.", exp: '2027-12-01', mf: 'Ziravorlar Olami' },
  { id: 'gr-11', name: "Yodlangan tuz, 1 kg", price: 3_500, r: 4.6, n: 87, unit: 'pack', e: '🧂', d: 'Yodlangan osh tuzi.', exp: '2029-01-01', mf: 'Qoraqalpoq Tuz' },
  { id: 'gr-12', name: "Ko'k choy №95, 100 g", price: 12_000, r: 4.8, n: 260, unit: 'pack', e: '🍵', d: "An'anaviy ko'k choy — dasturxon ko'rki.", exp: '2028-05-01', mf: 'Choy Uz', out: true },
]);

const drinks = build('drinks', 199, { unit: 'pcs' }, [
  { id: 'dr-01', name: 'Toza buloq suvi, 1.5 L', price: 4_000, r: 4.8, n: 540, e: '💧', d: "Gazsiz, tabiiy buloq suvi.", exp: '2027-08-01', mf: 'Toza Buloq' },
  { id: 'dr-02', name: 'Buloq suvi, 5 L', price: 11_000, old: 12_500, r: 4.8, n: 210, e: '🚰', d: 'Oila uchun qulay 5 litrlik idishdagi ichimlik suvi.', exp: '2027-08-01', mf: 'Toza Buloq' },
  { id: 'dr-03', name: 'Gazli mineral suv, 0.5 L', price: 4_500, r: 4.6, n: 180, e: '🥤', d: 'Tabiiy minerallarga boy gazli suv.', exp: '2027-05-01', mf: 'Chortoq Mineral' },
  { id: 'dr-04', name: 'Olma sharbati, 1 L', price: 15_000, r: 4.7, n: 133, e: '🧃', d: "100% tabiiy olma sharbati, shakar qo'shilmagan.", exp: '2027-02-01', mf: 'Bog\'bon' },
  { id: 'dr-05', name: 'Apelsin sharbati, 1 L', price: 17_000, old: 19_000, r: 4.6, n: 121, e: '🍊', d: 'Pulpali apelsin sharbati.', exp: '2027-02-01', mf: 'Bog\'bon' },
  { id: 'dr-06', name: 'Kola, 1.5 L', price: 13_000, r: 4.7, n: 450, e: '🥤', d: 'Klassik gazli ichimlik — fast-food uchun eng yaxshi hamroh.', exp: '2027-03-01', mf: 'Asia Drinks' },
  { id: 'dr-07', name: 'Limonad "Tarxun", 1 L', price: 9_000, r: 4.5, n: 98, e: '🍋', d: "Tarxun ta'mli klassik limonad.", exp: '2027-03-01', mf: 'Asia Drinks' },
  { id: 'dr-08', name: 'Muzli choy limonli, 1 L', price: 11_000, r: 4.4, n: 76, e: '🧃', d: 'Limon ta\'mli sovuq qora choy.', exp: '2027-01-01', mf: 'Asia Drinks' },
  { id: 'dr-09', name: 'Uy kompoti (o\'rik), 1 L', price: 14_000, r: 4.9, n: 64, e: '🍑', d: "Uy usulida tayyorlangan o'rik kompoti.", exp: '2027-06-01', mf: 'Beruniy Konserva' },
  { id: 'dr-10', name: 'Energetik ichimlik, 0.45 L', price: 12_000, r: 4.3, n: 59, e: '⚡', d: 'Tetiklashtiruvchi energetik ichimlik. 18 yoshdan kichiklarga tavsiya etilmaydi.', exp: '2027-04-01', mf: 'Asia Drinks' },
]);

const meat = build('meat', 355, { unit: 'kg', halal: true }, [
  { id: 'me-01', name: "Mol go'shti (lahm)", price: 98_000, old: 105_000, r: 4.9, n: 320, e: '🥩', cut: true, d: "Yangi so'yilgan yosh mol go'shti, lahm qismi.", exp: 'Sovutgichda 3 kun', mf: 'Beruniy Go\'sht Kombinati', rel: ['gr-09', 'gr-10', 'pr-06', 'gr-02'] },
  { id: 'me-02', name: "Mol go'shti (qovurg'a)", price: 82_000, r: 4.7, n: 145, e: '🍖', cut: true, d: "Sho'rva va qozon kabob uchun mol qovurg'asi.", exp: 'Sovutgichda 3 kun', mf: 'Beruniy Go\'sht Kombinati', rel: ['gr-09', 'pr-05', 'pr-06'] },
  { id: 'me-03', name: "Qo'y go'shti", price: 112_000, r: 4.9, n: 260, e: '🍖', cut: true, d: "Palov uchun eng yaxshi tanlov — yangi qo'y go'shti.", exp: 'Sovutgichda 3 kun', mf: 'Qoraqalpoq Chorva', rel: ['gr-02', 'gr-09', 'pr-07', 'home-02'] },
  { id: 'me-04', name: "Qo'y go'shti (son qismi)", price: 118_000, old: 125_000, r: 4.8, n: 88, e: '🍗', cut: true, d: "Shashlik va dimlama uchun qo'y soni.", exp: 'Sovutgichda 3 kun', mf: 'Qoraqalpoq Chorva' },
  { id: 'me-05', name: 'Tovuq (butun)', price: 36_000, r: 4.7, n: 410, e: '🐔', cut: true, d: 'Sovutilgan butun broyler tovuq.', exp: 'Sovutgichda 5 kun', mf: 'Xorazm Parranda' },
  { id: 'me-06', name: 'Tovuq filesi', price: 52_000, old: 56_000, r: 4.8, n: 290, e: '🍗', cut: true, d: "Suyaksiz, terisiz tovuq ko'krak filesi.", exp: 'Sovutgichda 5 kun', mf: 'Xorazm Parranda' },
  { id: 'me-07', name: 'Tovuq son qismi', price: 39_000, r: 4.6, n: 175, e: '🍗', cut: true, d: "Qovurish va grill uchun tovuq sonlari.", exp: 'Sovutgichda 5 kun', mf: 'Xorazm Parranda' },
  { id: 'me-08', name: 'Aralash qiyma (mol + qo\'y)', price: 92_000, r: 4.8, n: 199, e: '🥩', d: 'Manti, chuchvara va kotlet uchun tayyor qiyma.', exp: 'Sovutgichda 2 kun', mf: 'Beruniy Go\'sht Kombinati' },
  { id: 'me-09', name: 'Kolbasa "Doktorskaya"', price: 78_000, r: 4.5, n: 132, e: '🌭', d: "Mol go'shtidan tayyorlangan pishirilgan kolbasa.", exp: '2026-11-15', mf: 'Halol Kolbasa' },
  { id: 'me-10', name: 'Sosiska "Sutli"', price: 64_000, old: 69_000, r: 4.4, n: 118, e: '🌭', d: 'Bolalar ham sevadigan yumshoq sosiskalar.', exp: '2026-11-10', mf: 'Halol Kolbasa' },
  { id: 'me-11', name: 'Qazi (uy usulida)', price: 185_000, r: 4.9, n: 54, e: '🥓', out: true, d: "An'anaviy usulda tayyorlangan ot go'shtidan qazi.", exp: 'Sovutgichda 10 kun', mf: 'Qoraqalpoq Chorva' },
]);

const fastfood = build('fastfood', 24, { unit: 'pcs', halal: true }, [
  { id: 'ff-01', name: 'Klassik burger', price: 32_000, r: 4.8, n: 520, e: '🍔', prep: 12, d: "Mol go'shti kotleti, yangi sabzavotlar va maxsus sous.", mf: 'Erizon Kitchen', rel: ['dr-06', 'ff-09', 'dr-07'] },
  { id: 'ff-02', name: 'Chizburger', price: 36_000, old: 39_000, r: 4.8, n: 430, e: '🍔', prep: 12, d: "Ikki qavat cheddar pishlog'i bilan suvli burger.", mf: 'Erizon Kitchen', rel: ['dr-06', 'ff-09'] },
  { id: 'ff-03', name: 'Dabl burger', price: 48_000, r: 4.9, n: 310, e: '🍔', prep: 15, d: 'Ikki kotlet, pishloq, tuzlangan bodring va karamellangan piyoz.', mf: 'Erizon Kitchen', rel: ['dr-06', 'ff-09'] },
  { id: 'ff-04', name: "Lavash go'shtli", price: 34_000, r: 4.8, n: 610, e: '🌯', prep: 10, d: "Mol go'shti, pomidor, bodring, chips va sarimsoqli sous.", mf: 'Erizon Kitchen', rel: ['dr-06', 'dr-07'] },
  { id: 'ff-05', name: 'Lavash tovuqli', price: 30_000, r: 4.7, n: 480, e: '🌯', prep: 10, d: 'Grilda pishirilgan tovuq go\'shti bilan lavash.', mf: 'Erizon Kitchen', rel: ['dr-06'] },
  { id: 'ff-06', name: 'Hot-dog', price: 18_000, r: 4.5, n: 260, e: '🌭', prep: 7, d: 'Yumshoq bulochka, sosiska, xantal va ketchup.', mf: 'Erizon Kitchen', rel: ['dr-06'] },
  { id: 'ff-07', name: 'Pitsa "Margarita" (30 sm)', price: 69_000, old: 79_000, r: 4.7, n: 190, e: '🍕', prep: 20, d: 'Pomidor sousi, mozzarella va rayhon.', mf: 'Erizon Kitchen', rel: ['dr-06', 'dr-04'] },
  { id: 'ff-08', name: 'Pitsa "Pepperoni" (30 sm)', price: 85_000, r: 4.8, n: 240, e: '🍕', prep: 20, d: 'Halol mol go\'shtidan pepperoni va mozzarella.', mf: 'Erizon Kitchen', rel: ['dr-06'] },
  { id: 'ff-09', name: 'Kartoshka fri', price: 15_000, r: 4.6, n: 580, e: '🍟', prep: 7, d: 'Tilla rang, qarsildoq kartoshka fri.', mf: 'Erizon Kitchen', rel: ['ff-01', 'dr-06'] },
  { id: 'ff-10', name: 'Nagetslar (9 dona)', price: 29_000, r: 4.6, n: 170, e: '🍗', prep: 10, d: "Qarsildoq tovuq nagetslari, sous bilan.", mf: 'Erizon Kitchen', rel: ['ff-09', 'dr-06'] },
  { id: 'ff-11', name: 'Shaurma', price: 33_000, r: 4.7, n: 350, e: '🥙', prep: 10, d: "Tandir nonida tovuq go'shti va sabzavotlar.", mf: 'Erizon Kitchen', rel: ['dr-06'] },
]);

const dairy = build('dairy', 210, { unit: 'pcs' }, [
  { id: 'da-01', name: 'Sut 2.5%, 1 L', price: 11_000, r: 4.8, n: 390, unit: 'l', e: '🥛', d: 'Pasterizatsiyalangan sigir suti.', exp: '2026-10-02', mf: 'Beruniy Sut' },
  { id: 'da-02', name: 'Qatiq 3.2%, 1 L', price: 12_000, r: 4.9, n: 270, unit: 'l', e: '🥛', d: "An'anaviy uy qatig'i ta'mi.", exp: '2026-10-01', mf: 'Beruniy Sut' },
  { id: 'da-03', name: 'Kefir 2.5%, 1 L', price: 12_500, r: 4.6, n: 140, unit: 'l', e: '🥛', d: 'Hazm qilishga yordam beruvchi kefir.', exp: '2026-10-03', mf: 'Beruniy Sut' },
  { id: 'da-04', name: 'Smetana 20%, 400 g', price: 16_000, old: 18_000, r: 4.8, n: 210, e: '🥣', d: 'Quyuq, yangi smetana.', exp: '2026-10-05', mf: 'Beruniy Sut' },
  { id: 'da-05', name: 'Tvorog 9%, 500 g', price: 24_000, r: 4.7, n: 120, e: '🧀', d: 'Yumshoq donador tvorog.', exp: '2026-10-04', mf: 'Xorazm Sut' },
  { id: 'da-06', name: "Sariyog' 72.5%, 200 g", price: 22_000, r: 4.7, n: 230, e: '🧈', d: "Tabiiy qaymoqdan tayyorlangan sariyog'.", exp: '2026-12-01', mf: 'Xorazm Sut' },
  { id: 'da-07', name: 'Pishloq "Gollandskiy"', price: 118_000, old: 128_000, r: 4.8, n: 96, unit: 'kg', e: '🧀', d: 'Qattiq navli pishloq, kg bo\'yicha tortib beriladi.', exp: '2027-01-01', mf: 'Cheese Master' },
  { id: 'da-08', name: 'Suzma, 500 g', price: 19_000, r: 4.9, n: 84, e: '🥣', d: "Quyuq suzma — salat va sho'rvalar uchun.", exp: '2026-10-06', mf: 'Beruniy Sut' },
  { id: 'da-09', name: 'Ayron, 0.5 L', price: 6_000, r: 4.7, n: 190, unit: 'l', e: '🥛', d: 'Salqinlatuvchi tuzli ayron.', exp: '2026-10-03', mf: 'Beruniy Sut' },
  { id: 'da-10', name: 'Yogurt qulupnayli, 250 g', price: 8_500, r: 4.5, n: 160, e: '🍓', d: "Qulupnay bo'lakchalari bilan yogurt.", exp: '2026-10-10', mf: 'Xorazm Sut', out: true },
]);

const produce = build('produce', 130, { unit: 'kg' }, [
  { id: 'pr-01', name: 'Olma "Semerenko"', price: 14_000, r: 4.7, n: 230, e: '🍏', d: "Nordon-shirin yashil olma.", mf: 'Xorazm bog\'lari' },
  { id: 'pr-02', name: 'Banan', price: 22_000, old: 25_000, r: 4.8, n: 310, e: '🍌', d: 'Pishgan, shirin banan.', mf: 'Ekvador (import)' },
  { id: 'pr-03', name: 'Pomidor', price: 12_000, r: 4.6, n: 280, e: '🍅', d: 'Mahalliy issiqxona pomidori.', mf: 'Beruniy fermer xo\'jaligi' },
  { id: 'pr-04', name: 'Bodring', price: 10_000, r: 4.6, n: 250, e: '🥒', d: 'Yangi uzilgan qarsildoq bodring.', mf: 'Beruniy fermer xo\'jaligi' },
  { id: 'pr-05', name: 'Kartoshka', price: 6_000, r: 4.7, n: 360, e: '🥔', d: 'Qovurish va sho\'rva uchun kartoshka.', mf: 'Mahalliy' },
  { id: 'pr-06', name: 'Piyoz', price: 4_500, r: 4.7, n: 300, e: '🧅', d: 'Oq piyoz.', mf: 'Mahalliy' },
  { id: 'pr-07', name: 'Sariq sabzi (palov uchun)', price: 7_000, old: 8_000, r: 4.9, n: 270, e: '🥕', d: 'Palov uchun maxsus sariq sabzi.', mf: 'Xorazm' },
  { id: 'pr-08', name: 'Limon', price: 28_000, r: 4.6, n: 110, e: '🍋', d: 'Xushbo\'y, sershira limon.', mf: 'Turkiya (import)' },
  { id: 'pr-09', name: 'Uzum "Husayni"', price: 18_000, r: 4.9, n: 140, e: '🍇', d: "Shirin, uzunchoq Husayni uzumi.", mf: 'Xorazm bog\'lari' },
  { id: 'pr-10', name: 'Qovun "Gulobi"', price: 9_000, r: 4.9, n: 190, e: '🍈', d: "Xorazmning mashhur shirin qovuni.", mf: 'Xorazm' },
  { id: 'pr-11', name: "Ko'katlar to'plami", price: 5_000, r: 4.5, n: 70, unit: 'set', e: '🌿', d: "Shivit, ukrop va kashnich to'plami.", mf: 'Mahalliy' },
]);

const sweets = build('sweets', 325, { unit: 'pcs' }, [
  { id: 'sw-01', name: 'Tandir non', price: 4_000, r: 4.9, n: 620, e: '🥯', d: 'Har kuni ertalab yopiladigan issiq tandir non.', exp: 'Tayyorlangan kundan 2 kun', mf: 'Erizon Novvoyxonasi' },
  { id: 'sw-02', name: 'Buxanka non', price: 3_500, r: 4.6, n: 240, e: '🍞', d: 'Yumshoq buxanka non.', exp: '3 kun', mf: 'Beruniy Non' },
  { id: 'sw-03', name: 'Tort "Napoleon", 1 kg', price: 95_000, old: 110_000, r: 4.8, n: 130, e: '🍰', d: 'Qavatma-qavat xamir va qaymoqli krem.', exp: '5 kun (sovutgichda)', mf: 'Erizon Qandolatxonasi' },
  { id: 'sw-04', name: 'Pechenye "Sutli", 400 g', price: 14_000, r: 4.5, n: 150, unit: 'pack', e: '🍪', d: 'Choy uchun sutli pechenye.', exp: '2027-02-01', mf: 'Shirin Dunyo' },
  { id: 'sw-05', name: 'Sutli shokolad, 90 g', price: 12_000, r: 4.7, n: 280, e: '🍫', d: 'Yumshoq sutli shokolad.', exp: '2027-05-01', mf: 'ChocoLand' },
  { id: 'sw-06', name: 'Konfet assorti', price: 68_000, r: 4.6, n: 120, unit: 'kg', e: '🍬', d: 'Turli xil shokoladli konfetlar aralashmasi.', exp: '2027-03-01', mf: 'Shirin Dunyo' },
  { id: 'sw-07', name: 'Vafli "Limonli", 300 g', price: 11_000, old: 13_000, r: 4.4, n: 95, unit: 'pack', e: '🧇', d: 'Limon kremli qarsildoq vafli.', exp: '2027-01-01', mf: 'Shirin Dunyo' },
  { id: 'sw-08', name: 'Pishmaq (paxta halva)', price: 55_000, r: 4.8, n: 80, unit: 'kg', e: '🍥', d: "An'anaviy o'zbek shirinligi.", exp: '2026-12-15', mf: 'Xorazm Shirinliklari' },
  { id: 'sw-09', name: 'Chak-chak, 500 g', price: 32_000, r: 4.7, n: 75, e: '🍯', d: 'Asal bilan tayyorlangan chak-chak.', exp: '2026-12-01', mf: 'Xorazm Shirinliklari' },
  { id: 'sw-10', name: 'Kruassan shokoladli', price: 9_000, r: 4.6, n: 140, e: '🥐', d: 'Sariyog\'li xamirdan shokoladli kruassan.', exp: '2 kun', mf: 'Erizon Novvoyxonasi' },
]);

const chemicals = build('chemicals', 180, { unit: 'pcs' }, [
  { id: 'ch-01', name: 'Kir yuvish kukuni (avtomat), 3 kg', price: 69_000, old: 79_000, r: 4.7, n: 210, unit: 'pack', e: '🧺', d: 'Avtomat kir yuvish mashinalari uchun kukun.', mf: 'CleanPro' },
  { id: 'ch-02', name: 'Idish yuvish vositasi, 1 L', price: 18_000, r: 4.6, n: 260, e: '🧴', d: "Yog'ni oson ketkazuvchi limonli vosita.", mf: 'CleanPro' },
  { id: 'ch-03', name: 'Oqartirgich, 1 L', price: 12_000, r: 4.4, n: 90, e: '🧪', d: 'Xlorli oqartiruvchi va dezinfeksiyalovchi vosita.', mf: 'Belizna Uz' },
  { id: 'ch-04', name: 'Pol yuvish vositasi, 1 L', price: 21_000, r: 4.5, n: 70, e: '🧽', d: 'Barcha turdagi pollar uchun, yoqimli hidli.', mf: 'CleanPro' },
  { id: 'ch-05', name: "Hojatxona qog'ozi, 8 rulon", price: 26_000, r: 4.7, n: 330, unit: 'pack', e: '🧻', d: 'Ikki qatlamli yumshoq qog\'oz.', mf: 'SoftLine' },
  { id: 'ch-06', name: 'Suyuq sovun, 500 ml', price: 15_000, r: 4.6, n: 180, e: '🧼', d: 'Antibakterial suyuq sovun.', mf: 'SoftLine' },
  { id: 'ch-07', name: 'Tish pastasi, 100 ml', price: 16_000, r: 4.7, n: 220, e: '🦷', d: 'Ftorli tish pastasi, tishni kariesdan himoya qiladi.', mf: 'Smile' },
  { id: 'ch-08', name: 'Nam salfetkalar, 100 dona', price: 14_000, r: 4.5, n: 160, unit: 'pack', e: '🧻', d: 'Spirtsiz nam salfetkalar.', mf: 'SoftLine' },
  { id: 'ch-09', name: 'Axlat paketlari, 60 L', price: 9_000, r: 4.4, n: 110, unit: 'pack', e: '🗑️', d: 'Mustahkam axlat paketlari (20 dona).', mf: 'PlastUz' },
  { id: 'ch-10', name: 'Shisha tozalagich, 500 ml', price: 13_000, r: 4.3, n: 60, e: '✨', d: 'Oyna va shishalarni iz qoldirmay tozalaydi.', mf: 'CleanPro', out: true },
]);

const cosmetics = build('cosmetics', 300, { unit: 'pcs' }, [
  { id: 'co-01', name: 'Erkaklar atiri "Oud Noir", 100 ml', price: 420_000, old: 520_000, r: 4.8, n: 90, e: '🧴', d: "Oud va yog'och notalari bilan sharqona atir.", mf: 'Parfum Orient' },
  { id: 'co-02', name: 'Ayollar atiri "Rose Silk", 50 ml', price: 360_000, r: 4.9, n: 115, e: '🌹', d: 'Atirgul va vanil notalari bilan nafis atir.', mf: 'Parfum Orient' },
  { id: 'co-03', name: 'Yuz uchun namlovchi krem, 50 ml', price: 89_000, r: 4.6, n: 140, e: '🧴', d: 'Gialuron kislotali kunduzgi krem.', mf: 'SkinCare Lab' },
  { id: 'co-04', name: "Qo'l kremi, 75 ml", price: 25_000, r: 4.5, n: 170, e: '🤲', d: "Quruq teri uchun oziqlantiruvchi qo'l kremi.", mf: 'SkinCare Lab' },
  { id: 'co-05', name: "Lab bo'yog'i (matli)", price: 65_000, old: 79_000, r: 4.6, n: 85, e: '💄', d: 'Uzoq saqlanadigan matli lab bo\'yog\'i.', mf: 'BeautyLine' },
  { id: 'co-06', name: "Kiprik tushi (hajm beruvchi)", price: 72_000, r: 4.5, n: 64, e: '👁️', d: 'Kipriklarga hajm va uzunlik beradi.', mf: 'BeautyLine' },
  { id: 'co-07', name: 'Shampun (barcha soch turlari), 400 ml', price: 38_000, r: 4.6, n: 210, e: '🧴', d: 'Sochni mustahkamlovchi shampun.', mf: 'HairPro' },
  { id: 'co-08', name: 'Soch balzami, 400 ml', price: 36_000, r: 4.5, n: 120, e: '🧴', d: 'Sochni yumshatuvchi va oson taraladigan qiluvchi balzam.', mf: 'HairPro' },
  { id: 'co-09', name: 'Dezodorant (roll-on)', price: 29_000, r: 4.4, n: 150, e: '🌬️', d: '48 soatlik himoya.', mf: 'Fresh Day' },
  { id: 'co-10', name: 'Soqol olish ko\'pigi, 200 ml', price: 27_000, r: 4.5, n: 95, e: '🪒', d: 'Sezgir teri uchun soqol olish ko\'pigi.', mf: 'Fresh Day' },
]);

const kids = build('kids', 48, { unit: 'pcs' }, [
  { id: 'ki-01', name: 'Tagliklar, 4-o\'lcham (9–14 kg), 52 dona', price: 145_000, old: 165_000, r: 4.8, n: 310, unit: 'pack', e: '👶', d: '12 soatgacha quruqlikni saqlaydigan yumshoq tagliklar.', mf: 'BabyDry' },
  { id: 'ki-02', name: "Bolalar sutli bo'tqasi (grechka), 200 g", price: 28_000, r: 4.7, n: 140, unit: 'box', e: '🥣', d: "6 oylikdan boshlab, qo'shimcha shakarsiz.", exp: '2027-04-01', mf: 'Malysh' },
  { id: 'ki-03', name: 'Meva pyuresi (olma), 90 g', price: 9_000, r: 4.6, n: 120, e: '🍎', d: '4 oylikdan boshlab bolalar uchun olma pyuresi.', exp: '2027-02-01', mf: 'Malysh' },
  { id: 'ki-04', name: 'Bolalar sharbati, 200 ml', price: 5_500, r: 4.5, n: 90, e: '🧃', d: 'Shakar qo\'shilmagan olma-uzum sharbati.', exp: '2027-01-01', mf: 'Bog\'bon' },
  { id: 'ki-05', name: 'Konstruktor "Shahar", 250 detal', price: 189_000, r: 4.9, n: 75, unit: 'box', e: '🧱', d: '6 yoshdan katta bolalar uchun ijodiy konstruktor.', mf: 'BrickFun' },
  { id: 'ki-06', name: 'Yumshoq o\'yinchoq "Ayiqcha", 40 sm', price: 99_000, old: 120_000, r: 4.8, n: 130, e: '🧸', d: 'Gipoallergen to\'ldiruvchili yumshoq ayiqcha.', mf: 'ToyLand' },
  { id: 'ki-07', name: "Bolalar shampuni \"Ko'z yoshsiz\", 250 ml", price: 24_000, r: 4.7, n: 100, e: '🛁', d: "Ko'zni achitmaydigan yumshoq formula.", mf: 'BabyCare' },
  { id: 'ki-08', name: 'Sut aralashmasi (0–6 oy), 400 g', price: 125_000, r: 4.8, n: 85, unit: 'box', e: '🍼', d: 'Ona sutiga yaqin tarkibli moslashtirilgan aralashma.', exp: '2027-06-01', mf: 'NutriBaby' },
  { id: 'ki-09', name: 'Radio boshqariladigan mashina', price: 239_000, r: 4.6, n: 60, unit: 'box', e: '🏎️', d: 'Akkumulyatorli, masofadan boshqariladigan mashina.', mf: 'ToyLand', out: true },
  { id: 'ki-10', name: "Rangli qalamlar to'plami, 24 rang", price: 32_000, r: 4.7, n: 110, unit: 'set', e: '🖍️', d: 'Chizish uchun yumshoq grifli rangli qalamlar.', mf: 'ArtKids' },
]);

const home = build('home', 160, { unit: 'pcs' }, [
  { id: 'home-01', name: 'Elektr choynak, 1.7 L', price: 199_000, old: 249_000, r: 4.7, n: 150, e: '☕', d: "Zanglamaydigan po'latdan, avtomatik o'chish funksiyasi bilan.", mf: 'HomeTech', specs: { Quvvat: '2200 Vt', Hajm: '1.7 L' } },
  { id: 'home-02', name: 'Cho\'yan qozon, 10 L', price: 420_000, r: 4.9, n: 95, e: '🍲', d: 'Haqiqiy palov uchun qalin devorli cho\'yan qozon.', mf: 'Qozon Ustasi', specs: { Hajm: '10 L', Material: "Cho'yan" } },
  { id: 'home-03', name: 'Yopishmaydigan tova, 28 sm', price: 159_000, r: 4.6, n: 130, e: '🍳', d: 'Granit qoplamali tova.', mf: 'KitchenPro', specs: { Diametr: '28 sm' } },
  { id: 'home-04', name: 'Idish-tovoq to\'plami, 24 predmet', price: 489_000, old: 560_000, r: 4.8, n: 70, unit: 'set', e: '🍽️', d: '6 kishilik farfor idishlar to\'plami.', mf: 'Porcelain House' },
  { id: 'home-05', name: 'Choy piyola to\'plami (6 dona)', price: 89_000, r: 4.8, n: 115, unit: 'set', e: '🍵', d: "O'zbekona naqshli piyolalar to'plami.", mf: 'Rishton Kulolchilik' },
  { id: 'home-06', name: 'Sochiq to\'plami (3 dona)', price: 129_000, r: 4.6, n: 90, unit: 'set', e: '🛁', d: 'Yumshoq, suvni yaxshi shimuvchi paxta sochiqlar.', mf: 'Beruniy Tekstil' },
  { id: 'home-07', name: 'Adyol (ikki kishilik)', price: 349_000, r: 4.7, n: 60, e: '🛏️', d: 'Yengil va issiq bambuk tolali adyol.', mf: 'SleepWell' },
  { id: 'home-08', name: 'Yostiq (50×70)', price: 89_000, old: 99_000, r: 4.5, n: 85, e: '🛌', d: 'Gipoallergen to\'ldiruvchili yostiq.', mf: 'SleepWell' },
  { id: 'home-09', name: 'Bug\'li dazmol', price: 279_000, r: 4.6, n: 75, e: '👕', d: 'Keramik tagli bug\'li dazmol.', mf: 'HomeTech', specs: { Quvvat: '2400 Vt' } },
  { id: 'home-10', name: 'LED lampochka E27, 12 Vt', price: 14_000, r: 4.5, n: 200, e: '💡', d: 'Energiya tejovchi iliq yorug\'likli lampochka.', mf: 'LightUz' },
]);

export const SEED_PRODUCTS: Product[] = [
  ...clothing,
  ...grocery,
  ...drinks,
  ...meat,
  ...fastfood,
  ...dairy,
  ...produce,
  ...sweets,
  ...chemicals,
  ...cosmetics,
  ...kids,
  ...home,
];
