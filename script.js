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

// ===== 保存キー =====
const LS_STORES = 'kankin_custom_stores_v1';
const LS_STATE = 'kankin_state_v1';

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
const yenEl = $('yen');
const restEl = $('rest');
const noteEl = $('note');
const nextEl = $('next');

const modal = $('modal');
const modalTitle = $('modalTitle');
const fName = $('fName');
const fTypes = $('fTypes');
const fErr = $('fErr');
const saveBtn = $('saveBtn');
const cancelBtn = $('cancelBtn');

// ===== 状態 =====
let customStores = loadCustomStores();
const state = loadState();
let editingId = null; // nullなら新規追加

// ============================================================
//  ユーティリティ
// ============================================================

// 全角数字・全角ピリオド・カンマを半角に
function normalizeNum(str) {
  return String(str || '')
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

function isValidMachine(m) {
  return m && typeof m === 'object' &&
    typeof m.price === 'number' && m.price > 0 &&
    typeof m.rate === 'number' && m.rate > 0;
}

function isValidStore(s) {
  if (!s || typeof s !== 'object' || typeof s.id !== 'string' || typeof s.name !== 'string') return false;
  if (!s.machines || typeof s.machines !== 'object') return false;
  return TYPES.some(function (t) { return isValidMachine(s.machines[t.key]); });
}

// ============================================================
//  保存・読み込み
// ============================================================
function loadCustomStores() {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_STORES) || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter(isValidStore).map(function (s) {
      // 不正な台データは除外
      const machines = {};
      TYPES.forEach(function (t) {
        if (isValidMachine(s.machines[t.key])) machines[t.key] = s.machines[t.key];
      });
      return { id: s.id, name: s.name, builtin: false, machines: machines };
    });
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
//  描画
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
  const word = t.unit === '玉' ? '玉数' : 'メダル枚数';

  medalsLabel.textContent = '今の持ち' + word;
  medalsEl.placeholder = '例：' + (per * 20 + Math.round(per / 2));
  infoEl.textContent = fmt(m.price) + '円' + t.kind + '　' + fmt(m.rate) + t.unit + '交換（100円あたり）';

  const s = normalizeNum(medalsEl.value);
  const n = /^\d+$/.test(s) ? Math.min(parseInt(s, 10), 9999999) : 0;

  const units = Math.floor(n / per);
  const rest = n % per;

  yenEl.textContent = fmt(units * PRIZE_UNIT) + '円';
  restEl.textContent = fmt(rest) + t.unit;

  noteEl.textContent = PRIZE_UNIT + '円 = ' + per + t.unit + '単位／1' + t.unit + ' ≈ ' + (100 / m.rate).toFixed(2) + '円';
  nextEl.textContent = (n > 0 && rest > 0)
    ? 'あと' + fmt(per - rest) + t.unit + 'で次の' + PRIZE_UNIT + '円'
    : '';
}

function renderAll() {
  renderStoreSelect();
  renderActions();
  renderTabs();
  calc();
}

// ============================================================
//  マイホ追加・編集フォーム
// ============================================================
function buildForm(store) {
  fTypes.innerHTML = '';

  TYPES.forEach(function (t) {
    const m = store ? store.machines[t.key] : null;
    const on = isValidMachine(m);

    const block = document.createElement('div');
    block.className = 'type-block' + (on ? ' on' : '');
    block.dataset.key = t.key;

    // チェックボックス
    const label = document.createElement('label');
    label.className = 'check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = on;
    const span = document.createElement('span');
    span.textContent = t.label;
    label.appendChild(cb);
    label.appendChild(span);

    // 詳細（遊技料金・交換率）
    const detail = document.createElement('div');
    detail.className = 'type-detail' + (on ? '' : ' hidden');

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
    price.value = on ? String(m.price) : '';
    price.dataset.role = 'price';
    const u1 = document.createElement('span');
    u1.textContent = '円';
    row1.appendChild(l1);
    row1.appendChild(price);
    row1.appendChild(u1);

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
    rate.value = on ? String(m.rate) : '';
    rate.dataset.role = 'rate';
    const u2 = document.createElement('span');
    u2.textContent = t.unit;
    row2.appendChild(l2);
    row2.appendChild(prefix);
    row2.appendChild(rate);
    row2.appendChild(u2);

    // 「21.73スロ」のように遊技料金に連動して表示
    const updatePrefix = function () {
      const p = parsePositive(price.value);
      prefix.textContent = (isNaN(p) ? fmt(t.defPrice) : fmt(p)) + t.kind;
    };
    price.addEventListener('input', updatePrefix);
    updatePrefix();

    cb.addEventListener('change', function () {
      block.classList.toggle('on', cb.checked);
      detail.classList.toggle('hidden', !cb.checked);
      if (cb.checked && price.value === '') {
        price.value = String(t.defPrice);
        updatePrefix();
      }
      fErr.textContent = '';
    });

    detail.appendChild(row1);
    detail.appendChild(row2);
    block.appendChild(label);
    block.appendChild(detail);
    fTypes.appendChild(block);
  });
}

function openModal(store) {
  editingId = store ? store.id : null;
  modalTitle.textContent = store ? 'マイホを編集' : 'マイホ追加';
  saveBtn.textContent = store ? '変更を保存' : '保存';
  fName.value = store ? store.name : '';
  fErr.textContent = '';
  buildForm(store);

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modal.querySelector('.sheet').scrollTop = 0;
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  editingId = null;
  if (document.activeElement) document.activeElement.blur();
}

function submitForm() {
  const name = fName.value.trim();
  if (!name) {
    fErr.textContent = '店舗名を入力してください。';
    return;
  }

  const machines = {};
  let count = 0;
  const blocks = fTypes.querySelectorAll('.type-block');

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const cb = block.querySelector('input[type="checkbox"]');
    if (!cb.checked) continue;

    const t = typeOf(block.dataset.key);
    const price = parsePositive(block.querySelector('[data-role="price"]').value);
    const rate = parsePositive(block.querySelector('[data-role="rate"]').value);

    if (isNaN(price) || price > 1000) {
      fErr.textContent = t.label + 'の遊技料金を正しく入力してください。';
      return;
    }
    if (isNaN(rate) || rate > 10000) {
      fErr.textContent = t.label + 'の交換率を正しく入力してください。';
      return;
    }
    machines[t.key] = { price: price, rate: rate };
    count++;
  }

  if (count === 0) {
    fErr.textContent = '設置している台を1つ以上選んでください。';
    return;
  }

  const backup = customStores.slice();

  if (editingId) {
    customStores = customStores.map(function (s) {
      return s.id === editingId ? { id: s.id, name: name, builtin: false, machines: machines } : s;
    });
    state.storeId = editingId;
  } else {
    const id = 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    customStores.push({ id: id, name: name, builtin: false, machines: machines });
    state.storeId = id;
  }

  if (!saveCustomStores()) {
    customStores = backup;
    fErr.textContent = '保存に失敗しました。プライベートブラウズを解除して試してください。';
    return;
  }

  saveState();
  closeModal();
  renderAll();
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

addBtn.addEventListener('click', function () { openModal(null); });
editBtn.addEventListener('click', function () {
  const store = currentStore();
  if (!store.builtin) openModal(store);
});
delBtn.addEventListener('click', deleteCurrent);
saveBtn.addEventListener('click', submitForm);
cancelBtn.addEventListener('click', closeModal);
fName.addEventListener('input', function () { fErr.textContent = ''; });

document.addEventListener('keydown', function (e) {
  if (modal.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeModal();
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
renderAll();
