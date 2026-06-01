# Mini-Games Arcade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page arcade with five mini-games (Snake, Pong, Tic-Tac-Toe, Memory Match, Flappy Bird) selectable from a menu.

**Architecture:** Static HTML page; `main.js` owns the menu and a single game container, dynamically importing the chosen game module on demand. Each game module exports `mount(container)` and `unmount()`. Canvas-based games use `requestAnimationFrame` with the handle stored so `unmount` can cancel it. DOM-based games clear listeners explicitly.

**Tech Stack:** Vanilla HTML5, CSS3, JavaScript (ES modules). No build step, no npm, no frameworks. Tested manually in a modern desktop browser (Chrome/Edge/Firefox).

**Note on testing:** Spec excludes npm/bundlers, so no automated test runner. Each game task ends with a "Manual verification" step listing exact browser interactions to perform and the observed result expected.

---

## File Structure

Files this plan creates:

```
mini-games/
  index.html              menu shell + game container + back button
  style.css               shared styling (dark theme, centered layout)
  main.js                 menu navigation; dynamically imports/mounts games
  games/
    tictactoe.js          DOM, hot-seat X vs O
    memory.js             DOM, 4x4 grid card matching
    snake.js              canvas, arrow keys, grid-based
    pong.js               canvas, mouse or arrows, AI opponent
    flappy.js             canvas, space/click to flap
```

Each file in `games/` is self-contained: imports nothing, exports exactly `mount(container)` and `unmount()`. `main.js` is the only place that knows about all games.

---

## Task 1: Page skeleton (HTML + CSS + empty menu)

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `main.js`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mini Games Arcade</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>Mini Games Arcade</h1>
    <button id="back-button" hidden>&larr; Back</button>
  </header>
  <main>
    <div id="menu">
      <button class="menu-btn" data-game="snake">Snake</button>
      <button class="menu-btn" data-game="pong">Pong</button>
      <button class="menu-btn" data-game="tictactoe">Tic-Tac-Toe</button>
      <button class="menu-btn" data-game="memory">Memory Match</button>
      <button class="menu-btn" data-game="flappy">Flappy Bird</button>
    </div>
    <div id="game-container"></div>
  </main>
  <script type="module" src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `style.css`**

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #1a1a2e;
  color: #eaeaea;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #0f0f1e;
  border-bottom: 1px solid #2a2a3e;
}

h1 { margin: 0; font-size: 24px; }

#back-button {
  background: #4a4a6a;
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
}
#back-button:hover { background: #5a5a7a; }

main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

#menu {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  max-width: 800px;
  width: 100%;
}

.menu-btn {
  padding: 32px 16px;
  font-size: 20px;
  background: #e94560;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.1s, background 0.2s;
}
.menu-btn:hover { background: #ff5773; transform: translateY(-2px); }

#game-container {
  display: none;
  align-items: center;
  justify-content: center;
}
#game-container.active { display: flex; }
```

- [ ] **Step 3: Create `main.js` (menu only, no game wiring yet)**

```js
const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backButton = document.getElementById('back-button');

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-btn');
  if (!btn) return;
  const gameName = btn.dataset.game;
  console.log('Selected game:', gameName);
});

backButton.addEventListener('click', () => {
  console.log('Back clicked');
});
```

- [ ] **Step 4: Manual verification**

Open `index.html` in a browser (double-click or drag into a tab).

Expected:
- Dark page loads with header "Mini Games Arcade".
- Five red buttons in a grid: Snake, Pong, Tic-Tac-Toe, Memory Match, Flappy Bird.
- Buttons highlight on hover.
- Back button is hidden.
- Open DevTools console: clicking any menu button logs `Selected game: <name>`.
- No errors in console.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css main.js
git commit -m "Add page skeleton with menu and back button"
```

---

## Task 2: Mount/unmount wiring with a stub game

Wire `main.js` to dynamically import a chosen game module and call `mount(container)` / `unmount()`. Prove the contract works using a tiny stub before any real game exists.

**Files:**
- Create: `games/tictactoe.js` (stub for now — replaced in Task 3)
- Modify: `main.js`

- [ ] **Step 1: Create a stub `games/tictactoe.js`**

