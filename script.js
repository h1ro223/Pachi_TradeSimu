// ============================================================
//  換金計算ツール  made by hiro/ヒロ
// ============================================================

// ===== 基本設定 =====
const PRIZE_UNIT = 500; // 景品の最小単位（円）
const OTHER_MAX = 4;    // 「その他」の台の登録上限

// 「その他」の台の種類
const KINDS = {
  pachi: { label: 'パチンコ', kind: 'パチ', unit: '玉', ratePh: '例 28' },
  slot:  { label: 'スロット', kind: 'スロ', unit: '枚', ratePh: '例 11' }
};

// カウントアニメの設定
const ANIM_MAX_MS = 2000;     // 最大時間（0→38,000円くらいでこの長さ）
const ANIM_MIN_MS = 600;      // 最小時間
const ANIM_REF_DIFF = 38000;  // この金額差で最大時間になる

// 台の種類（並び順＝画面の表示順。みんパチに合わせて料金の高い順）
const TYPES = [
  { key: 'p4',  label: '4円パチンコ',  short: '4パチ',  kind: 'パチ', unit: '玉', defPrice: 4,  ratePh: '例 25' },
  { key: 'p1',  label: '1円パチンコ',  short: '1パチ',  kind: 'パチ', unit: '玉', defPrice: 1,  ratePh: '例 100' },
  { key: 's20', label: '20円スロット', short: '20スロ', kind: 'スロ', unit: '枚', defPrice: 20, ratePh: '例 5' },
  { key: 's5',  label: '5円スロット',  short: '5スロ',  kind: 'スロ', unit: '枚', defPrice: 5,  ratePh: '例 20' }
];

// ===== 収録店舗（アプデで追加していく） =====
// machines: { 台キー: { price: 遊技料金(円), rate: 100円あたりの交換枚数/玉数 } }
const BUILTIN_STORES = [
  {
    id: 'b_daitoyo_honten',
    name: '大東洋本店',
    builtin: true,
    url: 'https://minpachi.com/newdaitoyo/',
    machines: {
      s20: { price: 21.73, rate: 5.2 }
    },
    others: []
  },
  {
    id: 'b_daitoyo_umeda',
    name: '大東洋 梅田店',
    builtin: true,
    url: 'https://minpachi.com/de-light/',
    machines: {
      p4: { price: 4, rate: 28 },
      p1: { price: 1, rate: 112 },
      s20: { price: 21.73, rate: 5.15 }
    },
    others: []
  },
  {
    id: 'b_maruhan_umeda',
    name: 'マルハン 梅田店',
    builtin: true,
    url: 'https://minpachi.com/maruhan-umeda/',
    machines: {
      p4: { price: 4, rate: 25.5 },
      p1: { price: 1, rate: 102 },
      s20: { price: 21.73, rate: 4.7 }
    },
    others: []
  },
  {
    id: 'b_123n_osaka',
    name: '123+N 大阪本店',
    builtin: true,
    url: 'https://minpachi.com/123plusn-osaka/',
    machines: {
      p4: { price: 4, rate: 28 },
      s20: { price: 21.73, rate: 5.15 }
    },
    others: [
      { kind: 'pachi', price: 1.25, rate: 89.6 },
      { kind: 'slot', price: 6.66, rate: 16.8 }
    ]
  },
  {
    id: 'b_derde',
    name: 'DERDE',
    builtin: true,
    url: 'https://minpachi.com/derde/',
    machines: {
      p4: { price: 4, rate: 28 },
      p1: { price: 1, rate: 112 },
      s20: { price: 21.73, rate: 5.15 }
    },
    others: []
  },
  {
    id: 'b_am_toyonaka',
    name: 'アムパチ～ノ 豊中店',
    builtin: true,
    url: 'https://minpachi.com/am-toyonaka/',
    machines: {
      p4: { price: 4, rate: 28 },
      p1: { price: 1, rate: 112 },
      s20: { price: 20, rate: 5.6 },
      s5: { price: 5, rate: 22.4 }
    },
    others: [
      { kind: 'slot', price: 10, rate: 11 }
    ]
  },
  {
    id: 'b_kicona_hankyutoyo',
    name: 'キコーナ 阪急豊中店',
    builtin: true,
    url: 'https://minpachi.com/kicona-hankyutoyo/',
    machines: {
      p4: { price: 4, rate: 28 },
      p1: { price: 1, rate: 112 },
      s20: { price: 20, rate: 5.6 }
    },
    others: []
  }
];

// ===== お知らせ（新しいものを上に追加） =====
// type: 'feature' → 機能追加 / 'stores' → 店舗追加
// id は一度決めたら変えない（既読管理に使う）
const NEWS = [
  {
    id: '2026-10-09-feature-8',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'マイホ登録の台に「その他」を追加（1.25円パチや10円スロなど、4つまで登録できます）',
      '選んだ店のみんパチページを、店名から開けるように',
      'マイホ登録に「みんパチのURL」の入力欄を追加（任意）'
    ]
  },
  {
    id: '2026-10-09-stores-2',
    type: 'stores',
    date: '2026-10-09',
    stores: ['大東洋 梅田店', 'マルハン 梅田店', '123+N 大阪本店', 'DERDE', 'アムパチ～ノ 豊中店', 'キコーナ 阪急豊中店']
  },
  {
    id: '2026-10-09-feature-7',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'ホーム画面に追加のおすすめ表示と、追加のしかたの案内（⚙️設定からも見られます）',
      'iPhoneでホーム画面のアプリにマイホを引き継ぐための書き出しボタン'
    ]
  },
  {
    id: '2026-10-09-feature-6',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'ホーム画面アプリで使うとき、みんパチをSafariアプリで開き直す方法（右下のコンパスマーク）を案内'
    ]
  },
  {
    id: '2026-10-09-feature-5',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'マイホ登録の入力途中の内容を自動保存（みんパチから戻っても続きから入力できます）',
      '登録フォーム2ページ目にも「みんパチを開く」ボタンを追加'
    ]
  },
  {
    id: '2026-10-09-feature-4',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'マイホ登録ガイドの画像を追加（タップで拡大）',
      '交換情報の入力欄を1行にまとめて見やすく',
      '枚数の増減ボタン（±1・±10・±100・±1000）',
      'サイトのアイコンを追加（ホーム画面に追加した時のアイコンも）'
    ]
  },
  {
    id: '2026-10-09-feature-3',
    type: 'feature',
    date: '2026-10-09',
    items: [
      '設定画面（右上の⚙️）。書き出し・読み込みは設定に移動',
      'スマホ1画面に収まるよう表示をコンパクトに',
      '台の並び順をみんパチと同じ順（4パチ→1パチ→20スロ→5スロ）に'
    ]
  },
  {
    id: '2026-10-09-feature-2',
    type: 'feature',
    date: '2026-10-09',
    items: [
      'お知らせ機能（右上の🔔）',
      'マイホ登録ガイド（みんパチの見方）',
      'マイホ登録フォームを2ページに分けて入力しやすく',
      '登録したマイホの書き出し・読み込み（JSON）',
      'デザインをリニューアル'
    ]
  },
  {
    id: '2026-10-09-stores-1',
    type: 'stores',
    date: '2026-10-09',
    stores: ['大東洋本店']
  },
  {
    id: '2026-10-09-feature-1',
    type: 'feature',
    date: '2026-10-09',
    items: [
      '店舗の選択とマイホの追加・編集・削除',
      '1パチ・4パチ・5スロ・20スロの切り替え'
    ]
  }
];

// ===== 保存キー =====
const LS_STORES = 'kankin_custom_stores_v1';
const LS_STATE = 'kankin_state_v1';
const LS_NEWS = 'kankin_news_seen_v1';
const LS_SETTINGS = 'kankin_settings_v1';
const LS_DRAFT = 'kankin_form_draft_v1';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 下書きの保存期間（24時間）

// みんパチ
const LS_TIP = 'kankin_compass_tip_snooze_v2'; // コンパス案内を「7日間表示しない」にした日時
const TIP_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const LS_A2HS = 'kankin_a2hs_dismissed_v1';   // ホーム画面追加のおすすめを閉じた日時
const A2HS_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000; // 閉じたら14日間は出さない
const EXPORT_APP = 'kankin-calculator';
const EXPORT_VERSION = 2;

