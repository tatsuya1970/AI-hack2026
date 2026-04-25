// ステージ定義（4面でループ）
const BASE_STAGES = [
  { background: '弾', hidden: '禅', title: '禅を見つけよ' },
  { background: '悪', hidden: '善', title: '善を見つけよ' },
  { background: '金', hidden: '全', title: '全を見つけよ' },
  { background: '後', hidden: '前', title: '前を見つけよ' },
];

const BASE_CELL_SIZE = 160; // デフォルト文字サイズ（4面ごとに半分）
const TIME_LIMIT = 10;      // 制限時間（秒）

let currentStageIndex = 0;
let hiddenCellIndex = -1;
let mistakes = 0;
let totalMistakes = 0;
let stageStartTime = null;
let gameStartTime = null;
let timerInterval = null;
let tauntTimeout = null;

// --- DOM参照 ---
const screens = {
  title:    document.getElementById('title-screen'),
  game:     document.getElementById('game-screen'),
  gameover: document.getElementById('gameover-screen'),
  clear:    document.getElementById('clear-screen'),
};
const grid          = document.getElementById('grid');
const stageLabel    = document.getElementById('stage-label');
const stageTitleEl  = document.getElementById('stage-title');
const timerEl       = document.getElementById('timer');
const mistakeEl     = document.getElementById('mistake-count');
const tauntBox      = document.getElementById('taunt-box');
const tauntText     = document.getElementById('taunt-text');
const scoreEl       = document.getElementById('enlightenment-score');
const commentEl     = document.getElementById('diagnosis-comment');
const statsEl       = document.getElementById('clear-stats');

// --- 4面ごとに文字サイズが半分になる ---
function getCellSize() {
  const loopCount = Math.floor(currentStageIndex / 4);
  return Math.max(20, BASE_CELL_SIZE / Math.pow(2, loopCount));
}

// --- 画面切り替え ---
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// --- ゲーム開始 ---
document.getElementById('start-btn').addEventListener('click', () => {
  currentStageIndex = 0;
  totalMistakes = 0;
  gameStartTime = Date.now();
  showScreen('game');
  startStage();
});

document.getElementById('retry-btn').addEventListener('click', () => showScreen('title'));
document.getElementById('gameover-retry-btn').addEventListener('click', () => showScreen('title'));

// --- ステージ開始 ---
function startStage() {
  mistakes = 0;
  hiddenCellIndex = -1;
  hideTaunt();

  const stage = currentStage();
  const loopCount = Math.floor(currentStageIndex / 4);
  const loopLabel = loopCount > 0 ? ` (×${loopCount + 1})` : '';

  stageLabel.textContent = `${currentStageIndex + 1}面${loopLabel}`;
  stageTitleEl.textContent = stage.title;
  mistakeEl.textContent = `ミス: ${totalMistakes}`;
  timerEl.style.color = '#888';

  buildGrid(stage);
  startTimer();
}

function currentStage() {
  return BASE_STAGES[currentStageIndex % BASE_STAGES.length];
}

// --- グリッド生成 ---
function buildGrid(stage) {
  grid.innerHTML = '';

  const cellSize = getCellSize();
  const fontSize = Math.floor(cellSize * 0.62);
  grid.style.fontSize = `${fontSize}px`;

  const headerH = document.getElementById('game-header').offsetHeight;
  const cols = Math.floor(window.innerWidth / cellSize);
  const rows = Math.floor((window.innerHeight - headerH) / cellSize);
  const total = cols * rows;

  hiddenCellIndex = Math.floor(Math.random() * total);

  grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
  grid.style.gridTemplateRows    = `repeat(${rows}, ${cellSize}px)`;

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const span = document.createElement('span');
    span.className = 'cell';
    span.textContent = (i === hiddenCellIndex) ? stage.hidden : stage.background;
    span.dataset.index = i;
    span.addEventListener('click', handleCellClick);
    fragment.appendChild(span);
  }
  grid.appendChild(fragment);
}

// --- クリック判定 ---
function handleCellClick(e) {
  const index = parseInt(e.target.dataset.index);

  if (index === hiddenCellIndex) {
    // 正解
    e.target.classList.add('correct');
    stopTimer();
    hideTaunt();
    setTimeout(() => {
      currentStageIndex++;
      startStage();
    }, 700);
  } else {
    // 不正解
    mistakes++;
    totalMistakes++;
    mistakeEl.textContent = `ミス: ${totalMistakes}`;
    e.target.classList.add('wrong');
    setTimeout(() => e.target.classList.remove('wrong'), 400);
    fetchTaunt();
  }
}

// --- カウントダウンタイマー ---
function startTimer() {
  stageStartTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - stageStartTime) / 1000;
    const remaining = Math.max(0, TIME_LIMIT - elapsed);
    timerEl.textContent = `残り ${remaining.toFixed(1)}s`;
    timerEl.style.color = remaining < 3 ? '#f00' : '#888';

    if (remaining <= 0) {
      stopTimer();
      gameOver();
    }
  }, 50);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

// --- ゲームオーバー ---
function gameOver() {
  stopTimer();
  hideTaunt();
  showScreen('gameover');

  const totalTime = Math.round((Date.now() - gameStartTime) / 1000);
  const loopCount = Math.floor(currentStageIndex / 4);
  const stageInLoop = (currentStageIndex % BASE_STAGES.length) + 1;

  document.getElementById('gameover-stage').textContent =
    `第${currentStageIndex + 1}面（${loopCount > 0 ? `${loopCount + 1}周目 ` : ''}${stageInLoop}面目）で力尽きた`;
  document.getElementById('gameover-stats').textContent =
    `合計時間: ${totalTime}秒  /  ミス: ${totalMistakes}回`;
}

// --- 煽り文句 ---
async function fetchTaunt() {
  const stage = currentStage();
  try {
    const res = await fetch('/api/taunt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        background: stage.background,
        hidden:     stage.hidden,
        attempts:   mistakes,
      }),
    });
    const data = await res.json();
    showTaunt(data.comment);
  } catch {
    const fallbacks = ['目は開いているか？', '煩悩が深すぎる...', 'まだまだじゃ。', '執着を捨てよ。'];
    showTaunt(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }
}

function showTaunt(text) {
  if (tauntTimeout) clearTimeout(tauntTimeout);
  tauntText.textContent = text;
  tauntBox.classList.remove('hidden');
  tauntTimeout = setTimeout(hideTaunt, 2500);
}

function hideTaunt() {
  tauntBox.classList.add('hidden');
}

// --- 全面クリア（エンドレスなので現状未使用・将来用） ---
async function endGame() {
  stopTimer();
  showScreen('clear');

  const totalTime = Math.round((Date.now() - gameStartTime) / 1000);
  statsEl.textContent = `クリア: ${currentStageIndex}面  /  時間: ${totalTime}秒  /  ミス: ${totalMistakes}回`;
  scoreEl.textContent = '診断中...';
  commentEl.textContent = '';

  try {
    const res = await fetch('/api/diagnosis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalTime, totalMistakes, stagesCleared: currentStageIndex }),
    });
    const data = await res.json();
    scoreEl.textContent = `悟り度 ${data.score} 点`;
    commentEl.textContent = data.comment;
  } catch {
    const score = Math.max(5, 100 - totalMistakes * 4 - Math.floor(totalTime / 8));
    scoreEl.textContent = `悟り度 ${score} 点`;
    commentEl.textContent = '修行の道はまだ続く...';
  }
}