```js
let rootEl = null;

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.textContent = 'Tic-Tac-Toe (stub) — Task 2 wiring check';
  rootEl.style.padding = '40px';
  rootEl.style.fontSize = '20px';
  container.appendChild(rootEl);
}

export function unmount() {
  if (rootEl) {
    rootEl.remove();
    rootEl = null;
  }
}
```

- [ ] **Step 2: Replace `main.js` with full mount/unmount wiring**

```js
const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backButton = document.getElementById('back-button');

let currentGame = null;

const gameModules = {
  snake: () => import('./games/snake.js'),
  pong: () => import('./games/pong.js'),
  tictactoe: () => import('./games/tictactoe.js'),
  memory: () => import('./games/memory.js'),
  flappy: () => import('./games/flappy.js'),
};

async function launchGame(name) {
  const loader = gameModules[name];
  if (!loader) return;
  const module = await loader();
  currentGame = module;
  menu.style.display = 'none';
  gameContainer.classList.add('active');
  backButton.hidden = false;
  module.mount(gameContainer);
}

function returnToMenu() {
  if (currentGame) {
    currentGame.unmount();
    currentGame = null;
  }
  gameContainer.classList.remove('active');
  gameContainer.innerHTML = '';
  backButton.hidden = true;
  menu.style.display = 'grid';
}

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-btn');
  if (!btn) return;
  launchGame(btn.dataset.game);
});

backButton.addEventListener('click', returnToMenu);
```

- [ ] **Step 3: Manual verification**

Reload `index.html`.

Expected:
- Click "Tic-Tac-Toe" → menu disappears, Back button appears, text "Tic-Tac-Toe (stub) — Task 2 wiring check" shows.
- Click Back → text disappears, menu reappears, Back button hides.
- Click "Snake" → no error in console (`snake.js` doesn't exist yet, so a 404 is OK; we just want to confirm Tic-Tac-Toe works).
- After Back, click "Tic-Tac-Toe" again → stub appears again (proving `unmount` cleaned up).

Note: the four games not yet implemented will throw module-not-found errors in console — that's expected at this stage.

- [ ] **Step 4: Commit**

```bash
git add main.js games/tictactoe.js
git commit -m "Add mount/unmount wiring with tic-tac-toe stub"
```

---

## Task 3: Tic-Tac-Toe (DOM, 2-player hot-seat)

Replace the stub with a real Tic-Tac-Toe game. X and O alternate on the same keyboard.

**Files:**
- Modify: `games/tictactoe.js`

- [ ] **Step 1: Replace `games/tictactoe.js` with the real implementation**

```js
const WIN_LINES = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6],
];

let rootEl = null;
let board = [];
let currentPlayer = 'X';
let gameOver = false;

function findWinner() {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function render(statusEl, cellEls) {
  cellEls.forEach((el, i) => {
    el.textContent = board[i] || '';
    el.classList.toggle('taken', !!board[i]);
  });
  const winner = findWinner();
  if (winner) {
    statusEl.textContent = `${winner} wins!`;
    gameOver = true;
  } else if (board.every(c => c)) {
    statusEl.textContent = `Draw.`;
    gameOver = true;
  } else {
    statusEl.textContent = `${currentPlayer}'s turn`;
  }
}

function reset(statusEl, cellEls) {
  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver = false;
  render(statusEl, cellEls);
}

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.innerHTML = `
    <style>
      .ttt-wrap { text-align: center; }
      .ttt-status { font-size: 24px; margin-bottom: 16px; }
      .ttt-grid { display: grid; grid-template-columns: repeat(3, 96px); gap: 8px; justify-content: center; }
      .ttt-cell {
        width: 96px; height: 96px;
        background: #2a2a3e; color: #eaeaea;
        font-size: 48px; font-weight: bold;
        border: none; border-radius: 4px; cursor: pointer;
      }
      .ttt-cell:hover:not(.taken) { background: #3a3a4e; }
      .ttt-cell.taken { cursor: default; }
      .ttt-reset { margin-top: 16px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
    </style>
    <div class="ttt-wrap">
      <div class="ttt-status">X's turn</div>
      <div class="ttt-grid">
        ${Array.from({length:9}, (_,i) => `<button class="ttt-cell" data-i="${i}"></button>`).join('')}
      </div>
      <button class="ttt-reset">Reset</button>
    </div>
  `;
  container.appendChild(rootEl);

  const statusEl = rootEl.querySelector('.ttt-status');
  const cellEls = Array.from(rootEl.querySelectorAll('.ttt-cell'));
  const resetBtn = rootEl.querySelector('.ttt-reset');

  board = Array(9).fill(null);
  currentPlayer = 'X';
  gameOver = false;

  rootEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.ttt-cell');
    if (!cell || gameOver) return;
    const i = Number(cell.dataset.i);
    if (board[i]) return;
    board[i] = currentPlayer;
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    render(statusEl, cellEls);
  });

  resetBtn.addEventListener('click', () => reset(statusEl, cellEls));
}

