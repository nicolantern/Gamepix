(function () {
  const W = 480, H = 640;
  const BIRD_X = 120;
  const BIRD_R = 14;
  const GRAVITY = 0.45;
  const FLAP_V = -7.5;
  const PIPE_W = 60;
  const GAP_H = 150;
  const PIPE_SPEED = 2.5;
  const PIPE_INTERVAL = 90;

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

    if (birdY + BIRD_R >= H || birdY - BIRD_R <= 0) {
      alive = false;
      return;
    }

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
    ctx.fillStyle = '#3aa9ff';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2e8b57';
    for (const p of pipes) {
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      ctx.fillRect(p.x, p.gapY + GAP_H, PIPE_W, H - (p.gapY + GAP_H));
    }

    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(BIRD_X, birdY, BIRD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();

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

  function mount(container) {
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

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (clickHandler && canvas) { canvas.removeEventListener('mousedown', clickHandler); clickHandler = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null;
    pipes = []; score = 0; alive = true;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.flappy = { mount, unmount };
})();
