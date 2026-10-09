// ============================================================
//  換金計算ツール  made by hiro/ヒロ
// ============================================================

// ===== 基本設定 =====
const PRIZE_UNIT = 500; // 景品の最小単位（円）

// 台の種類
const TYPES = [
  { key: 'p1',  label: '1円パチンコ',  short: '1パチ',  kind: 'パチ', unit: '玉', defPrice: 1,  ratePh: '例 100' },
  { key: 'p4',  label: '4円パチンコ',  short: '4パチ',  kind: 'パチ', unit: '玉', defPrice: 4,  ratePh: '例 25' },
  { key: 's5',  label: '5円スロット',  short: '5スロ',  kind: 'スロ', unit: '枚', defPrice: 5,  ratePh: '例 20' },
  { key: 's20', label: '20円スロット', short: '20スロ', kind: 'スロ', unit: '枚', defPrice: 20, ratePh: '例 5' }
];

// ===== 収録店舗（アプデで追加していく） =====
// machines: { 台キー: { price: 遊技料金(円), rate: 100円あたりの交換枚数/玉数 } }
const BUILTIN_STORES = [
  {
    id: 'b_daitoyo_honten',
    name: '大東洋本店',
    builtin: true,
    machines: {
      s20: { price: 21.73, rate: 5.2 }
    }
  }
];

// ===== お知らせ（新しいものを上に追加） =====
// type: 'feature' → 機能追加 / 'stores' → 店舗追加
// id は一度決めたら変えない（既読管理に使う）
const NEWS = [
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
const EXPORT_APP = 'kankin-calculator';
const EXPORT_VERSION = 1;

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
const yenEl = $('yen');
const restEl = $('rest');
const nextEl = $('next');
const noteEl = $('note');

const bellBtn = $('bellBtn');
const bellBadge = $('bellBadge');
const newsModal = $('newsModal');
const newsList = $('newsList');
const newsClose = $('newsClose');

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

const toastEl = $('toast');

// ===== 状態 =====
let customStores = loadCustomStores();
const state = loadState();
let editingId = null;     // nullなら新規追加
let formStep = 1;
let formSelected = {};    // { 台キー: true }
let pendingImport = null; // 読み込み待ちの店舗リスト
let toastTimer = null;
let idSeq = 0;

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
function sanitizeStore(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 30) : '';
  if (!name) return null;
  if (!raw.machines || typeof raw.machines !== 'object') return null;

  const machines = {};
  let count = 0;
  TYPES.forEach(function (t) {
    const m = raw.machines[t.key];
    if (!m || typeof m !== 'object') return;
    const fixed = { price: parsePositive(m.price), rate: parsePositive(m.rate) };
    if (isValidMachine(fixed)) {
      machines[t.key] = fixed;
      count++;
    }
  });
  if (count === 0) return null;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name: name,
    builtin: false,
    machines: machines
  };
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
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

function availableTypes(store) {
  return TYPES.filter(function (t) { return isValidMachine(store.machines[t.key]); });
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
}

function renderTabs() {
  const store = currentStore();
  const types = availableTypes(store);

  if (!types.some(function (t) { return t.key === state.typeKey; })) {
    state.typeKey = types[0].key;
  }

  typeTabs.innerHTML = '';
  typeTabs.style.gridTemplateColumns = 'repeat(' + types.length + ', 1fr)';

  types.forEach(function (t) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (t.key === state.typeKey ? ' active' : '');
    b.textContent = t.short;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', t.key === state.typeKey ? 'true' : 'false');
    b.addEventListener('click', function () {
      if (state.typeKey === t.key) return;
      state.typeKey = t.key;
      saveState();
      renderTabs();
      calc();
    });
    typeTabs.appendChild(b);
  });
}