export function unmount() {
  if (rootEl) {
    rootEl.remove();
    rootEl = null;
  }
  board = [];
  gameOver = false;
}
```

- [ ] **Step 2: Manual verification**

Reload, click Tic-Tac-Toe.

Test the win path:
- X clicks top-left, O clicks middle, X clicks top-middle, O clicks center-left, X clicks top-right.
- Expected: status changes to "X wins!", further clicks are ignored.

Test the draw path:
- Reset, play a full board with no winner.
- Expected: status shows "Draw.", clicks ignored.

Test reset:
- Click Reset mid-game → board clears, status "X's turn".

Test back-to-menu:
- Click Back → menu returns. Re-enter Tic-Tac-Toe → fresh board.

- [ ] **Step 3: Commit**

```bash
git add games/tictactoe.js
git commit -m "Implement Tic-Tac-Toe game"
```

---

## Task 4: Memory Match (DOM, 4×4 grid, 8 pairs)

**Files:**
- Create: `games/memory.js`

- [ ] **Step 1: Create `games/memory.js`**

```js
const SYMBOLS = ['🍎','🍌','🍇','🍒','🥝','🍉','🍓','🥥'];

let rootEl = null;
let cards = [];
let flippedIndices = [];
let matchedCount = 0;
let lockTimer = null;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards() {
  const doubled = SYMBOLS.concat(SYMBOLS);
  return shuffle(doubled).map((sym) => ({ symbol: sym, flipped: false, matched: false }));
}

function renderCard(cardEl, card) {
  cardEl.textContent = (card.flipped || card.matched) ? card.symbol : '';
  cardEl.classList.toggle('flipped', card.flipped);
  cardEl.classList.toggle('matched', card.matched);
}

function renderAll(cardEls, statusEl) {
  cards.forEach((c, i) => renderCard(cardEls[i], c));
  if (matchedCount === SYMBOLS.length) {
    statusEl.textContent = 'You matched them all!';
  } else {
    statusEl.textContent = `Matches: ${matchedCount} / ${SYMBOLS.length}`;
  }
}

function reset(cardEls, statusEl) {
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  cards = buildCards();
  flippedIndices = [];
  matchedCount = 0;
  renderAll(cardEls, statusEl);
}

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.innerHTML = `
    <style>
      .mem-wrap { text-align: center; }
      .mem-status { font-size: 20px; margin-bottom: 16px; }
      .mem-grid { display: grid; grid-template-columns: repeat(4, 80px); gap: 8px; justify-content: center; }
      .mem-card {
        width: 80px; height: 80px;
        background: #4a4a6a; color: #eaeaea;
        font-size: 36px;
        border: none; border-radius: 6px; cursor: pointer;
        transition: background 0.15s;
      }
      .mem-card:hover:not(.flipped):not(.matched) { background: #5a5a7a; }
      .mem-card.flipped { background: #e94560; cursor: default; }
      .mem-card.matched { background: #2e8b57; cursor: default; }
      .mem-reset { margin-top: 16px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
    </style>
    <div class="mem-wrap">
      <div class="mem-status"></div>
      <div class="mem-grid">
        ${Array.from({length: 16}, (_,i) => `<button class="mem-card" data-i="${i}"></button>`).join('')}
      </div>
      <button class="mem-reset">Reset</button>
    </div>
  `;
  container.appendChild(rootEl);

  const statusEl = rootEl.querySelector('.mem-status');
  const cardEls = Array.from(rootEl.querySelectorAll('.mem-card'));
  const resetBtn = rootEl.querySelector('.mem-reset');

  reset(cardEls, statusEl);

  rootEl.addEventListener('click', (e) => {
    const cardBtn = e.target.closest('.mem-card');
    if (!cardBtn) return;
    if (lockTimer) return;
    const i = Number(cardBtn.dataset.i);
    const card = cards[i];
    if (card.flipped || card.matched) return;

    card.flipped = true;
    flippedIndices.push(i);
    renderCard(cardEls[i], card);

    if (flippedIndices.length === 2) {
      const [a, b] = flippedIndices;
      if (cards[a].symbol === cards[b].symbol) {
        cards[a].matched = true;
        cards[b].matched = true;
        matchedCount += 1;
        flippedIndices = [];
        renderAll(cardEls, statusEl);
      } else {
        lockTimer = setTimeout(() => {
          cards[a].flipped = false;
          cards[b].flipped = false;
          flippedIndices = [];
          lockTimer = null;
          renderAll(cardEls, statusEl);
        }, 800);
      }
    }
  });

  resetBtn.addEventListener('click', () => reset(cardEls, statusEl));
}

