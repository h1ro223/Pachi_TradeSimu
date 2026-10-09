// ===== 設定（ここを変えれば他のホールにも対応） =====
const RATE = 5.2;        // 100円あたりの交換枚数
const UNIT_YEN = 500;    // 景品の最小単位（円）
// ====================================================

// 500円分に必要な枚数（端数は切り上げ）
const UNIT_MEDALS = Math.ceil(RATE * (UNIT_YEN / 100) - 1e-9);

const medalsEl = document.getElementById('medals');
const yenEl = document.getElementById('yen');
const restEl = document.getElementById('rest');
const noteEl = document.getElementById('note');

noteEl.textContent = UNIT_YEN + '円 = ' + UNIT_MEDALS + '枚単位で計算';

function calc() {
  const n = Math.max(0, Math.floor(Number(medalsEl.value) || 0));
  const units = Math.floor(n / UNIT_MEDALS);
  yenEl.textContent = (units * UNIT_YEN).toLocaleString() + '円';
  restEl.textContent = (n % UNIT_MEDALS) + '枚';
}

medalsEl.addEventListener('input', calc);

// iOS Safariのダブルタップ拡大・ピンチ拡大・長押しメニュー対策
let lastTouch = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  if (now - lastTouch <= 300) e.preventDefault();
  lastTouch = now;
}, { passive: false });
['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); });
});
document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

calc();