function calc() {
  const store = currentStore();
  const t = typeOf(state.typeKey);
  const m = store.machines[state.typeKey];
  if (!t || !isValidMachine(m)) return;

  const per = unitMedals(m.rate);

  medalsLabel.textContent = '今の持ち' + (t.unit === '玉' ? '玉数' : 'メダル枚数');
  medalsEl.placeholder = '例：' + (per * 20 + Math.round(per / 2));
  infoEl.textContent = fmt(m.price) + '円' + t.kind + '　' + fmt(m.rate) + t.unit + '交換（100円あたり）';

  const s = normalizeNum(medalsEl.value);
  const n = /^\d+$/.test(s) ? Math.min(parseInt(s, 10), 9999999) : 0;

  const units = Math.floor(n / per);
  const rest = n % per;

  yenEl.textContent = fmt(units * PRIZE_UNIT);
  restEl.textContent = fmt(rest) + t.unit;
  nextEl.textContent = n > 0 ? 'あと' + fmt(per - rest) + t.unit : '－';
  noteEl.textContent = PRIZE_UNIT + '円 = ' + per + t.unit + '単位／1' + t.unit + ' ≈ ' + (100 / m.rate).toFixed(2) + '円';
  clearBtn.style.visibility = medalsEl.value ? 'visible' : 'hidden';
}

function renderAll() {
  renderStoreSelect();
  renderActions();
  renderTabs();
  calc();
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
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
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
  TYPES.forEach(function (t) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = t.label;
    b.setAttribute('aria-pressed', formSelected[t.key] ? 'true' : 'false');
    b.addEventListener('click', function () {
      formSelected[t.key] = !formSelected[t.key];
      b.setAttribute('aria-pressed', formSelected[t.key] ? 'true' : 'false');
      fErr.textContent = '';
    });
    fTypeChips.appendChild(b);
  });
}