export function unmount() {
  if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
  if (rootEl) { rootEl.remove(); rootEl = null; }
  cards = [];
  flippedIndices = [];
  matchedCount = 0;
}
```

- [ ] **Step 2: Manual verification**

Reload, click Memory Match.

- 4×4 grid of dark blank cards; status shows "Matches: 0 / 8".
- Click a card → it shows an emoji and turns red.
- Click a second card:
  - If matching → both turn green ("matched") and stay revealed; counter goes up.
  - If not → both flip back face-down after ~0.8s; you can't click anything during that pause.
- Match all 8 pairs → status reads "You matched them all!".
- Reset → grid re-shuffles, counter back to 0/8.
- Click Back mid-game then re-enter → fresh shuffled board.

- [ ] **Step 3: Commit**

```bash
git add games/memory.js
git commit -m "Implement Memory Match game"
```

---

## Task 5: Snake (canvas, arrow keys, grid-based)

**Files:**
- Create: `games/snake.js`

- [ ] **Step 1: Create `games/snake.js`**

```js
const GRID = 20;       // 20x20 cells
const CELL = 20;       // 20px per cell -> 400x400 canvas
const TICK_MS = 120;   // movement interval

let rootEl = null;
let canvas = null;
let ctx = null;
let rafId = null;
let lastTick = 0;
let keyHandler = null;

let snake = [];
let direction = { x: 1, y: 0 };
let pendingDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let alive = true;

function placeFood() {
  while (true) {
    const fx = Math.floor(Math.random() * GRID);
    const fy = Math.floor(Math.random() * GRID);
    if (!snake.some(s => s.x === fx && s.y === fy)) {
      food = { x: fx, y: fy };
      return;
    }
  }
}

function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = { x: 1, y: 0 };
  pendingDirection = { x: 1, y: 0 };
  score = 0;
  alive = true;
  placeFood();
}

function step() {
  if (!alive) return;
  direction = pendingDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // wall collision
  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
    alive = false;
    return;
  }
  // self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    alive = false;
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    placeFood();
  } else {
    snake.pop();
  }
}

function draw(statusEl) {
  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, GRID*CELL, GRID*CELL);

  // food
  ctx.fillStyle = '#e94560';
  ctx.fillRect(food.x*CELL+2, food.y*CELL+2, CELL-4, CELL-4);

  // snake
  ctx.fillStyle = '#2e8b57';
  snake.forEach((s, i) => {
    if (i === 0) ctx.fillStyle = '#4caf50';
    ctx.fillRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2);
    ctx.fillStyle = '#2e8b57';
  });

  statusEl.textContent = alive
    ? `Score: ${score}`
    : `Game over — Score: ${score}. Press Space to restart.`;
}