// ===== 要素 =====
const $ = function (id) { return document.getElementById(id); };

const storeSelect = $('storeSelect');
const addBtn = $('addBtn');
const editBtn = $('editBtn');
const delBtn = $('delBtn');
const typeTabs = $('typeTabs');
const infoEl = $('info');
const medalsLabel = $('medalsLabel');
const medalsEl = $('medals');
const clearBtn = $('clearBtn');
const calcBtn = $('calcBtn');
const counterEl = $('counter');
const yenEl = $('yen');
const restEl = $('rest');
const nextEl = $('next');
const noteEl = $('note');

const bellBtn = $('bellBtn');
const bellBadge = $('bellBadge');
const newsModal = $('newsModal');
const newsList = $('newsList');
const newsClose = $('newsClose');

const settingsBtn = $('settingsBtn');
const settingsModal = $('settingsModal');
const settingsClose = $('settingsClose');
const animToggle = $('animToggle');
const tipModal = $('tipModal');
const tipOpen = $('tipOpen');
const tipCancel = $('tipCancel');
const tipSnooze = $('tipSnooze');
const tipVisual = $('tipVisual');
const storeLink = $('storeLink');
const tabIndicator = document.createElement('span');
tabIndicator.className = 'tab-indicator';
tabIndicator.setAttribute('aria-hidden', 'true');
const storeLinkName = $('storeLinkName');
const fUrl = $('fUrl');
const fOtherWrap = $('fOtherWrap');
const fOthers = $('fOthers');
const addOtherBtn = $('addOtherBtn');
const a2hsBanner = $('a2hsBanner');
const a2hsHow = $('a2hsHow');
const a2hsClose = $('a2hsClose');
const a2hsModal = $('a2hsModal');
const a2hsDone = $('a2hsDone');
const a2hsMain = $('a2hsMain');
const a2hsInstall = $('a2hsInstall');
const a2hsIOS = $('a2hsIOS');
const a2hsAndroid = $('a2hsAndroid');
const a2hsMove = $('a2hsMove');
const a2hsExport = $('a2hsExport');
const a2hsPc = $('a2hsPc');
const a2hsCloseBtn = $('a2hsCloseBtn');
const a2hsSettingBtn = $('a2hsSettingBtn');
const a2hsSettingDesc = $('a2hsSettingDesc');
const tipImg = $('tipImg');

const exportBtn = $('exportBtn');
const importBtn = $('importBtn');
const importFile = $('importFile');
const importModal = $('importModal');
const importMsg = $('importMsg');
const impOverwrite = $('impOverwrite');
const impSkip = $('impSkip');
const impReplace = $('impReplace');
const impCancel = $('impCancel');

const formModal = $('formModal');
const formTitle = $('formTitle');
const stepLabel = $('stepLabel');
const stepFill = $('stepFill');
const step1 = $('step1');
const step2 = $('step2');
const fName = $('fName');
const fTypeChips = $('fTypeChips');
const fDetails = $('fDetails');
const fErr = $('fErr');
const cancelBtn = $('cancelBtn');
const backBtn = $('backBtn');
const nextBtn = $('nextBtn');
const saveBtn = $('saveBtn');
const guideImg = $('guideImg');
const guideFallback = $('guideFallback');
const guideZoomBtn = $('guideZoomBtn');
const zoomModal = $('zoomModal');
const zoomScroll = $('zoomScroll');
const zoomImg = $('zoomImg');
const zoomClose = $('zoomClose');
const stepBtns = $('stepBtns');

const toastEl = $('toast');

// ===== 状態 =====
let customStores = loadCustomStores();
const state = loadState();
const settings = loadSettings();
let editingId = null;     // nullなら新規追加
let formStep = 1;
let formSelected = {};    // { 台キー: true }
let pendingImport = null; // 読み込み待ちの店舗リスト
let toastTimer = null;
let idSeq = 0;

// カウンター表示用
let shownYen = 0;         // 今画面に出ている金額（アニメ途中の値も含む）
let animFrame = 0;
let hitTimer = null;
let lastCalcInput = null; // 最後に計算したときの入力値

// ============================================================
//  ユーティリティ
// ============================================================

// 全角数字・全角ピリオド・カンマ・空白を半角に整える
function normalizeNum(str) {
  return String(str == null ? '' : str)
    .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[．。]/g, '.')
    .replace(/[,，\s]/g, '');
}

function parsePositive(str) {
  const s = normalizeNum(str);
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = parseFloat(s);
  return n > 0 ? n : NaN;
}

// 枚数入力を整数に（空欄や不正は0）
function parseMedals(str) {
  const s = normalizeNum(str);
  return /^\d+$/.test(s) ? Math.min(parseInt(s, 10), 9999999) : 0;
}

function typeOf(key) {
  for (let i = 0; i < TYPES.length; i++) {
    if (TYPES[i].key === key) return TYPES[i];
  }
  return null;
}

// 景品1単位（500円）に必要な枚数・玉数（浮動小数の誤差を消してから切り上げ）
function unitMedals(rate) {
  const raw = Math.round(rate * (PRIZE_UNIT / 100) * 1e6) / 1e6;
  return Math.max(1, Math.ceil(raw));
}

function fmt(n) {
  return Number(n).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
}

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return m[1] + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
}

function newId() {
  idSeq++;
  return 'c_' + Date.now().toString(36) + idSeq.toString(36) + Math.random().toString(36).slice(2, 6);
}

function isValidMachine(m) {
  return !!m && typeof m === 'object' &&
    typeof m.price === 'number' && isFinite(m.price) && m.price > 0 && m.price <= 1000 &&
    typeof m.rate === 'number' && isFinite(m.rate) && m.rate > 0 && m.rate <= 10000;
}

// 外部データ（保存データ・読み込みファイル）を安全な形に整える。不正ならnull
// みんパチのURLだけ受け付ける（不正なら空文字）
function sanitizeMinpachiUrl(str) {
  let u = typeof str === 'string' ? str.trim().slice(0, 300) : '';
  if (!u) return '';
  u = u.replace(/[\uFF01-\uFF5E]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); });
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const p = new URL(u);
    if (p.protocol !== 'https:' && p.protocol !== 'http:') return '';
    const host = p.hostname.toLowerCase();
    if (host !== 'minpachi.com' && host !== 'www.minpachi.com') return '';
    return 'https://minpachi.com' + p.pathname + p.search;
  } catch (e) {
    return '';
  }
}

function sanitizeOther(o) {
  if (!o || typeof o !== 'object' || !KINDS.hasOwnProperty(o.kind)) return null;
  const fixed = { kind: o.kind, price: parsePositive(o.price), rate: parsePositive(o.rate) };
  return isValidMachine(fixed) ? fixed : null;
}

// 外部データ（保存データ・読み込みファイル）を安全な形に整える。不正ならnull
function sanitizeStore(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 30) : '';
  if (!name) return null;

  const src = raw.machines && typeof raw.machines === 'object' ? raw.machines : {};
  const machines = {};
  let count = 0;
  TYPES.forEach(function (t) {
    const m = src[t.key];
    if (!m || typeof m !== 'object') return;
    const fixed = { price: parsePositive(m.price), rate: parsePositive(m.rate) };
    if (isValidMachine(fixed)) {
      machines[t.key] = fixed;
      count++;
    }
  });

  const others = [];
  if (Array.isArray(raw.others)) {
    raw.others.forEach(function (o) {
      if (others.length >= OTHER_MAX) return;
      const f = sanitizeOther(o);
      if (f) others.push(f);
    });
  }
  if (count + others.length === 0) return null;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name: name,
    builtin: false,
    url: sanitizeMinpachiUrl(raw.url),
    machines: machines,
    others: others
  };
}

// 店舗データの複製（IDだけ差し替え）
function storeCopy(s, id) {
  return {
    id: id,
    name: s.name,
    builtin: false,
    url: s.url || '',
    machines: s.machines,
    others: s.others || []
  };
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
}

