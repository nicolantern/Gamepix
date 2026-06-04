(function () {
  // ─── constants ───────────────────────────────────────────────────────────────
  const CANVAS_W = 480;
  const CANVAS_H = 560;

  const BRICK_COLS = 9;
  const BASE_BRICK_ROWS = 6;
  const MAX_BRICK_ROWS = 8;
  const BRICK_W = 46;
  const BRICK_H = 18;
  const BRICK_GAP = 4;
  const BRICK_OFFSET_X = 13; // left margin so grid is centred
  const BRICK_OFFSET_Y = 40; // top margin

  const ROW_COLORS  = ['#e94560','#ff8c42','#ffd23f','#4caf50','#37c6e9','#9b5de5'];
  const ROW_POINTS  = [60, 50, 40, 30, 20, 10];

  const PADDLE_W = 80;
  const PADDLE_H = 12;
  const PADDLE_Y = CANVAS_H - 40;
  const PADDLE_SPEED = 6; // px per frame when using arrow keys

  const BALL_R = 7;
  const BALL_SPEED_BASE = 4.5;
  const BALL_SPEED_FACTOR = 1.1; // multiplied per level

  const LIVES_START = 3;

  // ─── mutable state ───────────────────────────────────────────────────────────
  let rootEl = null;
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let keyHandler = null;
  let keyUpHandler = null;
  let pointerMoveHandler = null;
  let pointerDownHandler = null;
  let touchMoveHandler = null;
  let touchStartHandler = null;
  let controlsHandle = null;

  let paddleX = 0;
  let ballX = 0;
  let ballY = 0;
  let ballVX = 0;
  let ballVY = 0;
  let ballOnPaddle = true;

  let score = 0;
  let lives = LIVES_START;
  let level = 1;
  let bricks = [];
  let brickRows = BASE_BRICK_ROWS;
  let gameOver = false;

  // directional flags for held arrow keys
  let moveLeftHeld = false;
  let moveRightHeld = false;

  // ─── helpers ─────────────────────────────────────────────────────────────────
  function buildBricks(rows) {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      const colorIdx = r % ROW_COLORS.length;
      const pointIdx = r % ROW_POINTS.length;
      for (let c = 0; c < BRICK_COLS; c++) {
        arr.push({
          x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_GAP),
          y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_GAP),
          color: ROW_COLORS[colorIdx],
          points: ROW_POINTS[pointIdx],
          alive: true
        });
      }
    }
    return arr;
  }

  function serveBall() {
    ballX = paddleX + PADDLE_W / 2;
    ballY = PADDLE_Y - BALL_R;
    ballVX = 0;
    ballVY = 0;
    ballOnPaddle = true;
  }

  function startLevel() {
    bricks = buildBricks(brickRows);
    paddleX = CANVAS_W / 2 - PADDLE_W / 2;
    serveBall();
  }

  function reset() {
    score = 0;
    lives = LIVES_START;
    level = 1;
    brickRows = BASE_BRICK_ROWS;
    gameOver = false;
    startLevel();
  }

  // ─── launch ──────────────────────────────────────────────────────────────────
  function launch() {
    if (gameOver) {
      reset();
      return;
    }
    if (!ballOnPaddle) return;
    ballOnPaddle = false;
    const speed = BALL_SPEED_BASE * Math.pow(BALL_SPEED_FACTOR, level - 1);
    ballVX = (Math.random() * 1.0 - 0.5) * speed; // slight random initial angle
    ballVY = -speed;
    // normalise so total speed is exact
    const mag = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    ballVX = (ballVX / mag) * speed;
    ballVY = (ballVY / mag) * speed;
  }

  // ─── paddle movement helpers (used by keyboard + touch controls) ──────────────
  function moveLeft() {
    paddleX = Math.max(0, paddleX - PADDLE_SPEED);
    if (ballOnPaddle) ballX = paddleX + PADDLE_W / 2;
  }

  function moveRight() {
    paddleX = Math.min(CANVAS_W - PADDLE_W, paddleX + PADDLE_SPEED);
    if (ballOnPaddle) ballX = paddleX + PADDLE_W / 2;
  }

  // ─── update ──────────────────────────────────────────────────────────────────
  function update() {
    if (gameOver) return;

    // held arrow-key movement
    if (moveLeftHeld)  moveLeft();
    if (moveRightHeld) moveRight();

    if (ballOnPaddle) return;

    // move ball
    ballX += ballVX;
    ballY += ballVY;

    // wall bounces
    if (ballX - BALL_R < 0) {
      ballX = BALL_R;
      ballVX = Math.abs(ballVX);
    }
    if (ballX + BALL_R > CANVAS_W) {
      ballX = CANVAS_W - BALL_R;
      ballVX = -Math.abs(ballVX);
    }
    if (ballY - BALL_R < 0) {
      ballY = BALL_R;
      ballVY = Math.abs(ballVY);
    }

    // paddle collision
    if (
      ballVY > 0 &&
      ballY + BALL_R >= PADDLE_Y &&
      ballY + BALL_R <= PADDLE_Y + PADDLE_H + Math.abs(ballVY) &&
      ballX >= paddleX - BALL_R &&
      ballX <= paddleX + PADDLE_W + BALL_R
    ) {
      // clamp ball on top of paddle
      ballY = PADDLE_Y - BALL_R;

      // angle based on hit position relative to paddle centre
      const hitOffset = (ballX - (paddleX + PADDLE_W / 2)) / (PADDLE_W / 2); // -1..1
      const maxAngle = Math.PI * 0.38; // ~68° max from vertical
      const angle = hitOffset * maxAngle;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      ballVX = Math.sin(angle) * speed;
      ballVY = -Math.cos(angle) * speed;
    }

    // ball lost below paddle
    if (ballY - BALL_R > CANVAS_H) {
      lives -= 1;
      if (lives <= 0) {
        gameOver = true; if (window.MiniGames.scores) window.MiniGames.scores.submit('breakout', score);
      } else {
        serveBall();
      }
      return;
    }

    // brick collision
    for (let i = 0; i < bricks.length; i++) {
      const b = bricks[i];
      if (!b.alive) continue;

      // AABB overlap test
      const bLeft   = b.x;
      const bRight  = b.x + BRICK_W;
      const bTop    = b.y;
      const bBottom = b.y + BRICK_H;

      const overlapX = ballX + BALL_R > bLeft && ballX - BALL_R < bRight;
      const overlapY = ballY + BALL_R > bTop  && ballY - BALL_R < bBottom;

      if (!overlapX || !overlapY) continue;

      // determine which axis to invert based on penetration depth
      const dLeft   = (ballX + BALL_R) - bLeft;
      const dRight  = bRight - (ballX - BALL_R);
      const dTop    = (ballY + BALL_R) - bTop;
      const dBottom = bBottom - (ballY - BALL_R);

      const minX = Math.min(dLeft, dRight);
      const minY = Math.min(dTop, dBottom);

      if (minX < minY) {
        ballVX = -ballVX;
        // push out of brick horizontally
        if (dLeft < dRight) ballX = bLeft - BALL_R;
        else                 ballX = bRight + BALL_R;
      } else {
        ballVY = -ballVY;
        if (dTop < dBottom) ballY = bTop - BALL_R;
        else                 ballY = bBottom + BALL_R;
      }

      b.alive = false;
      score += b.points;
      break; // one brick per frame is enough to avoid tunnelling issues
    }

    // check level complete (all bricks cleared)
    if (bricks.every(b => !b.alive)) {
      level += 1;
      brickRows = Math.min(brickRows + 1, MAX_BRICK_ROWS);
      // launch() applies per-level speed scaling via BALL_SPEED_BASE * BALL_SPEED_FACTOR^(level-1)
      startLevel();
    }
  }

  // ─── draw ────────────────────────────────────────────────────────────────────
  function draw(statusEl) {
    // background
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // bricks
    bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
      // subtle highlight at top
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(b.x, b.y, BRICK_W, 3);
    });

    // paddle
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.roundRect(paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // ball
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ballX, ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // status
    if (gameOver) {
      statusEl.textContent = `Game over — Score: ${score}. Press Space to restart.`;
    } else {
      statusEl.textContent = `Score: ${score}   Lives: ${lives}   Level: ${level}`;
    }
  }

  // ─── loop ────────────────────────────────────────────────────────────────────
  function loop(statusEl) {
    update();
    draw(statusEl);
    rafId = requestAnimationFrame(() => loop(statusEl));
  }

  // ─── mount ───────────────────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .breakout-wrap { text-align: center; }
        .breakout-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }
        .breakout-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; max-width: 100%; }
        .breakout-hint { font-size: 12px; color: #888; margin-top: 8px; }
      </style>
      <div class="breakout-wrap">
        <div class="breakout-status">Score: 0   Lives: 3   Level: 1</div>
        <canvas class="breakout-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="breakout-hint">← → move · Space launch</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.breakout-canvas');
    ctx = canvas.getContext('2d');
    const statusEl = rootEl.querySelector('.breakout-status');

    reset();

    // ── keyboard ──────────────────────────────────────────────────────────────
    keyHandler = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft')  { moveLeftHeld  = true; moveLeft();  }
      if (k === 'ArrowRight') { moveRightHeld = true; moveRight(); }
      if (k === ' ') {
        if (gameOver) reset();
        else          launch();
      }
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') e.preventDefault();
    };
    keyUpHandler = (e) => {
      if (e.key === 'ArrowLeft')  moveLeftHeld  = false;
      if (e.key === 'ArrowRight') moveRightHeld = false;
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', keyUpHandler);

    // ── pointer (mouse + touch) drag on canvas ─────────────────────────────────
    pointerMoveHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      paddleX = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
      if (ballOnPaddle) ballX = paddleX + PADDLE_W / 2;
    };
    pointerDownHandler = (e) => {
      // move paddle immediately on click/tap so you don't need to drag
      pointerMoveHandler(e);
    };
    touchMoveHandler = (e) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      paddleX = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
      if (ballOnPaddle) ballX = paddleX + PADDLE_W / 2;
    };
    touchStartHandler = (e) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const x = (e.touches[0].clientX - rect.left) * scaleX;
      paddleX = Math.max(0, Math.min(CANVAS_W - PADDLE_W, x - PADDLE_W / 2));
      if (ballOnPaddle) ballX = paddleX + PADDLE_W / 2;
    };

    canvas.addEventListener('mousemove', pointerMoveHandler);
    canvas.addEventListener('mousedown', pointerDownHandler);
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });

    // ── touch button controls ─────────────────────────────────────────────────
    controlsHandle = window.MiniGames.controls.create(rootEl, {
      dpad: { left: moveLeft, right: moveRight },
      hold: true,
      buttons: [{ label: '⏶ Launch', action: launch }]
    });

    rafId = requestAnimationFrame(() => loop(statusEl));
  }

  // ─── unmount ─────────────────────────────────────────────────────────────────
  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

    if (keyHandler)   { window.removeEventListener('keydown', keyHandler);   keyHandler   = null; }
    if (keyUpHandler) { window.removeEventListener('keyup',   keyUpHandler); keyUpHandler = null; }

    if (canvas) {
      if (pointerMoveHandler)  canvas.removeEventListener('mousemove',   pointerMoveHandler);
      if (pointerDownHandler)  canvas.removeEventListener('mousedown',   pointerDownHandler);
      if (touchMoveHandler)    canvas.removeEventListener('touchmove',   touchMoveHandler);
      if (touchStartHandler)   canvas.removeEventListener('touchstart',  touchStartHandler);
    }
    pointerMoveHandler = null;
    pointerDownHandler = null;
    touchMoveHandler   = null;
    touchStartHandler  = null;

    if (controlsHandle) { controlsHandle.destroy(); controlsHandle = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }

    canvas = null;
    ctx = null;
    bricks = [];
    moveLeftHeld = false;
    moveRightHeld = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.breakout = { mount, unmount };
})();