function loop(ts, statusEl) {
  if (!lastTick) lastTick = ts;
  if (ts - lastTick >= TICK_MS) {
    step();
    lastTick = ts;
  }
  draw(statusEl);
  rafId = requestAnimationFrame((t) => loop(t, statusEl));
}

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.innerHTML = `
    <style>
      .snake-wrap { text-align: center; }
      .snake-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }
      .snake-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; }
      .snake-hint { font-size: 12px; color: #888; margin-top: 8px; }
    </style>
    <div class="snake-wrap">
      <div class="snake-status">Score: 0</div>
      <canvas class="snake-canvas" width="400" height="400"></canvas>
      <div class="snake-hint">Arrow keys to move</div>
    </div>
  `;
  container.appendChild(rootEl);

  canvas = rootEl.querySelector('.snake-canvas');
  ctx = canvas.getContext('2d');
  const statusEl = rootEl.querySelector('.snake-status');

  reset();
  lastTick = 0;

  keyHandler = (e) => {
    const k = e.key;
    if (k === 'ArrowUp'    && direction.y !==  1) pendingDirection = { x: 0, y: -1 };
    if (k === 'ArrowDown'  && direction.y !== -1) pendingDirection = { x: 0, y:  1 };
    if (k === 'ArrowLeft'  && direction.x !==  1) pendingDirection = { x: -1, y: 0 };
    if (k === 'ArrowRight' && direction.x !== -1) pendingDirection = { x:  1, y: 0 };
    if (k === ' ' && !alive) {
      reset();
      lastTick = 0;
    }
    if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
  };
  window.addEventListener('keydown', keyHandler);

  rafId = requestAnimationFrame((t) => loop(t, statusEl));
}

export function unmount() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (rootEl) { rootEl.remove(); rootEl = null; }
  canvas = null; ctx = null;
  snake = []; score = 0; alive = true;
}
```

- [ ] **Step 2: Manual verification**

Reload, click Snake.

- A 3-segment green snake appears mid-canvas moving right; a red food cell appears somewhere.
- Press arrow keys → snake changes direction smoothly. Trying to reverse direction does nothing (can't 180-flip into yourself).
- Eat food → snake grows by one segment; score increments; new food spawns elsewhere.
- Run into wall → status shows "Game over — Score: X. Press Space to restart."
- Run into yourself (curl into a loop) → same game-over message.
- Press Space → game restarts at score 0.
- Click Back → returns to menu. Re-enter Snake → fresh snake, no leftover state.
- Open DevTools Performance/Console: no errors, no runaway frames after going Back.

- [ ] **Step 3: Commit**

```bash
git add games/snake.js
git commit -m "Implement Snake game"
```

---

## Task 6: Pong (canvas, mouse or arrow keys, AI opponent)

**Files:**
- Create: `games/pong.js`

- [ ] **Step 1: Create `games/pong.js`**

```js
const W = 600, H = 400;
const PADDLE_W = 10, PADDLE_H = 80;
const BALL_R = 6;
const PADDLE_SPEED = 6;
const AI_SPEED = 4;
const WIN_SCORE = 7;

let rootEl = null;
let canvas = null;
let ctx = null;
let rafId = null;
let keyDownHandler = null;
let keyUpHandler = null;
let mouseHandler = null;

let leftY = 0, rightY = 0;
let ball = { x: 0, y: 0, vx: 0, vy: 0 };
let leftScore = 0, rightScore = 0;
let upPressed = false, downPressed = false;
let useMouse = false;
let mouseY = H / 2;
let gameOver = false;

function resetBall(direction) {
  ball.x = W / 2;
  ball.y = H / 2;
  const angle = (Math.random() - 0.5) * (Math.PI / 3); // ±30°
  const speed = 5;
  ball.vx = Math.cos(angle) * speed * direction;
  ball.vy = Math.sin(angle) * speed;
}

function reset() {
  leftY = H / 2 - PADDLE_H / 2;
  rightY = H / 2 - PADDLE_H / 2;
  leftScore = 0;
  rightScore = 0;
  gameOver = false;
  resetBall(Math.random() < 0.5 ? -1 : 1);
}