function blurActive() {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

// ============================================================
//  保存・読み込み（localStorage）
// ============================================================
function loadCustomStores() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_STORES) || '[]');
    if (!Array.isArray(arr)) return [];
    const used = {};
    const out = [];
    arr.forEach(function (raw) {
      const s = sanitizeStore(raw);
      if (!s) return;
      if (used[s.id]) s.id = newId(); // ID重複の保険
      used[s.id] = true;
      out.push(s);
    });
    return out;
  } catch (e) {
    return [];
  }
}

function saveCustomStores() {
  try {
    localStorage.setItem(LS_STORES, JSON.stringify(customStores));
    return true;
  } catch (e) {
    return false;
  }
}

function loadState() {
  const def = { storeId: BUILTIN_STORES[0].id, typeKey: 's20', medals: '' };
  try {
    const s = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
    if (!s || typeof s !== 'object') return def;
    return {
      storeId: typeof s.storeId === 'string' ? s.storeId : def.storeId,
      typeKey: typeof s.typeKey === 'string' ? s.typeKey : def.typeKey,
      medals: typeof s.medals === 'string' ? s.medals : ''
    };
  } catch (e) {
    return def;
  }
}

function saveState() {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
  } catch (e) { /* 保存できなくても動作は続ける */ }
}

function loadSettings() {
  // 「視差効果を減らす」がONの端末は、アニメの初期値をOFFに
  let reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduce = false; }
  const def = { anim: !reduce };

  try {
    const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || 'null');
    if (!s || typeof s !== 'object') return def;
    return { anim: typeof s.anim === 'boolean' ? s.anim : def.anim };
  } catch (e) {
    return def;
  }
}

function saveSettings() {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  } catch (e) { /* 保存できなくても動作は続ける */ }
}

// ============================================================
//  店舗・台の取得
// ============================================================
function allStores() {
  return BUILTIN_STORES.concat(customStores);
}

function currentStore() {
  const list = allStores();
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === state.storeId) return list[i];
  }
  state.storeId = list[0].id;
  return list[0];
}

// 店舗の台の一覧（固定の4種＋その他）。パチ→スロの順、それぞれ料金の高い順
function entriesOf(store) {
  const list = [];
  const machines = store.machines || {};
  TYPES.forEach(function (t) {
    const m = machines[t.key];
    if (!isValidMachine(m)) return;
    list.push({ key: t.key, label: t.label, short: t.short, kind: t.kind, unit: t.unit, price: m.price, rate: m.rate });
  });
  (store.others || []).forEach(function (o, i) {
    const k = KINDS[o.kind];
    if (!k || !isValidMachine(o)) return;
    list.push({
      key: 'o' + i,
      label: fmt(o.price) + '円' + k.label,
      short: fmt(o.price) + k.kind,
      kind: k.kind,
      unit: k.unit,
      price: o.price,
      rate: o.rate
    });
  });
  list.sort(function (a, b) {
    if (a.kind !== b.kind) return a.kind === 'パチ' ? -1 : 1;
    return b.price - a.price;
  });
  return list;
}

function currentEntry() {
  const list = entriesOf(currentStore());
  for (let i = 0; i < list.length; i++) {
    if (list[i].key === state.typeKey) return list[i];
  }
  return list[0] || null;
}

// ============================================================
//  メイン画面の描画
// ============================================================
function renderStoreSelect() {
  storeSelect.innerHTML = '';

  const gBuiltin = document.createElement('optgroup');
  gBuiltin.label = '収録店舗';
  BUILTIN_STORES.forEach(function (s) {
    const op = document.createElement('option');
    op.value = s.id;
    op.textContent = s.name;
    gBuiltin.appendChild(op);
  });
  storeSelect.appendChild(gBuiltin);

  if (customStores.length > 0) {
    const gCustom = document.createElement('optgroup');
    gCustom.label = '自分で登録したマイホ';
    customStores.forEach(function (s) {
      const op = document.createElement('option');
      op.value = s.id;
      op.textContent = s.name;
      gCustom.appendChild(op);
    });
    storeSelect.appendChild(gCustom);
  }

  storeSelect.value = currentStore().id;
}

function renderActions() {
  const store = currentStore();
  editBtn.classList.toggle('hidden', store.builtin);
  delBtn.classList.toggle('hidden', store.builtin);
  renderStoreLink();
}

// 選んだ店のみんパチページへのリンク（URLがある店だけ）
function renderStoreLink() {
  const store = currentStore();
  const url = store.url || '';
  storeLink.classList.toggle('hidden', !url);
  if (url) {
    storeLink.href = url;
    storeLinkName.textContent = store.name;
    storeLink.setAttribute('aria-label', store.name + 'のみんパチページを開く');
  }
}

function renderTabs(slide) {
  const list = entriesOf(currentStore());
  if (list.length === 0) return;

  if (!list.some(function (en) { return en.key === state.typeKey; })) {
    state.typeKey = list[0].key;
  }

  // タブだけ作り直す（ハイライトは残して前の位置から滑らせる）
  const oldTabs = typeTabs.querySelectorAll('.tab');
  for (let i = 0; i < oldTabs.length; i++) oldTabs[i].remove();
  if (!tabIndicator.parentNode) typeTabs.appendChild(tabIndicator);
  typeTabs.classList.toggle('many', list.length > 4);

  list.forEach(function (en) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (en.key === state.typeKey ? ' active' : '');
    b.textContent = en.short;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', en.key === state.typeKey ? 'true' : 'false');
    b.setAttribute('aria-label', en.label);
    b.addEventListener('click', function () {
      if (state.typeKey === en.key) return;
      state.typeKey = en.key;
      saveState();
      renderTabs(true);
      renderMeta();
      runCalc(false); // 台の切替はアニメなしで即表示
    });
    typeTabs.appendChild(b);
  });

  // タブが多くて横スクロールする時は、選んでいるタブが見える位置へ
  const active = typeTabs.querySelector('.tab.active');
  const smooth = !!slide && settings.anim;
  if (active && typeTabs.scrollWidth > typeTabs.clientWidth) {
    const left = active.offsetLeft - (typeTabs.clientWidth - active.offsetWidth) / 2;
    if (smooth && typeTabs.scrollTo) typeTabs.scrollTo({ left: left, behavior: 'smooth' });
    else typeTabs.scrollLeft = left;
  } else {
    typeTabs.scrollLeft = 0;
  }
  positionTabIndicator(smooth);
}

// ハイライトを選択中のタブの位置へ（animate=falseなら瞬間移動）
function positionTabIndicator(animate) {
  const active = typeTabs.querySelector('.tab.active');
  if (!active) {
    tabIndicator.style.opacity = '0';
    return;
  }
  if (!animate) tabIndicator.style.transition = 'none';
  tabIndicator.style.opacity = '1';
  tabIndicator.style.width = active.offsetWidth + 'px';
  tabIndicator.style.height = active.offsetHeight + 'px';
  tabIndicator.style.transform = 'translate(' + active.offsetLeft + 'px, ' + active.offsetTop + 'px)';
  if (!animate) {
    void tabIndicator.offsetWidth; // 位置を確定させてから元に戻す
    tabIndicator.style.transition = '';
  }
}

// 現在の店舗・台の情報表示（ラベル・交換率など）
function renderMeta() {
  const en = currentEntry();
  if (!en) return;

  const per = unitMedals(en.rate);
  medalsLabel.textContent = '今の持ち' + (en.unit === '玉' ? '玉数' : 'メダル枚数');
  medalsEl.placeholder = '例：' + (per * 20 + Math.round(per / 2));
  infoEl.textContent = fmt(en.price) + '円' + en.kind + '・' + fmt(en.rate) + en.unit + '交換・1' + en.unit + '≈' + (100 / en.rate).toFixed(2) + '円';
  noteEl.textContent = PRIZE_UNIT + '円 = ' + per + en.unit + '単位';
}

// 入力欄の状態（×ボタン・未計算の光り）
function renderInputState() {
  clearBtn.style.visibility = medalsEl.value ? 'visible' : 'hidden';
  const pending = lastCalcInput !== null && parseMedals(medalsEl.value) !== lastCalcInput;
  calcBtn.classList.toggle('pending', pending);
}

