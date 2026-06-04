(function () {
  // ─── Constants ───────────────────────────────────────────────────────────────
  const W = 600, H = 200;
  const GROUND_Y = 160;          // y of ground line
  const DINO_X = 60;             // fixed horizontal position
  const DINO_W = 30, DINO_H = 40;
  const DINO_DUCK_H = 22;        // hitbox height while ducking
  const GRAVITY = 1800;          // px/s²
  const JUMP_VY = -640;          // initial jump velocity px/s
  const BASE_SPEED = 280;        // world scroll px/s at start
  const SPEED_RAMP = 18;         // px/s added per 500 score
  const DAY_NIGHT_INTERVAL = 700;// score interval to toggle palette

  // Minimum horizontal gap (px) before a new obstacle can appear.
  // At worst case speed (~600 px/s), dino needs ~0.38 s to jump → 228 px.
  // We use 260 px to give comfortable clearance.
  const MIN_GAP = 260;
  const MAX_GAP = 600;

  // Bird height variants (Y position of bird top edge, from canvas top).
  // HIGH bird: y=70 — can pass under without ducking (runs clear above dino head).
  // MID bird:  y=115 — forces a duck (at/just above standing dino head level).
  const BIRD_HIGH_Y = 70;
  const BIRD_MID_Y  = 115;   // dino head is at GROUND_Y-DINO_H=120, so MID forces duck

  // ─── State ───────────────────────────────────────────────────────────────────
  let rootEl = null;
  let canvas = null;
  let ctx    = null;
  let rafId  = null;
  let controlsHandle = null;
  let canvasClickHandler = null;

  // Key listeners stored by reference for clean removal
  let keydownHandler = null;
  let keyupHandler   = null;

  // Game state
  let dinoVY = 0;
  let dinoY  = GROUND_Y - DINO_H;   // top-left Y of dino
  let onGround = true;
  let ducking = false;

  // Touch duck: holds a timestamp; dino ducks until duckUntil passes.
  // Keyboard uses plain ducking flag (keydown/keyup) — see comment in update().
  let duckUntil = 0;

  let obstacles = [];     // { x, type, w, h, y }
  let nextObstacleX = 0; // canvas X where next obstacle spawns
  let speed = BASE_SPEED;
  let score = 0;
  let highScore = 0;
  let alive = true;
  let nightMode = false;
  let lastNightToggle = 0;
  let lastTime = 0;

  // ─── Colours ─────────────────────────────────────────────────────────────────
  function palette() {
    if (!nightMode) return {
      bg: '#0f0f1e', ground: '#4a4a6a', dino: '#4caf50',
      cactus: '#4caf50', bird: '#e94560', score: '#e0e0e0'
    };
    return {
      bg: '#d8d8c0', ground: '#6a6a4a', dino: '#2a5a2a',
      cactus: '#2a5a2a', bird: '#c0392b', score: '#1a1a2e'
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function groundY() { return GROUND_Y; }

  function dinoTop()    { return dinoY; }
  function dinoBottom() { return dinoY + (ducking ? DINO_DUCK_H : DINO_H); }
  function dinoRight()  { return DINO_X + DINO_W; }

  function scheduleNextObstacle() {
    const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    nextObstacleX = W + gap;
  }

  function spawnObstacle() {
    const type = Math.random() < 0.55 ? 'cactus' : 'bird';
    if (type === 'cactus') {
      // Vary cactus width: single (18px), double (34px), triple (50px)
      const variant = Math.floor(Math.random() * 3);
      const w = [18, 34, 50][variant];
      obstacles.push({ x: W, type: 'cactus', w, h: 40, y: GROUND_Y - 40 });
    } else {
      // Bird: randomly HIGH or MID
      const birdY = Math.random() < 0.5 ? BIRD_HIGH_Y : BIRD_MID_Y;
      obstacles.push({ x: W, type: 'bird', w: 34, h: 18, y: birdY });
    }
    scheduleNextObstacle();
  }

  function resetGame() {
    dinoVY    = 0;
    dinoY     = GROUND_Y - DINO_H;
    onGround  = true;
    ducking   = false;
    duckUntil = 0;
    obstacles = [];
    speed     = BASE_SPEED;
    score     = 0;
    nightMode = false;
    lastNightToggle = 0;
    alive     = true;
    lastTime  = 0;
    scheduleNextObstacle();
  }

  // ─── Input helpers ───────────────────────────────────────────────────────────
  function jump() {
    if (!alive) return;
    if (onGround) {
      dinoVY   = JUMP_VY;
      onGround = false;
      ducking  = false;
      duckUntil = 0;
    }
  }

  function duckStart() {
    // Touch path: refresh duckUntil timestamp. The update loop reads this.
    duckUntil = performance.now() + 150;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  function update(dt) {
    if (!alive) return;

    // Score & speed
    score += dt * 40;
    speed  = BASE_SPEED + Math.floor(score / 500) * SPEED_RAMP;

    // Day/night toggle
    if (score - lastNightToggle >= DAY_NIGHT_INTERVAL) {
      nightMode = !nightMode;
      lastNightToggle = score;
    }

    // Duck state:
    // - Keyboard: ducking flag is set directly by keydown/keyup (precise).
    // - Touch: duckUntil timestamp is refreshed by held button repeats (every 90ms).
    //   We treat ducking = true if either flag is set OR timestamp is in the future.
    const touchDucking = performance.now() < duckUntil;
    const effectiveDuck = ducking || touchDucking;

    // Dino physics
    if (!onGround) {
      dinoVY += GRAVITY * dt;
      dinoY  += dinoVY  * dt;
      const groundLevel = GROUND_Y - (effectiveDuck ? DINO_DUCK_H : DINO_H);
      if (dinoY >= groundLevel) {
        dinoY    = groundLevel;
        dinoVY   = 0;
        onGround = true;
      }
    } else {
      // Keep snapped to correct ground level (duck changes height)
      dinoY = GROUND_Y - (effectiveDuck ? DINO_DUCK_H : DINO_H);
    }

    // Spawn obstacles
    // nextObstacleX decreases as world scrolls; spawn when it drops to W
    nextObstacleX -= speed * dt;
    if (nextObstacleX <= W) {
      spawnObstacle();
    }

    // Scroll obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= speed * dt;
      if (obstacles[i].x + obstacles[i].w < 0) {
        obstacles.splice(i, 1);
      }
    }

    // Collision (AABB) — use effectiveDuck for hitbox
    const dH    = effectiveDuck ? DINO_DUCK_H : DINO_H;
    const dLeft = DINO_X + 4;
    const dRight= DINO_X + DINO_W - 4;
    const dTop  = dinoY + 4;
    const dBot  = dinoY + dH - 2;

    for (const obs of obstacles) {
      const oLeft  = obs.x + 2;
      const oRight = obs.x + obs.w - 2;
      const oTop   = obs.y + 2;
      const oBot   = obs.y + obs.h - 2;
      if (dRight > oLeft && dLeft < oRight && dBot > oTop && dTop < oBot) {
        alive = false;
        if (score > highScore) highScore = score;
        if (window.MiniGames.scores) window.MiniGames.scores.submit('dino', score);
        return;
      }
    }
  }

  // ─── Draw ────────────────────────────────────────────────────────────────────
  function draw(statusEl) {
    const c = palette();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);

    // Ground line
    ctx.strokeStyle = c.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(W, GROUND_Y);
    ctx.stroke();

    // Dino
    const touchDucking = performance.now() < duckUntil;
    const effectiveDuck = ducking || touchDucking;
    const dh = effectiveDuck ? DINO_DUCK_H : DINO_H;
    ctx.fillStyle = c.dino;

    if (effectiveDuck) {
      // Low crouching rect
      ctx.fillRect(DINO_X, dinoY, DINO_W + 10, dh);
      // Eye
      ctx.fillStyle = c.bg;
      ctx.fillRect(DINO_X + DINO_W, dinoY + 4, 5, 5);
    } else {
      // Body
      ctx.fillRect(DINO_X, dinoY + 10, DINO_W, dh - 10);
      // Head
      ctx.fillRect(DINO_X + 8, dinoY, DINO_W - 4, 16);
      // Eye
      ctx.fillStyle = c.bg;
      ctx.fillRect(DINO_X + 18, dinoY + 3, 5, 5);
      // Legs (animated by alternating on ground)
      if (onGround) {
        const legPhase = Math.floor(score / 8) % 2;
        ctx.fillStyle = c.dino;
        ctx.fillRect(DINO_X + 4,  dinoY + dh - 10, 8, 10);
        ctx.fillRect(DINO_X + 16, dinoY + dh - (legPhase ? 14 : 10), 8, legPhase ? 14 : 10);
      }
    }

    // Obstacles
    for (const obs of obstacles) {
      if (obs.type === 'cactus') {
        ctx.fillStyle = c.cactus;
        // Main stalk
        ctx.fillRect(obs.x + obs.w / 2 - 5, obs.y, 10, obs.h);
        // Arms (one or two based on width)
        if (obs.w >= 34) {
          ctx.fillRect(obs.x, obs.y + 8,  14, 8);
          ctx.fillRect(obs.x, obs.y,       6, 14);
        }
        if (obs.w >= 50) {
          ctx.fillRect(obs.x + obs.w - 14, obs.y + 10, 14, 8);
          ctx.fillRect(obs.x + obs.w - 6,  obs.y + 2,   6, 14);
        }
      } else {
        // Bird: two wing rects + body
        ctx.fillStyle = c.bird;
        ctx.fillRect(obs.x, obs.y + 6, obs.w, 8);   // body
        // Wings flap based on score
        const flap = Math.floor(score / 12) % 2;
        ctx.fillRect(obs.x + 8, obs.y + (flap ? 0 : 10), 18, 6);
      }
    }

    // Game-over overlay
    if (!alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText('Press Space / tap Jump to restart', W / 2, H / 2 + 18);
    }

    // Status line
    statusEl.textContent = alive
      ? `Score: ${Math.floor(score)}   Best: ${Math.floor(highScore)}`
      : `Score: ${Math.floor(score)}   Best: ${Math.floor(highScore)}  — Game Over`;
  }

  // ─── RAF loop ────────────────────────────────────────────────────────────────
  function loop(ts, statusEl) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = ts;

    update(dt);
    draw(statusEl);

    rafId = requestAnimationFrame((t) => loop(t, statusEl));
  }

  // ─── Mount ───────────────────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .dino-wrap   { text-align: center; }
        .dino-status { font-size: 18px; margin-bottom: 10px; min-height: 24px; }
        .dino-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; display: block; margin: 0 auto; }
        .dino-hint   { font-size: 12px; color: #888; margin-top: 8px; }
      </style>
      <div class="dino-wrap">
        <div class="dino-status">Score: 0</div>
        <canvas class="dino-canvas" width="${W}" height="${H}"></canvas>
        <div class="dino-hint">Space / &uarr; = Jump &nbsp;&nbsp; &darr; = Duck (hold)</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.dino-canvas');
    ctx    = canvas.getContext('2d');
    const statusEl = rootEl.querySelector('.dino-status');

    resetGame();

    // ── Keyboard listeners ──
    keydownHandler = (e) => {
      if (!rootEl) return;
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!alive) { resetGame(); }
        else        { jump(); }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        ducking = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
      }
    };
    keyupHandler = (e) => {
      if (e.key === 'ArrowDown') {
        ducking = false;
      }
    };
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup',   keyupHandler);

    // ── Canvas tap to jump ──
    canvasClickHandler = (e) => {
      e.preventDefault();
      if (!alive) { resetGame(); }
      else        { jump(); }
    };
    canvas.addEventListener('pointerdown', canvasClickHandler);

    // ── Touch controls ──
    controlsHandle = window.MiniGames.controls.create(rootEl.querySelector('.dino-wrap'), {
      buttons: [
        { label: 'Jump', action: function () {
            if (!alive) { resetGame(); }
            else        { jump(); }
          }
        },
        { label: 'Duck', action: duckStart, hold: true }
      ]
    });

    rafId = requestAnimationFrame((t) => loop(t, statusEl));
  }

  // ─── Unmount ─────────────────────────────────────────────────────────────────
  function unmount() {
    if (rafId)          { cancelAnimationFrame(rafId); rafId = null; }
    if (keydownHandler) { window.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    if (keyupHandler)   { window.removeEventListener('keyup',   keyupHandler);   keyupHandler   = null; }
    if (canvas && canvasClickHandler) {
      canvas.removeEventListener('pointerdown', canvasClickHandler);
      canvasClickHandler = null;
    }
    if (controlsHandle) { controlsHandle.destroy(); controlsHandle = null; }
    if (rootEl)         { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null;
    obstacles = [];
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.dino = { mount, unmount };
})();