function step() {
  if (gameOver) return;

  // player input
  if (useMouse) {
    const target = mouseY - PADDLE_H / 2;
    leftY = Math.max(0, Math.min(H - PADDLE_H, target));
  } else {
    if (upPressed)   leftY = Math.max(0, leftY - PADDLE_SPEED);
    if (downPressed) leftY = Math.min(H - PADDLE_H, leftY + PADDLE_SPEED);
  }

  // AI: track ball center, capped speed
  const aiCenter = rightY + PADDLE_H / 2;
  if (ball.y < aiCenter - 8) rightY = Math.max(0, rightY - AI_SPEED);
  else if (ball.y > aiCenter + 8) rightY = Math.min(H - PADDLE_H, rightY + AI_SPEED);

  // ball
  ball.x += ball.vx;
  ball.y += ball.vy;

  // top/bottom bounce
  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; }
  if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy *= -1; }

  // left paddle collision
  if (ball.x - BALL_R < PADDLE_W && ball.y > leftY && ball.y < leftY + PADDLE_H && ball.vx < 0) {
    ball.x = PADDLE_W + BALL_R;
    ball.vx *= -1.05;
    const offset = (ball.y - (leftY + PADDLE_H / 2)) / (PADDLE_H / 2);
    ball.vy = offset * 5;
  }
  // right paddle collision
  if (ball.x + BALL_R > W - PADDLE_W && ball.y > rightY && ball.y < rightY + PADDLE_H && ball.vx > 0) {
    ball.x = W - PADDLE_W - BALL_R;
    ball.vx *= -1.05;
    const offset = (ball.y - (rightY + PADDLE_H / 2)) / (PADDLE_H / 2);
    ball.vy = offset * 5;
  }

  // scoring
  if (ball.x < 0) {
    rightScore += 1;
    if (rightScore >= WIN_SCORE) gameOver = true;
    else resetBall(1);
  } else if (ball.x > W) {
    leftScore += 1;
    if (leftScore >= WIN_SCORE) gameOver = true;
    else resetBall(-1);
  }
}

function draw(statusEl) {
  ctx.fillStyle = '#0f0f1e';
  ctx.fillRect(0, 0, W, H);

  // center dashed line
  ctx.strokeStyle = '#3a3a4e';
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // paddles
  ctx.fillStyle = '#eaeaea';
  ctx.fillRect(0, leftY, PADDLE_W, PADDLE_H);
  ctx.fillRect(W - PADDLE_W, rightY, PADDLE_W, PADDLE_H);

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // scores
  ctx.font = 'bold 32px system-ui';
  ctx.fillText(String(leftScore), W/2 - 50, 40);
  ctx.fillText(String(rightScore), W/2 + 30, 40);

  if (gameOver) {
    const winner = leftScore >= WIN_SCORE ? 'You win!' : 'AI wins!';
    statusEl.textContent = `${winner} Press Space to play again.`;
  } else {
    statusEl.textContent = `${leftScore} — ${rightScore}  (first to ${WIN_SCORE})`;
  }
}

function loop(statusEl) {
  step();
  draw(statusEl);
  rafId = requestAnimationFrame(() => loop(statusEl));
}

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.innerHTML = `
    <style>
      .pong-wrap { text-align: center; }
      .pong-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }
      .pong-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; cursor: none; }
      .pong-hint { font-size: 12px; color: #888; margin-top: 8px; }
    </style>
    <div class="pong-wrap">
      <div class="pong-status"></div>
      <canvas class="pong-canvas" width="${W}" height="${H}"></canvas>
      <div class="pong-hint">Mouse over canvas or ↑/↓ arrow keys</div>
    </div>
  `;
  container.appendChild(rootEl);

  canvas = rootEl.querySelector('.pong-canvas');
  ctx = canvas.getContext('2d');
  const statusEl = rootEl.querySelector('.pong-status');

  reset();

  keyDownHandler = (e) => {
    if (e.key === 'ArrowUp')   { upPressed = true; useMouse = false; e.preventDefault(); }
    if (e.key === 'ArrowDown') { downPressed = true; useMouse = false; e.preventDefault(); }
    if (e.key === ' ' && gameOver) { reset(); e.preventDefault(); }
  };
  keyUpHandler = (e) => {
    if (e.key === 'ArrowUp')   upPressed = false;
    if (e.key === 'ArrowDown') downPressed = false;
  };
  mouseHandler = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = (e.clientY - rect.top) * (H / rect.height);
    useMouse = true;
  };

  window.addEventListener('keydown', keyDownHandler);
  window.addEventListener('keyup', keyUpHandler);
  canvas.addEventListener('mousemove', mouseHandler);

  rafId = requestAnimationFrame(() => loop(statusEl));
}