// ============================================================
//  計算とカウントアニメ
// ============================================================
function setYen(v) {
  shownYen = v;
  yenEl.textContent = fmt(Math.round(v));
}

function stopYenAnim() {
  if (animFrame) cancelAnimationFrame(animFrame);
  animFrame = 0;
}

function flashCounter() {
  counterEl.classList.remove('hit');
  void counterEl.offsetWidth; // アニメを最初から再生させる
  counterEl.classList.add('hit');
  clearTimeout(hitTimer);
  hitTimer = setTimeout(function () { counterEl.classList.remove('hit'); }, 600);
}

// 金額差に応じたアニメ時間（差が大きいほど長く、最大5秒）
function animDuration(diff) {
  const ratio = Math.sqrt(Math.min(1, diff / ANIM_REF_DIFF));
  return ANIM_MIN_MS + (ANIM_MAX_MS - ANIM_MIN_MS) * ratio;
}

// 最後になるほどゆっくり
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function animateYen(target) {
  stopYenAnim();
  const from = shownYen;
  const diff = Math.abs(target - from);

  if (diff < 1) {
    setYen(target);
    return;
  }

  const duration = animDuration(diff);
  const start = performance.now();

  const step = function (now) {
    const t = Math.min(1, (now - start) / duration);
    setYen(from + (target - from) * easeOutQuart(t));
    if (t < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      animFrame = 0;
      setYen(target);
      flashCounter();
    }
  };
  animFrame = requestAnimationFrame(step);
}

// animate: true＝計算ボタン押下（設定ONならアニメ）/ false＝即表示
function runCalc(animate) {
  const en = currentEntry();
  if (!en) return;

  const per = unitMedals(en.rate);
  const n = parseMedals(medalsEl.value);
  const yen = Math.floor(n / per) * PRIZE_UNIT;
  const rest = n % per;

  // 余り・次の500円までは即切替
  restEl.textContent = fmt(rest) + en.unit;
  nextEl.textContent = n > 0 ? 'あと' + fmt(per - rest) + en.unit : '－';

  if (animate && settings.anim) {
    animateYen(yen);
  } else {
    stopYenAnim();
    setYen(yen);
    if (animate) flashCounter();
  }

  lastCalcInput = n;
  renderInputState();
}

function renderAll() {
  renderStoreSelect();
  renderActions();
  renderTabs();
  renderMeta();
  runCalc(false);
}

// ============================================================
//  モーダル共通
// ============================================================
function openModal(el) {
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const sheet = el.querySelector('.sheet');
  if (sheet) sheet.scrollTop = 0;
}

function closeModal(el) {
  el.classList.add('hidden');
  el.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.modal:not(.hidden)')) {
    document.body.classList.remove('modal-open');
  }
  blurActive();
}

// ============================================================
//  設定
// ============================================================
function renderSettings() {
  animToggle.setAttribute('aria-checked', settings.anim ? 'true' : 'false');
  document.body.classList.toggle('anim-off', !settings.anim);
}

// ============================================================
//  みんパチを開く（ホーム画面アプリではコンパスマークを案内）
// ============================================================
// iPhoneのホーム画面から起動しているか
function isStandalone() {
  try {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  } catch (e) {
    return false;
  }
}

// 「7日間表示しない」の期間中か
function tipSnoozed() {
  try {
    const t = parseInt(localStorage.getItem(LS_TIP) || '0', 10);
    return t > 0 && t <= Date.now() + 60000 && Date.now() - t < TIP_SNOOZE_MS;
  } catch (e) {
    return false;
  }
}

function snoozeTip() {
  try {
    localStorage.setItem(LS_TIP, String(Date.now()));
  } catch (e) { /* 何もしない */ }
}

// ============================================================
//  ホーム画面に追加のおすすめ
// ============================================================
let deferredInstall = null; // Android Chromeの「インストール」イベント

function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent || '');
}

function a2hsSnoozed() {
  try {
    const t = parseInt(localStorage.getItem(LS_A2HS) || '0', 10);
    return t > 0 && Date.now() - t < A2HS_SNOOZE_MS;
  } catch (e) {
    return false;
  }
}

function renderA2hsBanner() {
  const show = !isStandalone() && (isIOS() || isAndroid() || !!deferredInstall) && !a2hsSnoozed();
  a2hsBanner.classList.toggle('hidden', !show);
}

function dismissA2hsBanner() {
  try {
    localStorage.setItem(LS_A2HS, String(Date.now()));
  } catch (e) { /* 何もしない */ }
  a2hsBanner.classList.add('hidden');
}

function openA2hs() {
  const standalone = isStandalone();
  const ios = isIOS();
  const android = isAndroid();

  a2hsDone.classList.toggle('hidden', !standalone);
  a2hsMain.classList.toggle('hidden', standalone);

  // 端末に合った手順だけ表示（PCなどは両方）
  a2hsIOS.classList.toggle('hidden', android);
  a2hsAndroid.classList.toggle('hidden', ios);
  a2hsPc.classList.toggle('hidden', ios || android);

  // iPhoneはSafariとホーム画面アプリでデータが別なので、登録済みなら書き出しを案内
  a2hsMove.classList.toggle('hidden', customStores.length === 0);
  a2hsInstall.classList.toggle('hidden', !deferredInstall);

  openModal(a2hsModal);
}

function renderA2hsSetting() {
  a2hsSettingDesc.textContent = isStandalone()
    ? 'いまホーム画面から開いています'
    : 'アイコンからワンタップで、アプリのように使えます';
}

function onMinpachiClick(e) {
  saveDraft(); // 画面が切り替わっても続きから入力できるように
  if (!isStandalone() || tipSnoozed()) return; // 通常はそのまま開く
  tipSnooze.checked = false; // チェックは毎回オフから
  e.preventDefault();
  // 案内の「みんパチを開く」は、押したリンクと同じページを開く
  tipOpen.href = (e.currentTarget && e.currentTarget.href) || 'https://minpachi.com/';
  openModal(tipModal); // 初回だけ案内を出してから開く
}

function openSettings() {
  renderSettings();
  openModal(settingsModal);
}

// ============================================================
//  お知らせ
// ============================================================
function loadSeenNews() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_NEWS) || '[]');
    return Array.isArray(arr) ? arr.filter(function (x) { return typeof x === 'string'; }) : [];
  } catch (e) {
    return [];
  }
}

function saveSeenNews(ids) {
  try {
    localStorage.setItem(LS_NEWS, JSON.stringify(ids));
  } catch (e) { /* 失敗しても表示は続ける */ }
}

function unreadNews() {
  const seen = loadSeenNews();
  return NEWS.filter(function (n) { return seen.indexOf(n.id) === -1; });
}

function renderBadge() {
  const count = unreadNews().length;
  bellBadge.textContent = count > 9 ? '9+' : String(count);
  bellBadge.classList.toggle('hidden', count === 0);
  bellBtn.setAttribute('aria-label', count > 0 ? 'お知らせ（未読' + count + '件）' : 'お知らせ');
}

function renderNews() {
  const unreadIds = unreadNews().map(function (n) { return n.id; });
  newsList.innerHTML = '';

  if (NEWS.length === 0) {
    const p = document.createElement('p');
    p.className = 'news-empty';
    p.textContent = 'お知らせはまだありません。';
    newsList.appendChild(p);
    return;
  }

  NEWS.forEach(function (n) {
    const item = document.createElement('article');
    const isUnread = unreadIds.indexOf(n.id) !== -1;
    item.className = 'news-item' + (n.type === 'stores' ? ' stores' : '') + (isUnread ? ' unread' : '');

    const head = document.createElement('div');
    head.className = 'news-head';
    const date = document.createElement('span');
    date.className = 'news-date';
    date.textContent = fmtDate(n.date);
    head.appendChild(date);
    if (isUnread) {
      const nw = document.createElement('span');
      nw.className = 'news-new';
      nw.textContent = '新着';
      head.appendChild(nw);
    }

    const title = document.createElement('p');
    title.className = 'news-title';
    const list = n.type === 'stores' ? (n.stores || []) : (n.items || []);
    title.textContent = n.type === 'stores'
      ? '以下の' + list.length + '店舗の情報を追加しました。'
      : 'アップデートに伴い以下の機能を追加しました。';

    const ul = document.createElement('ul');
    list.forEach(function (text) {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });

    item.appendChild(head);
    item.appendChild(title);
    item.appendChild(ul);
    newsList.appendChild(item);
  });
}