function buildDetails(store) {
  fDetails.innerHTML = '';

  TYPES.forEach(function (t) {
    const m = store ? store.machines[t.key] : null;
    const has = isValidMachine(m);

    const block = document.createElement('div');
    block.className = 'detail-block hidden';
    block.dataset.key = t.key;

    const title = document.createElement('p');
    title.className = 'detail-title';
    title.textContent = t.label;

    // 遊技料金
    const row1 = document.createElement('div');
    row1.className = 'frow';
    const l1 = document.createElement('span');
    l1.className = 'frow-label';
    l1.textContent = '遊技料金';
    const price = document.createElement('input');
    price.type = 'text';
    price.inputMode = 'decimal';
    price.autocomplete = 'off';
    price.placeholder = String(t.defPrice);
    price.value = has ? String(m.price) : String(t.defPrice);
    price.dataset.role = 'price';
    price.setAttribute('aria-label', t.label + 'の遊技料金');
    const u1 = document.createElement('span');
    u1.textContent = '円';
    row1.appendChild(l1);
    row1.appendChild(price);
    row1.appendChild(u1);

    // 交換率
    const row2 = document.createElement('div');
    row2.className = 'frow';
    const l2 = document.createElement('span');
    l2.className = 'frow-label';
    l2.textContent = '交換率';
    const prefix = document.createElement('span');
    prefix.className = 'prefix';
    const rate = document.createElement('input');
    rate.type = 'text';
    rate.inputMode = 'decimal';
    rate.autocomplete = 'off';
    rate.placeholder = t.ratePh;
    rate.value = has ? String(m.rate) : '';
    rate.dataset.role = 'rate';
    rate.setAttribute('aria-label', t.label + 'の交換率');
    const u2 = document.createElement('span');
    u2.textContent = t.unit;
    row2.appendChild(l2);
    row2.appendChild(prefix);
    row2.appendChild(rate);
    row2.appendChild(u2);

    // 「21.73スロ」のように遊技料金に連動
    const updatePrefix = function () {
      const p = parsePositive(price.value);
      prefix.textContent = (isNaN(p) ? fmt(t.defPrice) : fmt(p)) + t.kind;
    };
    price.addEventListener('input', function () { updatePrefix(); fErr.textContent = ''; });
    rate.addEventListener('input', function () { fErr.textContent = ''; });
    updatePrefix();

    block.appendChild(title);
    block.appendChild(row1);
    block.appendChild(row2);
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
  }

  formModal.querySelector('.sheet').scrollTop = 0;
}

function openForm(store) {
  editingId = store ? store.id : null;
  formTitle.textContent = store ? 'マイホを編集' : 'マイホ追加';
  saveBtn.textContent = store ? '変更を保存' : '保存';
  fName.value = store ? store.name : '';

  formSelected = {};
  if (store) {
    TYPES.forEach(function (t) {
      if (isValidMachine(store.machines[t.key])) formSelected[t.key] = true;
    });
  }

  buildChips();
  buildDetails(store);
  openModal(formModal);
  setStep(1);
}

function closeForm() {
  closeModal(formModal);
  editingId = null;
}

function goNext() {
  const name = fName.value.trim();
  if (!name) {
    fErr.textContent = '店舗名を入力してください。';
    return;
  }
  const count = TYPES.filter(function (t) { return formSelected[t.key]; }).length;
  if (count === 0) {
    fErr.textContent = '設置している台を1つ以上選んでください。';
    return;
  }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  setStep(2);
}

function submitForm() {
  const name = fName.value.trim().slice(0, 30);
  if (!name) {
    setStep(1);
    fErr.textContent = '店舗名を入力してください。';
    return;
  }

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

  if (count === 0) {
    setStep(1);
    fErr.textContent = '設置している台を1つ以上選んでください。';
    return;
  }

  const backup = customStores.slice();
  const isEdit = !!editingId;

  if (isEdit) {
    customStores = customStores.map(function (s) {
      return s.id === editingId ? { id: s.id, name: name, builtin: false, machines: machines } : s;
    });
    state.storeId = editingId;
  } else {
    const id = newId();
    customStores.push({ id: id, name: name, builtin: false, machines: machines });
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
  guideImg.classList.add('hidden');
  guideFallback.classList.remove('hidden');
}

function showGuideImage() {
  guideImg.classList.remove('hidden');
  guideFallback.classList.add('hidden');
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
      return { name: s.name, machines: s.machines };
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
      return { id: newId(), name: s.name, builtin: false, machines: s.machines };
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
          next[idx] = { id: next[idx].id, name: s.name, builtin: false, machines: s.machines };
          updated++;
        } else {
          skipped++;
        }
      } else {
        next.push({ id: newId(), name: s.name, builtin: false, machines: s.machines });
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
  calc();
});

medalsEl.addEventListener('input', function () {
  state.medals = medalsEl.value;
  saveState();
  calc();
});

clearBtn.addEventListener('click', function () {
  medalsEl.value = '';
  state.medals = '';
  saveState();
  calc();
  medalsEl.focus();
});

addBtn.addEventListener('click', function () { openForm(null); });
editBtn.addEventListener('click', function () {
  const store = currentStore();
  if (!store.builtin) openForm(store);
});
delBtn.addEventListener('click', deleteCurrent);

cancelBtn.addEventListener('click', closeForm);
nextBtn.addEventListener('click', goNext);
backBtn.addEventListener('click', function () { setStep(1); });
saveBtn.addEventListener('click', submitForm);
fName.addEventListener('input', function () { fErr.textContent = ''; });
fName.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
});

bellBtn.addEventListener('click', openNews);
newsClose.addEventListener('click', function () { closeModal(newsModal); });

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

// 背景タップで閉じる（入力中のフォームは誤タップ防止のため対象外）
[newsModal, importModal].forEach(function (m) {
  m.addEventListener('click', function (e) {
    if (e.target !== m) return;
    if (m === importModal) pendingImport = null;
    closeModal(m);
  });
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (!importModal.classList.contains('hidden')) {
    pendingImport = null;
    closeModal(importModal);
  } else if (!newsModal.classList.contains('hidden')) {
    closeModal(newsModal);
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
renderAll();
renderBadge();
