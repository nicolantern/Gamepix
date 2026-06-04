(function () {
  const GRID = 20;
  const CELL = 20;
  const TICK_MS = 120;

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

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      alive = false; if (window.MiniGames.scores) window.MiniGames.scores.submit('snake', score);
      return;
    }
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      alive = false; if (window.MiniGames.scores) window.MiniGames.scores.submit('snake', score);
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

    ctx.strokeStyle = '#1f1f3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID; i++) {
      ctx.moveTo(i*CELL, 0);
      ctx.lineTo(i*CELL, GRID*CELL);
      ctx.moveTo(0, i*CELL);
      ctx.lineTo(GRID*CELL, i*CELL);
    }
    ctx.stroke();

    ctx.fillStyle = '#e94560';
    ctx.fillRect(food.x*CELL+2, food.y*CELL+2, CELL-4, CELL-4);

    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#4caf50' : '#2e8b57';
      ctx.fillRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2);
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

  function mount(container) {
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

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null;
    snake = []; score = 0; alive = true;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.snake = { mount, unmount };
})();