function openNews() {
  renderNews();
  openModal(newsModal);
  // 開いた時点で全部既読に
  saveSeenNews(NEWS.map(function (n) { return n.id; }));
  renderBadge();
}

// ============================================================
//  マイホ追加・編集フォーム（2ページ）
// ============================================================
function buildChips() {
  fTypeChips.innerHTML = '';
  const items = TYPES.map(function (t) { return { key: t.key, label: t.label }; })
    .concat([{ key: 'other', label: 'その他' }]);

  items.forEach(function (it) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (it.key === 'other' ? ' chip-other' : '');
    b.textContent = it.label;
    b.setAttribute('aria-pressed', formSelected[it.key] ? 'true' : 'false');
    b.addEventListener('click', function () {
      formSelected[it.key] = !formSelected[it.key];
      b.setAttribute('aria-pressed', formSelected[it.key] ? 'true' : 'false');
      fErr.textContent = '';
      saveDraft();
    });
    fTypeChips.appendChild(b);
  });
}

// ===== 「その他」の台 =====
function makeDetailField(labelNodes, input, unitEl) {
  const field = document.createElement('label');
  field.className = 'dfield';
  const lab = document.createElement('span');
  lab.className = 'dlabel';
  labelNodes.forEach(function (n) { lab.appendChild(n); });
  const box = document.createElement('span');
  box.className = 'dinput';
  box.appendChild(input);
  box.appendChild(unitEl);
  field.appendChild(lab);
  field.appendChild(box);
  return field;
}

function updateAddOtherBtn() {
  addOtherBtn.classList.toggle('hidden', fOthers.children.length >= OTHER_MAX);
}

function addOtherBlock(data) {
  if (fOthers.children.length >= OTHER_MAX) return null;
  const d = data || {};
  let kind = KINDS.hasOwnProperty(d.kind) ? d.kind : 'slot';

  const block = document.createElement('div');
  block.className = 'detail-block other-block';

  // パチンコ／スロット切替と削除
  const head = document.createElement('div');
  head.className = 'other-head';
  const seg = document.createElement('div');
  seg.className = 'seg';
  seg.setAttribute('role', 'group');
  seg.setAttribute('aria-label', '台の種類');
  const segBtns = {};
  const segInd = document.createElement('span');
  segInd.className = 'seg-indicator';
  segInd.setAttribute('aria-hidden', 'true');
  seg.appendChild(segInd);
  ['pachi', 'slot'].forEach(function (k) {
    const sb = document.createElement('button');
    sb.type = 'button';
    sb.className = 'seg-btn';
    sb.textContent = KINDS[k].label + '（' + KINDS[k].unit + '）';
    sb.addEventListener('click', function () {
      setKind(k, true);
      fErr.textContent = '';
      saveDraft();
    });
    segBtns[k] = sb;
    seg.appendChild(sb);
  });
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'other-del';
  del.textContent = '削除';
  del.addEventListener('click', function () {
    block.remove();
    updateAddOtherBtn();
    fErr.textContent = '';
    saveDraft();
  });
  head.appendChild(seg);
  head.appendChild(del);

  // 遊技料金・交換率
  const price = document.createElement('input');
  price.type = 'text';
  price.inputMode = 'decimal';
  price.autocomplete = 'off';
  price.placeholder = '例 1.25';
  price.value = typeof d.price === 'string' ? d.price.slice(0, 12) : '';
  price.dataset.role = 'price';
  price.setAttribute('aria-label', 'その他の台の遊技料金');

  const rate = document.createElement('input');
  rate.type = 'text';
  rate.inputMode = 'decimal';
  rate.autocomplete = 'off';
  rate.value = typeof d.rate === 'string' ? d.rate.slice(0, 12) : '';
  rate.dataset.role = 'rate';
  rate.setAttribute('aria-label', 'その他の台の交換率');

  const prefix = document.createElement('span');
  prefix.className = 'prefix';
  const priceUnit = document.createElement('span');
  priceUnit.textContent = '円';
  const rateUnit = document.createElement('span');

  const updatePrefix = function () {
    const p = parsePositive(price.value);
    prefix.textContent = (isNaN(p) ? '' : fmt(p)) + KINDS[kind].kind;
  };

  function setKind(k, animate) {
    kind = k;
    block.dataset.kind = k;
    // ハイライトを滑らせる（初期表示や設定OFFの時は瞬間移動）
    if (!animate || !settings.anim) segInd.style.transition = 'none';
    segInd.classList.toggle('right', k === 'slot');
    if (!animate || !settings.anim) {
      void segInd.offsetWidth;
      segInd.style.transition = '';
    }
    segBtns.pachi.setAttribute('aria-pressed', k === 'pachi' ? 'true' : 'false');
    segBtns.slot.setAttribute('aria-pressed', k === 'slot' ? 'true' : 'false');
    rateUnit.textContent = KINDS[k].unit;
    rate.placeholder = KINDS[k].ratePh;
    updatePrefix();
  }

  price.addEventListener('input', function () { updatePrefix(); fErr.textContent = ''; });
  rate.addEventListener('input', function () { fErr.textContent = ''; });

  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  grid.appendChild(makeDetailField([document.createTextNode('遊技料金')], price, priceUnit));
  grid.appendChild(makeDetailField([
    document.createTextNode('交換率（'),
    prefix,
    document.createTextNode('）')
  ], rate, rateUnit));

  block.appendChild(head);
  block.appendChild(grid);
  fOthers.appendChild(block);
  setKind(kind);
  updateAddOtherBtn();
  return block;
}

function buildOthers(list) {
  fOthers.innerHTML = '';
  (list || []).forEach(function (o) {
    addOtherBlock({ kind: o.kind, price: String(o.price), rate: String(o.rate) });
  });
  updateAddOtherBtn();
}

// フォーム上の「その他」の入力内容（文字列のまま）
function readOthers() {
  const blocks = fOthers.querySelectorAll('.other-block');
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    out.push({
      kind: blocks[i].dataset.kind,
      price: blocks[i].querySelector('[data-role="price"]').value,
      rate: blocks[i].querySelector('[data-role="rate"]').value
    });
  }
  return out;
}

function buildDetails(store) {
  fDetails.innerHTML = '';

  // ラベル＋入力欄＋単位のセット（左右半々で1行に並べる）
  const makeField = function (labelNodes, input, unitText) {
    const field = document.createElement('label');
    field.className = 'dfield';
    const lab = document.createElement('span');
    lab.className = 'dlabel';
    labelNodes.forEach(function (n) { lab.appendChild(n); });
    const box = document.createElement('span');
    box.className = 'dinput';
    const unit = document.createElement('span');
    unit.textContent = unitText;
    box.appendChild(input);
    box.appendChild(unit);
    field.appendChild(lab);
    field.appendChild(box);
    return field;
  };

  TYPES.forEach(function (t) {
    const m = store ? store.machines[t.key] : null;
    const has = isValidMachine(m);

    const block = document.createElement('div');
    block.className = 'detail-block hidden';
    block.dataset.key = t.key;

    const title = document.createElement('p');
    title.className = 'detail-title';
    title.textContent = t.label;

    // 遊技料金（左）
    const price = document.createElement('input');
    price.type = 'text';
    price.inputMode = 'decimal';
    price.autocomplete = 'off';
    price.placeholder = String(t.defPrice);
    price.value = has ? String(m.price) : String(t.defPrice);
    price.dataset.role = 'price';
    price.setAttribute('aria-label', t.label + 'の遊技料金');

    // 交換率（右）
    const rate = document.createElement('input');
    rate.type = 'text';
    rate.inputMode = 'decimal';
    rate.autocomplete = 'off';
    rate.placeholder = t.ratePh;
    rate.value = has ? String(m.rate) : '';
    rate.dataset.role = 'rate';
    rate.setAttribute('aria-label', t.label + 'の交換率');

    // 「交換率（21.73スロ）」のように遊技料金に連動
    const prefix = document.createElement('span');
    prefix.className = 'prefix';
    const updatePrefix = function () {
      const p = parsePositive(price.value);
      prefix.textContent = (isNaN(p) ? fmt(t.defPrice) : fmt(p)) + t.kind;
    };
    price.addEventListener('input', function () { updatePrefix(); fErr.textContent = ''; });
    rate.addEventListener('input', function () { fErr.textContent = ''; });
    updatePrefix();

    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    grid.appendChild(makeField([document.createTextNode('遊技料金')], price, '円'));
    grid.appendChild(makeField([
      document.createTextNode('交換率（'),
      prefix,
      document.createTextNode('）')
    ], rate, t.unit));

    block.appendChild(title);
    block.appendChild(grid);
    fDetails.appendChild(block);
  });
}