export function unmount() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (keyDownHandler) { window.removeEventListener('keydown', keyDownHandler); keyDownHandler = null; }
  if (keyUpHandler)   { window.removeEventListener('keyup', keyUpHandler);     keyUpHandler = null; }
  if (mouseHandler && canvas) { canvas.removeEventListener('mousemove', mouseHandler); mouseHandler = null; }
  if (rootEl) { rootEl.remove(); rootEl = null; }
  canvas = null; ctx = null;
  upPressed = false; downPressed = false; useMouse = false;
  gameOver = false;
}
```

- [ ] **Step 2: Manual verification**

Reload, click Pong.

- 600×400 canvas with dashed center line, two white paddles, a ball serving at a random angle, scores `0   0` at the top.
- Move mouse over the canvas → left paddle follows mouse Y.
- Press ↑/↓ → left paddle moves with arrow keys; mouse stops controlling until you wiggle the mouse again.
- Ball bounces off top, bottom, and both paddles. Hitting the edge of a paddle imparts more vertical angle.
- AI paddle (right) tracks ball but is slower than the ball at full tilt — it can lose.
- When ball exits left edge → right score increments; when exits right → left score increments. Ball re-serves.
- First side to reach 7 → game over banner appears: "You win! Press Space..." or "AI wins! Press Space...". Ball stops.
- Press Space → 0–0 reset, ball serves again.
- Back → menu. Re-enter → fresh game, no lingering animation in console.

- [ ] **Step 3: Commit**

```bash
git add games/pong.js
git commit -m "Implement Pong game"
```

---

## Task 7: Flappy Bird (canvas, space/click to flap)

**Files:**
- Create: `games/flappy.js`

- [ ] **Step 1: Create `games/flappy.js`**

```js
const W = 480, H = 640;
const BIRD_X = 120;
const BIRD_R = 14;
const GRAVITY = 0.45;
const FLAP_V = -7.5;
const PIPE_W = 60;
const GAP_H = 150;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 90; // frames

let rootEl = null;
let canvas = null;
let ctx = null;
let rafId = null;
let keyHandler = null;
let clickHandler = null;

let birdY = 0, birdV = 0;
let pipes = [];
let frameCount = 0;
let score = 0;
let alive = true;

function reset() {
  birdY = H / 2;
  birdV = 0;
  pipes = [];
  frameCount = 0;
  score = 0;
  alive = true;
}

function spawnPipe() {
  const margin = 60;
  const gapY = margin + Math.random() * (H - 2 * margin - GAP_H);
  pipes.push({ x: W, gapY, passed: false });
}

function step() {
  if (!alive) return;

  birdV += GRAVITY;
  birdY += birdV;

  frameCount += 1;
  if (frameCount % PIPE_INTERVAL === 0) spawnPipe();

  for (const p of pipes) p.x -= PIPE_SPEED;
  pipes = pipes.filter(p => p.x + PIPE_W > 0);

  // collisions: ground/ceiling
  if (birdY + BIRD_R >= H || birdY - BIRD_R <= 0) {
    alive = false;
    return;
  }

  // collisions: pipes
  for (const p of pipes) {
    const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
    if (inX) {
      const inGap = birdY - BIRD_R > p.gapY && birdY + BIRD_R < p.gapY + GAP_H;
      if (!inGap) { alive = false; return; }
    }
    if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
      p.passed = true;
      score += 1;
    }
  }
}

