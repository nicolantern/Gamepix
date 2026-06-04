(function () {
  // ── Pure helper ──────────────────────────────────────────────────────────────
  function wrap(value, max) {
    return ((value % max) + max) % max;
  }
  console.assert(wrap(-1,   100) === 99,  'wrap -1');
  console.assert(wrap(101,  100) === 1,   'wrap 101');
  console.assert(wrap(50,   100) === 50,  'wrap 50');
  console.assert(wrap(0,    100) === 0,   'wrap 0');
  console.assert(wrap(-250, 100) === 50,  'wrap -250');
  console.assert(wrap(300,  100) === 0,   'wrap 300');

  // ── Constants ────────────────────────────────────────────────────────────────
  const W = 600, H = 600;
  const SHIP_RADIUS       = 14;
  const BULLET_SPEED      = 420;   // px/s
  const BULLET_LIFE       = 1.1;   // seconds
  const MAX_BULLETS       = 5;
  const FIRE_COOLDOWN     = 0.18;  // seconds between shots
  const TURN_RATE         = 3.2;   // rad/s
  const THRUST_FORCE      = 220;   // px/s²
  const FRICTION          = 0.97;  // velocity multiplier per frame (applied as ^dt roughly)
  const INVULN_TIME       = 3.0;   // seconds after respawn
  const UFO_INTERVAL_MIN  = 18;    // seconds between UFO appearances
  const UFO_INTERVAL_MAX  = 30;
  const UFO_SHOOT_INTERVAL= 1.8;   // seconds between UFO shots
  const UFO_SPEED         = 110;   // px/s
  const UFO_RADIUS        = 20;
  const UFO_BULLET_SPEED  = 200;
  const UFO_BULLET_LIFE   = 2.0;

  const AST_SIZES = {
    large:  { r: 46, speed: 60,  score: 20,  children: 'medium', count: 2 },
    medium: { r: 24, speed: 100, score: 50,  children: 'small',  count: 2 },
    small:  { r: 11, speed: 155, score: 100, children: null,     count: 0 },
  };

  // ── Module state ─────────────────────────────────────────────────────────────
  let rootEl     = null;
  let canvas     = null;
  let ctx        = null;
  let rafId      = null;
  let statusEl   = null;
  let controls   = null;

  let keydownHandler = null;
  let keyupHandler   = null;

  const heldKeys = new Set();

  // game objects
  let ship        = null;
  let bullets     = [];
  let ufoB        = [];  // UFO bullets
  let asteroids   = [];
  let ufo         = null;

  let score       = 0;
  let lives       = 3;
  let wave        = 0;
  let gameOver    = false;
  let lastTs      = null;

  let fireCd      = 0;         // fire cooldown timer
  let ufoTimer    = 0;         // countdown until next UFO
  let ufoShootTimer = 0;

  // ── Ship shape ───────────────────────────────────────────────────────────────
  // Triangle points relative to centre, nose pointing right (angle=0)
  const SHIP_VERTS = [
    {x: 18,  y:  0 },
    {x: -11, y: -10},
    {x: -7,  y:  0 },
    {x: -11, y:  10},
  ];
  // flame verts (thrust indicator)
  const FLAME_VERTS = [
    {x: -7,  y: -5},
    {x:-18,  y:  0},
    {x: -7,  y:  5},
  ];

  // ── Asteroid polygon shapes (pre-generated offsets) ──────────────────────────
  function makeAsteroidShape(r) {
    const pts = 10 + Math.floor(Math.random() * 5);
    const verts = [];
    for (let i = 0; i < pts; i++) {
      const angle = (i / pts) * Math.PI * 2;
      const dist  = r * (0.65 + Math.random() * 0.55);
      verts.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }
    return verts;
  }

  // ── Factories ─────────────────────────────────────────────────────────────────
  function makeShip() {
    return {
      x: W / 2, y: H / 2,
      vx: 0,   vy: 0,
      angle: -Math.PI / 2,   // pointing up
      radius: SHIP_RADIUS,
      invuln: INVULN_TIME,
      thrusting: false,
    };
  }

  function makeAsteroid(size, x, y) {
    const cfg   = AST_SIZES[size];
    const angle = Math.random() * Math.PI * 2;
    const speed = cfg.speed * (0.6 + Math.random() * 0.8);
    return {
      x: x !== undefined ? x : Math.random() * W,
      y: y !== undefined ? y : Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: 0,
      spin: (Math.random() - 0.5) * 1.8,
      radius: cfg.r,
      size,
      shape: makeAsteroidShape(cfg.r),
    };
  }

  function makeBullet(fromUFO) {
    const s = fromUFO ? UFO_BULLET_SPEED : BULLET_SPEED;
    const a = fromUFO
      ? Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + (Math.random() - 0.5) * 0.4
      : ship.angle;
    const ox = fromUFO ? ufo.x : ship.x;
    const oy = fromUFO ? ufo.y : ship.y;
    return {
      x: ox + Math.cos(a) * (fromUFO ? UFO_RADIUS : SHIP_RADIUS),
      y: oy + Math.sin(a) * (fromUFO ? UFO_RADIUS : SHIP_RADIUS),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: fromUFO ? UFO_BULLET_LIFE : BULLET_LIFE,
      fromUFO,
      radius: 3,
    };
  }

  function makeUFO() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x    = side < 0 ? -UFO_RADIUS : W + UFO_RADIUS;
    return {
      x,
      y: H * (0.1 + Math.random() * 0.8),
      vx: UFO_SPEED * (side < 0 ? 1 : -1),
      vy: (Math.random() - 0.5) * UFO_SPEED * 0.6,
      radius: UFO_RADIUS,
      alive: true,
    };
  }

  // ── Spawn wave ────────────────────────────────────────────────────────────────
  function spawnWave() {
    wave++;
    asteroids = [];
    const count = 3 + wave;
    for (let i = 0; i < count; i++) {
      // Spawn away from ship centre
      let x, y;
      do {
        x = Math.random() * W;
        y = Math.random() * H;
      } while (dist(x, y, ship.x, ship.y) < 130);
      asteroids.push(makeAsteroid('large', x, y));
    }
    ufoTimer = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function reset() {
    score     = 0;
    lives     = 3;
    wave      = 0;
    gameOver  = false;
    lastTs    = null;
    fireCd    = 0;
    bullets   = [];
    ufoB      = [];
    ufo       = null;
    ufoTimer  = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
    ship      = makeShip();
    heldKeys.clear();
    spawnWave();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function dist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fire() {
    if (gameOver || !ship || fireCd > 0) return;
    if (bullets.filter(b => !b.fromUFO).length >= MAX_BULLETS) return;
    bullets.push(makeBullet(false));
    fireCd = FIRE_COOLDOWN;
  }

  function hyperspace() {
    if (gameOver || !ship) return;
    ship.x = Math.random() * W;
    ship.y = Math.random() * H;
    ship.vx = 0;
    ship.vy = 0;
    ship.invuln = INVULN_TIME * 0.5;
  }

  // ── Per-frame tick helpers for touch hold buttons ────────────────────────────
  // These are called ~every 90ms by the controls helper when a button is held.
  function rotLeftTick()  { if (ship) ship.angle -= TURN_RATE * 0.09; }
  function rotRightTick() { if (ship) ship.angle += TURN_RATE * 0.09; }
  function thrustTick()   {
    if (!ship) return;
    ship.vx += Math.cos(ship.angle) * THRUST_FORCE * 0.09;
    ship.vy += Math.sin(ship.angle) * THRUST_FORCE * 0.09;
  }

  // ── Split asteroid ────────────────────────────────────────────────────────────
  function splitAsteroid(ast) {
    const cfg = AST_SIZES[ast.size];
    if (cfg.children) {
      for (let i = 0; i < cfg.count; i++) {
        asteroids.push(makeAsteroid(cfg.children, ast.x, ast.y));
      }
    }
    score += cfg.score;
  }

  // ── Update functions ──────────────────────────────────────────────────────────
  function updateShip(dt) {
    if (!ship) return;

    const turning = heldKeys.has('ArrowLeft') || heldKeys.has('ArrowRight')
                  || heldKeys.has('a') || heldKeys.has('d');

    if (heldKeys.has('ArrowLeft')  || heldKeys.has('a')) ship.angle -= TURN_RATE * dt;
    if (heldKeys.has('ArrowRight') || heldKeys.has('d')) ship.angle += TURN_RATE * dt;

    ship.thrusting = heldKeys.has('ArrowUp') || heldKeys.has('w');
    if (ship.thrusting) {
      ship.vx += Math.cos(ship.angle) * THRUST_FORCE * dt;
      ship.vy += Math.sin(ship.angle) * THRUST_FORCE * dt;
    }

    // Friction (exponential decay)
    const fric = Math.pow(FRICTION, dt * 60);
    ship.vx *= fric;
    ship.vy *= fric;

    ship.x = wrap(ship.x + ship.vx * dt, W);
    ship.y = wrap(ship.y + ship.vy * dt, H);

    if (ship.invuln > 0) ship.invuln -= dt;
  }

  function updateBullets(dt) {
    fireCd = Math.max(0, fireCd - dt);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x = wrap(b.x + b.vx * dt, W);
      b.y = wrap(b.y + b.vy * dt, H);
      b.life -= dt;
      if (b.life <= 0) bullets.splice(i, 1);
    }
  }

  function updateAsteroids(dt) {
    for (const a of asteroids) {
      a.x = wrap(a.x + a.vx * dt, W);
      a.y = wrap(a.y + a.vy * dt, H);
      a.angle += a.spin * dt;
    }
  }

  function updateUFO(dt) {
    if (!ufo) {
      ufoTimer -= dt;
      if (ufoTimer <= 0 && asteroids.length > 0) {
        ufo = makeUFO();
        ufoShootTimer = UFO_SHOOT_INTERVAL;
      }
      return;
    }
    // Move UFO — bounce vertically within screen
    ufo.x += ufo.vx * dt;
    ufo.y += ufo.vy * dt;

    if (ufo.y < UFO_RADIUS)       { ufo.y = UFO_RADIUS;      ufo.vy = Math.abs(ufo.vy); }
    if (ufo.y > H - UFO_RADIUS)   { ufo.y = H - UFO_RADIUS;  ufo.vy = -Math.abs(ufo.vy); }

    // UFO shoots at ship
    ufoShootTimer -= dt;
    if (ufoShootTimer <= 0 && ship) {
      bullets.push(makeBullet(true));
      ufoShootTimer = UFO_SHOOT_INTERVAL;
    }

    // UFO exits screen
    if (ufo.x < -UFO_RADIUS * 3 || ufo.x > W + UFO_RADIUS * 3) {
      ufo = null;
      ufoTimer = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
    }
  }

  function killShip() {
    lives--;
    if (lives <= 0) {
      gameOver = true; if (window.MiniGames.scores) window.MiniGames.scores.submit('asteroids', score);
      ship = null;
    } else {
      ship = makeShip();
    }
    bullets = bullets.filter(b => !b.fromUFO); // clear UFO bullets on respawn
  }

  function checkCollisions() {
    if (!ship) return;

    // Player bullets vs asteroids
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (b.fromUFO) continue;
      for (let ai = asteroids.length - 1; ai >= 0; ai--) {
        const a = asteroids[ai];
        if (dist(b.x, b.y, a.x, a.y) < b.radius + a.radius) {
          splitAsteroid(a);
          asteroids.splice(ai, 1);
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // Player bullets vs UFO
    if (ufo) {
      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (b.fromUFO) continue;
        if (dist(b.x, b.y, ufo.x, ufo.y) < b.radius + ufo.radius) {
          score += 200;
          bullets.splice(bi, 1);
          ufo = null;
          ufoTimer = UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
          break;
        }
      }
    }

    if (ship.invuln > 0) return;  // invulnerable — no ship collisions

    // Ship vs asteroids
    for (let ai = asteroids.length - 1; ai >= 0; ai--) {
      const a = asteroids[ai];
      if (dist(ship.x, ship.y, a.x, a.y) < ship.radius + a.radius) {
        killShip();
        return;
      }
    }

    // UFO bullets vs ship
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (!b.fromUFO) continue;
      if (dist(b.x, b.y, ship.x, ship.y) < b.radius + ship.radius) {
        bullets.splice(bi, 1);
        killShip();
        return;
      }
    }

    // UFO vs ship
    if (ufo && dist(ship.x, ship.y, ufo.x, ufo.y) < ship.radius + ufo.radius) {
      killShip();
    }
  }

  // ── Draw helpers ──────────────────────────────────────────────────────────────
  function drawPoly(verts, x, y, angle, strokeStyle, lineWidth) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.strokeStyle = strokeStyle || '#fff';
    ctx.lineWidth   = lineWidth   || 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawShip() {
    if (!ship) return;
    // Blink during invulnerability
    if (ship.invuln > 0 && Math.floor(ship.invuln * 8) % 2 === 0) return;

    drawPoly(SHIP_VERTS, ship.x, ship.y, ship.angle, '#fff', 2);

    if (ship.thrusting && Math.random() > 0.3) {
      drawPoly(FLAME_VERTS, ship.x, ship.y, ship.angle, '#e94560', 1.5);
    }
  }

  function drawAsteroids() {
    for (const a of asteroids) {
      drawPoly(a.shape, a.x, a.y, a.angle, '#aaa', 1.5);
    }
  }

  function drawBullets() {
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.fromUFO ? '#e94560' : '#fff';
      ctx.fill();
    }
  }

  function drawUFO() {
    if (!ufo) return;
    const { x, y } = ufo;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#4dd9ff';
    ctx.lineWidth   = 2;

    // Bottom ellipse
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Top dome
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 8, 0, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }

  function drawLives() {
    for (let i = 0; i < lives; i++) {
      ctx.save();
      ctx.translate(20 + i * 26, 25);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function draw() {
    ctx.fillStyle = '#05050f';
    ctx.fillRect(0, 0, W, H);

    drawAsteroids();
    drawBullets();
    drawShip();
    drawUFO();
    drawLives();

    // Wave indicator (top right)
    ctx.fillStyle   = '#555';
    ctx.font        = '12px monospace';
    ctx.textAlign   = 'right';
    ctx.fillText('WAVE ' + wave, W - 12, 20);
    ctx.textAlign   = 'left';

    if (gameOver) {
      ctx.fillStyle   = '#e94560';
      ctx.font        = 'bold 36px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
      ctx.fillStyle   = '#aaa';
      ctx.font        = '16px monospace';
      ctx.fillText('Press Space / Enter to restart', W / 2, H / 2 + 20);
      ctx.textAlign   = 'left';
    }

    statusEl.textContent = `Score: ${score}   Lives: ${lives}`;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────────
  function loop(ts) {
    if (lastTs === null) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05); // cap at 50ms
    lastTs = ts;

    if (!gameOver) {
      updateShip(dt);
      updateBullets(dt);
      updateAsteroids(dt);
      updateUFO(dt);
      checkCollisions();

      // Next wave?
      if (asteroids.length === 0 && !gameOver) {
        if (ship) ship.invuln = Math.max(ship.invuln, 1.5);
        spawnWave();
      }
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  // ── Mount / Unmount ───────────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .ast-wrap   { text-align: center; }
        .ast-status { font-size: 18px; margin-bottom: 8px; min-height: 24px; }
        .ast-canvas { background: #05050f; border: 2px solid #4a4a6a; border-radius: 4px; display: block; margin: 0 auto; }
        .ast-hint   { font-size: 12px; color: #888; margin-top: 8px; }
        .touch-controls       { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
        .touch-controls.hidden{ display: none; }
        .tc-btn { background: #1a1a2e; color: #fff; border: 1px solid #4a4a6a; border-radius: 6px;
                  padding: 10px 14px; font-size: 15px; cursor: pointer; user-select: none; touch-action: none; }
        .tc-btn:active { background: #e94560; }
      </style>
      <div class="ast-wrap">
        <div class="ast-status">Score: 0   Lives: 3</div>
        <canvas class="ast-canvas" width="600" height="600"></canvas>
        <div class="ast-hint">Arrow keys: rotate / thrust &nbsp;|&nbsp; Space: fire &nbsp;|&nbsp; Shift: hyperspace</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas   = rootEl.querySelector('.ast-canvas');
    ctx      = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.ast-status');

    reset();

    // ── Keyboard ───────────────────────────────────────────────────────────────
    keydownHandler = (e) => {
      const k = e.key;
      heldKeys.add(k);

      if (gameOver) {
        if (k === ' ' || k === 'Enter') { reset(); }
        if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();
        return;
      }

      if (k === ' ')      { fire();       e.preventDefault(); }
      if (k === 'Shift')  { hyperspace(); }
      if (k === 'h' || k === 'H') { hyperspace(); }
      if (k.startsWith('Arrow')) e.preventDefault();
    };

    keyupHandler = (e) => {
      heldKeys.delete(e.key);
    };

    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup',   keyupHandler);

    // ── Touch controls ─────────────────────────────────────────────────────────
    const astWrap = rootEl.querySelector('.ast-wrap');
    controls = window.MiniGames.controls.create(astWrap, {
      buttons: [
        { label: '◀',       action: rotLeftTick,  hold: true  },
        { label: '▶',       action: rotRightTick, hold: true  },
        { label: '▲ Thrust', action: thrustTick,   hold: true  },
        { label: 'Fire',    action: fire,          hold: false },
        { label: 'Jump',    action: hyperspace,    hold: false },
      ],
    });

    rafId = requestAnimationFrame(loop);
  }

  function unmount() {
    if (rafId)          { cancelAnimationFrame(rafId);                       rafId          = null; }
    if (keydownHandler) { window.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    if (keyupHandler)   { window.removeEventListener('keyup',   keyupHandler);   keyupHandler   = null; }
    if (controls)       { controls.destroy();                                controls       = null; }
    if (rootEl)         { rootEl.remove();                                   rootEl         = null; }

    // Clear all state
    canvas = null; ctx = null; statusEl = null;
    ship = null; bullets = []; ufoB = []; asteroids = []; ufo = null;
    heldKeys.clear();
    score = 0; lives = 3; wave = 0; gameOver = false; lastTs = null;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.asteroids = { mount, unmount };
})();