function setStep(step) {
  formStep = step;
  const isFirst = step === 1;

  step1.classList.toggle('hidden', !isFirst);
  step2.classList.toggle('hidden', isFirst);
  cancelBtn.classList.toggle('hidden', !isFirst);
  nextBtn.classList.toggle('hidden', !isFirst);
  backBtn.classList.toggle('hidden', isFirst);
  saveBtn.classList.toggle('hidden', isFirst);

  stepLabel.textContent = isFirst ? '1 / 2　店舗と台' : '2 / 2　交換情報';
  stepFill.style.width = isFirst ? '50%' : '100%';
  fErr.textContent = '';

  if (!isFirst) {
    // 選んだ台だけ表示
    const blocks = fDetails.querySelectorAll('.detail-block');
    for (let i = 0; i < blocks.length; i++) {
      blocks[i].classList.toggle('hidden', !formSelected[blocks[i].dataset.key]);
    }
    // 「その他」は一番下。選んでいて未入力なら1つ用意
    fOtherWrap.classList.toggle('hidden', !formSelected.other);
    if (formSelected.other && fOthers.children.length === 0) addOtherBlock(null);
  }

  formModal.querySelector('.sheet').scrollTop = 0;
  saveDraft();
}

function openForm(store) {
  editingId = store ? store.id : null;
  formTitle.textContent = store ? 'マイホを編集' : 'マイホ追加';
  saveBtn.textContent = store ? '変更を保存' : '保存';
  fName.value = store ? store.name : '';
  fUrl.value = store && store.url ? store.url : '';

  formSelected = {};
  if (store) {
    TYPES.forEach(function (t) {
      if (isValidMachine(store.machines[t.key])) formSelected[t.key] = true;
    });
    if (store.others && store.others.length > 0) formSelected.other = true;
  }

  buildChips();
  buildDetails(store);
  buildOthers(store ? store.others : []);
  openModal(formModal);
  setStep(1);
}

function closeForm() {
  closeModal(formModal);
  editingId = null;
  clearDraft(); // 保存・キャンセルで閉じたら下書きは不要
}

// ============================================================
//  フォームの下書き（自動保存・復元）
// ============================================================
function isFormOpen() {
  return !formModal.classList.contains('hidden');
}

function saveDraft() {
  if (!isFormOpen()) return;
  const values = {};
  const blocks = fDetails.querySelectorAll('.detail-block');
  for (let i = 0; i < blocks.length; i++) {
    values[blocks[i].dataset.key] = {
      price: blocks[i].querySelector('[data-role="price"]').value,
      rate: blocks[i].querySelector('[data-role="rate"]').value
    };
  }
  const selected = {};
  TYPES.forEach(function (t) { if (formSelected[t.key]) selected[t.key] = true; });
  if (formSelected.other) selected.other = true;

  const draft = {
    v: 1,
    savedAt: Date.now(),
    editingId: editingId,
    step: formStep,
    name: fName.value,
    url: fUrl.value,
    selected: selected,
    values: values,
    others: readOthers()
  };
  try {
    localStorage.setItem(LS_DRAFT, JSON.stringify(draft));
  } catch (e) { /* 保存できなくてもフォームは使える */ }
}

function clearDraft() {
  try {
    localStorage.removeItem(LS_DRAFT);
  } catch (e) { /* 何もしない */ }
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null');
    if (!d || typeof d !== 'object' || d.v !== 1) return null;
    if (typeof d.savedAt !== 'number' || Date.now() - d.savedAt > DRAFT_TTL_MS || d.savedAt > Date.now() + 60000) {
      clearDraft();
      return null;
    }
    return d;
  } catch (e) {
    clearDraft();
    return null;
  }
}

// 起動時に下書きがあればフォームを開き直して復元
function restoreDraft() {
  const d = loadDraft();
  if (!d) return;

  // 編集中だった店舗が消えていたら新規追加として復元
  let store = null;
  if (typeof d.editingId === 'string') {
    for (let i = 0; i < customStores.length; i++) {
      if (customStores[i].id === d.editingId) { store = customStores[i]; break; }
    }
  }

  openForm(store);

  fName.value = typeof d.name === 'string' ? d.name.slice(0, 30) : fName.value;
  if (typeof d.url === 'string') fUrl.value = d.url.slice(0, 300);

  if (d.selected && typeof d.selected === 'object') {
    formSelected = {};
    TYPES.forEach(function (t) { if (d.selected[t.key] === true) formSelected[t.key] = true; });
    if (d.selected.other === true) formSelected.other = true;
    buildChips();
  }

  if (d.values && typeof d.values === 'object') {
    const blocks = fDetails.querySelectorAll('.detail-block');
    for (let i = 0; i < blocks.length; i++) {
      const v = d.values[blocks[i].dataset.key];
      if (!v || typeof v !== 'object') continue;
      const price = blocks[i].querySelector('[data-role="price"]');
      const rate = blocks[i].querySelector('[data-role="rate"]');
      if (typeof v.price === 'string') price.value = v.price.slice(0, 12);
      if (typeof v.rate === 'string') rate.value = v.rate.slice(0, 12);
      price.dispatchEvent(new Event('input')); // 「交換率（○○スロ）」の表示を更新
    }
  }

  if (Array.isArray(d.others)) {
    fOthers.innerHTML = '';
    d.others.slice(0, OTHER_MAX).forEach(function (o) {
      if (!o || typeof o !== 'object') return;
      addOtherBlock({
        kind: o.kind,
        price: typeof o.price === 'string' ? o.price : '',
        rate: typeof o.rate === 'string' ? o.rate : ''
      });
    });
    updateAddOtherBtn();
  }

  const hasSelected = TYPES.some(function (t) { return formSelected[t.key]; }) || !!formSelected.other;
  setStep(d.step === 2 && fName.value.trim() && hasSelected ? 2 : 1);
  showToast('入力途中の内容を復元しました');
}

function goNext() {
  const name = fName.value.trim();
  if (!name) {
    fErr.textContent = '店舗名を入力してください。';
    return;
  }
  if (fUrl.value.trim() && !sanitizeMinpachiUrl(fUrl.value)) {
    fErr.textContent = 'みんパチのURLは「https://minpachi.com/〇〇/」の形で入力してください（空欄でもOK）。';
    return;
  }
  const count = TYPES.filter(function (t) { return formSelected[t.key]; }).length + (formSelected.other ? 1 : 0);
  if (count === 0) {
    fErr.textContent = '設置している台を1つ以上選んでください。';
    return;
  }
  blurActive();
  setStep(2);
}