function draw(statusEl) {
  // sky
  ctx.fillStyle = '#3aa9ff';
  ctx.fillRect(0, 0, W, H);

  // pipes
  ctx.fillStyle = '#2e8b57';
  for (const p of pipes) {
    ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
    ctx.fillRect(p.x, p.gapY + GAP_H, PIPE_W, H - (p.gapY + GAP_H));
  }

  // bird
  ctx.fillStyle = '#ffd54a';
  ctx.beginPath();
  ctx.arc(BIRD_X, birdY, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.stroke();

  // score
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.font = 'bold 36px system-ui';
  const text = String(score);
  ctx.strokeText(text, W/2 - 12, 60);
  ctx.fillText(text, W/2 - 12, 60);

  statusEl.textContent = alive
    ? `Score: ${score}`
    : `Game over — Score: ${score}. Press Space or click to restart.`;
}

function loop(statusEl) {
  step();
  draw(statusEl);
  rafId = requestAnimationFrame(() => loop(statusEl));
}

function flap() {
  if (alive) birdV = FLAP_V;
  else reset();
}

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.innerHTML = `
    <style>
      .flappy-wrap { text-align: center; }
      .flappy-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }
      .flappy-canvas { background: #3aa9ff; border: 2px solid #4a4a6a; border-radius: 4px; cursor: pointer; }
      .flappy-hint { font-size: 12px; color: #888; margin-top: 8px; }
    </style>
    <div class="flappy-wrap">
      <div class="flappy-status">Score: 0</div>
      <canvas class="flappy-canvas" width="${W}" height="${H}"></canvas>
      <div class="flappy-hint">Space or click to flap</div>
    </div>
  `;
  container.appendChild(rootEl);

  canvas = rootEl.querySelector('.flappy-canvas');
  ctx = canvas.getContext('2d');
  const statusEl = rootEl.querySelector('.flappy-status');

  reset();

  keyHandler = (e) => {
    if (e.key === ' ') { flap(); e.preventDefault(); }
  };
  clickHandler = () => flap();

  window.addEventListener('keydown', keyHandler);
  canvas.addEventListener('mousedown', clickHandler);

  rafId = requestAnimationFrame(() => loop(statusEl));
}

export function unmount() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (clickHandler && canvas) { canvas.removeEventListener('mousedown', clickHandler); clickHandler = null; }
  if (rootEl) { rootEl.remove(); rootEl = null; }
  canvas = null; ctx = null;
  pipes = []; score = 0; alive = true;
}
```

- [ ] **Step 2: Manual verification**

Reload, click Flappy Bird.

- 480×640 blue canvas; a yellow bird sits at x=120, starts falling.
- Press Space (or click the canvas) → bird jumps upward; immediately falls again.
- Green pipe pairs appear from the right with a vertical gap and scroll left.
- Pass through a gap → score increments by 1 (large white-with-black-outline number near the top).
- Touch a pipe, the top, or the bottom → game over banner appears; bird freezes; pipes stop.
- Press Space or click again → game resets at score 0.
- Back → menu. Re-enter Flappy → fresh start. No lingering animation; no errors in console.

- [ ] **Step 3: Commit**

```bash
git add games/flappy.js
git commit -m "Implement Flappy Bird game"
```

---

## Task 8: Final cross-game smoke test

Sanity check that the whole arcade works as one product, with no leakage between games.

**Files:** (no changes; verification only)

- [ ] **Step 1: Open `index.html` fresh**

Open in a clean browser tab (close the old one). Open DevTools console.

- [ ] **Step 2: Run the smoke checklist**

In order:

1. Click **Snake** → play 10 seconds, eat at least one food, then Back.
2. Click **Pong** → score one point either way, then Back.
3. Click **Tic-Tac-Toe** → play a full game to a win or draw, then Back.
4. Click **Memory Match** → flip 4 cards (one matching pair, one mismatch), then Back.
5. Click **Flappy Bird** → play until game over, then Back.
6. Click **Snake** again → confirm it starts fresh (snake length 3, score 0, no leftover frames).

Expected throughout:
- DevTools console: no red errors at any point.
- No game keeps animating after Back (watch the Performance tab if unsure; FPS should drop to idle when at the menu).
- No key bindings leak (e.g., pressing Space on the menu should do nothing).

- [ ] **Step 3: Commit a README pointing to the design + plan**

Create `README.md`:

```markdown
# Mini Games Arcade

Five vanilla-JS mini-games on one HTML page: Snake, Pong, Tic-Tac-Toe, Memory Match, Flappy Bird.

## Run

Open `index.html` in any modern desktop browser. No build, no server, no dependencies.

## Design

See [docs/superpowers/specs/2026-06-01-mini-games-design.md](docs/superpowers/specs/2026-06-01-mini-games-design.md).

## Implementation plan

See [docs/superpowers/plans/2026-06-01-mini-games.md](docs/superpowers/plans/2026-06-01-mini-games.md).
```

```bash
git add README.md
git commit -m "Add README"
```

---

## Done

All five games playable from one page, mount/unmount contract holds, no state leaks between games, no console errors.