function submitForm() {
  const name = fName.value.trim().slice(0, 30);
  if (!name) {
    setStep(1);
    fErr.textContent = '店舗名を入力してください。';
    return;
  }

  const urlRaw = fUrl.value.trim();
  const url = sanitizeMinpachiUrl(urlRaw);
  if (urlRaw && !url) {
    setStep(1);
    fErr.textContent = 'みんパチのURLは「https://minpachi.com/〇〇/」の形で入力してください（空欄でもOK）。';
    return;
  }

  // 固定の4種
  const machines = {};
  let count = 0;
  const blocks = fDetails.querySelectorAll('.detail-block');
  for (let i = 0; i < blocks.length; i++) {
    const key = blocks[i].dataset.key;
    if (!formSelected[key]) continue;

    const t = typeOf(key);
    const price = parsePositive(blocks[i].querySelector('[data-role="price"]').value);
    const rate = parsePositive(blocks[i].querySelector('[data-role="rate"]').value);

    if (isNaN(price) || price > 1000) {
      fErr.textContent = t.label + 'の遊技料金を正しく入力してください。';
      return;
    }
    if (isNaN(rate) || rate > 10000) {
      fErr.textContent = t.label + 'の交換率を正しく入力してください。';
      return;
    }
    machines[key] = { price: price, rate: rate };
    count++;
  }

  // その他
  const others = [];
  if (formSelected.other) {
    const list = readOthers();
    for (let i = 0; i < list.length; i++) {
      const label = 'その他（' + (i + 1) + 'つ目）';
      const price = parsePositive(list[i].price);
      const rate = parsePositive(list[i].rate);
      if (isNaN(price) || price > 1000) {
        fErr.textContent = label + 'の遊技料金を正しく入力してください。';
        return;
      }
      if (isNaN(rate) || rate > 10000) {
        fErr.textContent = label + 'の交換率を正しく入力してください。';
        return;
      }
      others.push({ kind: KINDS.hasOwnProperty(list[i].kind) ? list[i].kind : 'slot', price: price, rate: rate });
    }
    if (others.length === 0) {
      fErr.textContent = '「その他」の台を追加するか、1ページ目で「その他」の選択を外してください。';
      return;
    }
  }

  if (count + others.length === 0) {
    setStep(1);
    fErr.textContent = '設置している台を1つ以上選んでください。';
    return;
  }

  const backup = customStores.slice();
  const isEdit = !!editingId;
  const data = { name: name, url: url, machines: machines, others: others };

  if (isEdit) {
    customStores = customStores.map(function (s) {
      return s.id === editingId ? storeCopy(data, s.id) : s;
    });
    state.storeId = editingId;
  } else {
    const id = newId();
    customStores.push(storeCopy(data, id));
    state.storeId = id;
  }

  if (!saveCustomStores()) {
    customStores = backup;
    fErr.textContent = '保存に失敗しました。プライベートブラウズを解除して試してください。';
    return;
  }

  saveState();
  closeForm();
  renderAll();
  showToast(isEdit ? '「' + name + '」を更新しました' : '「' + name + '」を追加しました');
}

function deleteCurrent() {
  const store = currentStore();
  if (store.builtin) return;
  if (!window.confirm('「' + store.name + '」を削除しますか？')) return;

  const backup = customStores.slice();
  customStores = customStores.filter(function (s) { return s.id !== store.id; });
  if (!saveCustomStores()) {
    customStores = backup;
    window.alert('削除に失敗しました。');
    return;
  }
  state.storeId = BUILTIN_STORES[0].id;
  saveState();
  renderAll();
  showToast('「' + store.name + '」を削除しました');
}

// ガイド画像（未設置なら準備中の表示に切り替え）
function showGuideFallback() {
  guideZoomBtn.classList.add('hidden');
  guideFallback.classList.remove('hidden');
}

function showGuideImage() {
  guideZoomBtn.classList.remove('hidden');
  guideFallback.classList.add('hidden');
}

// ===== ガイド画像の拡大表示 =====
function openZoom() {
  if (!guideImg.complete || guideImg.naturalWidth === 0) return;
  // スマホは大きく、PCは画面に収まる大きさで開く
  const wide = window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  zoomScroll.classList.toggle('large', !wide);
  openModal(zoomModal);
  zoomScroll.scrollLeft = 0;
  zoomScroll.scrollTop = 0;
}

function closeZoom() {
  closeModal(zoomModal);
}

// 画像タップで「全体表示」⇔「拡大」を切替（拡大時はタップした場所を中心に）
function toggleZoom(e) {
  const rect = zoomImg.getBoundingClientRect();
  const rx = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
  const ry = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
  const toLarge = !zoomScroll.classList.contains('large');
  zoomScroll.classList.toggle('large', toLarge);

  if (toLarge) {
    zoomScroll.scrollLeft = zoomImg.offsetLeft + rx * zoomImg.offsetWidth - zoomScroll.clientWidth / 2;
    zoomScroll.scrollTop = zoomImg.offsetTop + ry * zoomImg.offsetHeight - zoomScroll.clientHeight / 2;
  } else {
    zoomScroll.scrollLeft = 0;
    zoomScroll.scrollTop = 0;
  }
}

// ============================================================
//  書き出し・読み込み（JSON）
// ============================================================
function timestamp() {
  const d = new Date();
  const p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' +
    p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

function exportData() {
  if (customStores.length === 0) {
    showToast('書き出すマイホがまだありません');
    return;
  }

  const data = {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    stores: customStores.map(function (s) {
      return { name: s.name, url: s.url || '', machines: s.machines, others: s.others || [] };
    })
  };

  const filename = 'PachiData_' + timestamp() + '.json';
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    showToast(customStores.length + '店舗を書き出しました');
  } catch (e) {
    window.alert('書き出しに失敗しました。');
  }
}

function handleImportFile(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    window.alert('ファイルが大きすぎます。');
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    let parsed;
    try {
      parsed = JSON.parse(String(reader.result).replace(/^\uFEFF/, ''));
    } catch (e) {
      window.alert('JSONファイルとして読み込めませんでした。');
      return;
    }

    const rawList = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.stores) ? parsed.stores : null);
    if (!rawList) {
      window.alert('このツールの書き出しファイルではないようです。');
      return;
    }

    const list = [];
    rawList.forEach(function (raw) {
      const s = sanitizeStore(raw);
      if (s) list.push(s);
    });

    if (list.length === 0) {
      window.alert('読み込める店舗データがありませんでした。');
      return;
    }

    pendingImport = list;
    const skipped = rawList.length - list.length;
    importMsg.textContent = list.length + '店舗のデータが見つかりました。' +
      (skipped > 0 ? '（' + skipped + '件は形式が正しくないため除外）' : '') +
      '読み込み方法を選んでください。';
    openModal(importModal);
  };
  reader.onerror = function () {
    window.alert('ファイルを読み込めませんでした。');
  };
  reader.readAsText(file);
}

function applyImport(mode) {
  if (!pendingImport) return;

  if (mode === 'replace' &&
      !window.confirm('今登録しているマイホ（' + customStores.length + '店舗）を消して置き換えます。よろしいですか？')) {
    return;
  }

  const backup = customStores.slice();
  let added = 0;
  let updated = 0;
  let skipped = 0;
  let next;

  if (mode === 'replace') {
    next = pendingImport.map(function (s) {
      return storeCopy(s, newId());
    });
    added = next.length;
  } else {
    next = customStores.slice();
    pendingImport.forEach(function (s) {
      let idx = -1;
      for (let i = 0; i < next.length; i++) {
        if (next[i].name === s.name) { idx = i; break; }
      }
      if (idx >= 0) {
        if (mode === 'overwrite') {
          next[idx] = storeCopy(s, next[idx].id);
          updated++;
        } else {
          skipped++;
        }
      } else {
        next.push(storeCopy(s, newId()));
        added++;
      }
    });
  }

  customStores = next;
  if (!saveCustomStores()) {
    customStores = backup;
    window.alert('保存に失敗しました。');
    return;
  }

  pendingImport = null;
  closeModal(importModal);
  renderAll();

  const parts = [];
  if (added) parts.push(added + '店舗追加');
  if (updated) parts.push(updated + '店舗更新');
  if (skipped) parts.push(skipped + '店舗はそのまま');
  showToast(parts.length ? '読み込み完了：' + parts.join('、') : '変更はありませんでした');
}

// ============================================================
//  イベント
// ============================================================
storeSelect.addEventListener('change', function () {
  state.storeId = storeSelect.value;
  saveState();
  renderActions();
  renderTabs();
  renderMeta();
  runCalc(false); // 店舗の切替はアニメなしで即表示
});

// 入力しただけでは結果を変えない（計算ボタンで更新）
medalsEl.addEventListener('input', function () {
  state.medals = medalsEl.value;
  saveState();
  renderInputState();
});

// キーボードの確定キーでも計算
medalsEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    blurActive();
    runCalc(true);
  }
});

calcBtn.addEventListener('click', function () {
  blurActive();
  runCalc(true);
});

// 増減ボタン（入力欄の数字だけ変える。結果は計算ボタンで更新）
stepBtns.addEventListener('click', function (e) {
  const b = e.target.closest('.sbtn');
  if (!b) return;
  const step = parseInt(b.dataset.step, 10);
  if (!step) return;
  const n = Math.max(0, Math.min(9999999, parseMedals(medalsEl.value) + step));
  medalsEl.value = String(n);
  state.medals = medalsEl.value;
  saveState();
  renderInputState();
});

clearBtn.addEventListener('click', function () {
  medalsEl.value = '';
  state.medals = '';
  saveState();
  renderInputState();
  medalsEl.focus();
});

addBtn.addEventListener('click', function () { openForm(null); });
editBtn.addEventListener('click', function () {
  const store = currentStore();
  if (!store.builtin) openForm(store);
});
delBtn.addEventListener('click', deleteCurrent);

cancelBtn.addEventListener('click', closeForm);
addOtherBtn.addEventListener('click', function () {
  const b = addOtherBlock(null);
  fErr.textContent = '';
  saveDraft();
  if (b) {
    const first = b.querySelector('[data-role="price"]');
    if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (first) first.focus();
  }
});
nextBtn.addEventListener('click', goNext);
backBtn.addEventListener('click', function () { setStep(1); });
saveBtn.addEventListener('click', submitForm);
fName.addEventListener('input', function () { fErr.textContent = ''; });
fName.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    blurActive();
  }
});

bellBtn.addEventListener('click', openNews);
newsClose.addEventListener('click', function () { closeModal(newsModal); });

settingsBtn.addEventListener('click', openSettings);
settingsClose.addEventListener('click', function () { closeModal(settingsModal); });
// コンパス案内：「みんパチを開く」はリンクそのものなので、そのまま開く
tipOpen.addEventListener('click', function () {
  // チェックを入れて開いた時だけ7日間出さない（キャンセルでは記録しない）
  if (tipSnooze.checked) snoozeTip();
  saveDraft();
  closeModal(tipModal);
});
tipCancel.addEventListener('click', function () { closeModal(tipModal); });

// ホーム画面に追加
a2hsHow.addEventListener('click', openA2hs);
a2hsClose.addEventListener('click', dismissA2hsBanner);
a2hsSettingBtn.addEventListener('click', openA2hs);
a2hsCloseBtn.addEventListener('click', function () { closeModal(a2hsModal); });
a2hsExport.addEventListener('click', exportData);
a2hsInstall.addEventListener('click', function () {
  if (!deferredInstall) return;
  const ev = deferredInstall;
  deferredInstall = null;
  a2hsInstall.classList.add('hidden');
  ev.prompt();
  if (ev.userChoice && ev.userChoice.then) {
    ev.userChoice.then(function (r) {
      if (r && r.outcome === 'accepted') closeModal(a2hsModal);
    }).catch(function () { /* 何もしない */ });
  }
});

// Android Chromeで「インストール」できる状態になったらボタンを出す
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredInstall = e;
  if (!a2hsModal.classList.contains('hidden')) a2hsInstall.classList.remove('hidden');
  renderA2hsBanner();
});

window.addEventListener('appinstalled', function () {
  deferredInstall = null;
  a2hsBanner.classList.add('hidden');
  showToast('ホーム画面に追加しました');
});

// Guide2.png が無い時は手描きの図に切り替え
tipImg.addEventListener('error', function () { tipVisual.classList.remove('has-img'); });
tipImg.addEventListener('load', function () { tipVisual.classList.add('has-img'); });

// みんパチのリンク（1ページ目・2ページ目）
const minpachiLinks = document.querySelectorAll('.minpachi-link');
for (let i = 0; i < minpachiLinks.length; i++) {
  minpachiLinks[i].addEventListener('click', onMinpachiClick);
}

// フォームの入力内容はその都度下書き保存
formModal.addEventListener('input', saveDraft);

// アプリを離れる・切り替える瞬間にも保存
window.addEventListener('pagehide', saveDraft);
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') saveDraft();
});

animToggle.addEventListener('click', function () {
  settings.anim = !settings.anim;
  saveSettings();
  renderSettings();
  if (!settings.anim && animFrame) {
    // OFFにしたらアニメ途中の数字をすぐ確定
    runCalc(false);
  }
  showToast('アニメーションを' + (settings.anim ? 'ON' : 'OFF') + 'にしました');
});

exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', function () { importFile.click(); });
importFile.addEventListener('change', function () {
  const file = importFile.files && importFile.files[0];
  handleImportFile(file);
  importFile.value = ''; // 同じファイルを続けて選べるように
});
impOverwrite.addEventListener('click', function () { applyImport('overwrite'); });
impSkip.addEventListener('click', function () { applyImport('skip'); });
impReplace.addEventListener('click', function () { applyImport('replace'); });
impCancel.addEventListener('click', function () {
  pendingImport = null;
  closeModal(importModal);
});

guideImg.addEventListener('error', showGuideFallback);
guideImg.addEventListener('load', showGuideImage);
guideZoomBtn.addEventListener('click', openZoom);
window.addEventListener('resize', function () { positionTabIndicator(false); });
zoomClose.addEventListener('click', closeZoom);
zoomImg.addEventListener('click', toggleZoom);
zoomScroll.addEventListener('click', function (e) {
  if (e.target === zoomScroll) closeZoom(); // 画像の外をタップで閉じる
});

// 背景タップで閉じる（入力中のフォームは誤タップ防止のため対象外）
[newsModal, importModal, settingsModal, a2hsModal].forEach(function (m) {
  m.addEventListener('click', function (e) {
    if (e.target !== m) return;
    if (m === importModal) pendingImport = null;
    closeModal(m);
  });
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!tipModal.classList.contains('hidden')) {
    closeModal(tipModal);
  } else if (!a2hsModal.classList.contains('hidden')) {
    closeModal(a2hsModal);
  } else if (!zoomModal.classList.contains('hidden')) {
    closeZoom();
  } else if (!importModal.classList.contains('hidden')) {
    pendingImport = null;
    closeModal(importModal);
  } else if (!newsModal.classList.contains('hidden')) {
    closeModal(newsModal);
  } else if (!settingsModal.classList.contains('hidden')) {
    closeModal(settingsModal);
  } else if (!formModal.classList.contains('hidden')) {
    closeForm();
  }
});

// ============================================================
//  iOS Safari対策（ダブルタップ拡大・ピンチ拡大・長押しメニュー）
// ============================================================
let lastTouch = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  // 入力欄・ボタン類は素早い連続タップを妨げないよう除外（拡大はtouch-actionで抑止）
  const interactive = e.target.closest && e.target.closest('input, select, textarea, button, label, a');
  if (!interactive && now - lastTouch <= 300) e.preventDefault();
  lastTouch = now;
}, { passive: false });

['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); });
});

document.addEventListener('contextmenu', function (e) {
  if (e.target.closest && e.target.closest('input, textarea')) return;
  e.preventDefault();
});

// ============================================================
//  起動
// ============================================================
medalsEl.value = state.medals;
if (guideImg.complete) {
  if (guideImg.naturalWidth === 0) showGuideFallback();
  else showGuideImage();
}
renderAll();      // 起動時は保存済みの枚数でアニメなし表示
if (tipImg.complete && tipImg.naturalWidth === 0) tipVisual.classList.remove('has-img');
if (isStandalone()) document.body.classList.add('is-standalone');
renderBadge();
renderSettings();
renderA2hsSetting();
renderA2hsBanner();
restoreDraft();   // 入力途中のフォームがあれば続きから
