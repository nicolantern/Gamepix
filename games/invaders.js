(function () {
  // ─── Constants ──────────────────────────────────────────────────────────────
  const CW = 520;
  const CH = 600;

  const ROWS = 5;
  const COLS = 11;
  const INV_W = 30;
  const INV_H = 22;
  const INV_PAD_X = 14;  // horizontal gap between invaders
  const INV_PAD_Y = 18;  // vertical gap between invader rows
  const FORMATION_TOP_START = 60;
  const FORMATION_LEFT = 24;

  // Points by row (top to bottom)
  const ROW_POINTS = [30, 20, 20, 10, 10];

  // Player
  const PLAYER_W = 36;
  const PLAYER_H = 20;
  const PLAYER_Y_OFFSET = 50; // distance from bottom of canvas
  const PLAYER_SPEED = 220; // px/sec

  // Bullets
  const BULLET_W = 3;
  const BULLET_H = 12;
  const BULLET_SPEED = 420; // px/sec upward

  // Bombs
  const BOMB_W = 4;
  const BOMB_H = 10;
  const BOMB_SPEED_BASE = 130; // px/sec downward
  const BOMB_DROP_INTERVAL = 1200; // ms between attempts to drop a bomb
  const MAX_BOMBS = 4;

  // Bunkers
  const BUNKER_COUNT = 4;
  const BUNKER_BLOCK_W = 8;
  const BUNKER_BLOCK_H = 6;
  const BUNKER_COLS = 7;
  const BUNKER_ROWS_B = 4;
  const BUNKER_Y_OFFSET = 110; // from bottom of canvas

  // UFO
  const UFO_W = 42;
  const UFO_H = 18;
  const UFO_Y = 26;
  const UFO_SPEED = 140;
  const UFO_INTERVAL_MIN = 12000;
  const UFO_INTERVAL_MAX = 22000;
  const UFO_POINTS = [50, 100, 150, 300];

  // March step
  const MARCH_STEP_X = 6;   // px per horizontal step
  const MARCH_STEP_Y = 18;  // px per downward step
  const MARCH_BASE_INTERVAL = 700; // ms at full grid (55 invaders)
  const MARCH_MIN_INTERVAL = 60;   // ms at last invader

  // Lives
  const LIVES_START = 3;
  const RESPAWN_INVUL_MS = 2000;

  // ─── State ───────────────────────────────────────────────────────────────────
  let rootEl = null;
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let statusEl = null;

  // Listeners stored for cleanup
  let keydownHandler = null;
  let keyupHandler = null;
  let touchControls = null;

  // Held keys
  let leftHeld = false;
  let rightHeld = false;

  // Game state
  let gameOver = false;
  let gameOverMsg = '';
  let score = 0;
  let lives = LIVES_START;
  let wave = 1;

  // Player
  let playerX = 0;
  let playerAlive = true;
  let invulTimer = 0; // ms of remaining invulnerability after being hit

  // Player bullets — triple shot; each bullet: { x, y, vx, vy }
  let bullets = []; // array of active player bullets
  let bulletCooldown = 0; // ms remaining before next volley can fire

  // Invader formation
  let invaders = []; // [row][col] = { alive, x, y }
  let formationDx = 1; // +1 right, -1 left
  let marchTimer = 0;  // ms accumulator

  // Bombs
  let bombs = [];      // [{ x, y }]
  let bombTimer = 0;

  // Bunkers
  let bunkers = [];    // each = { x, y, blocks: bool[BUNKER_ROWS_B][BUNKER_COLS] }

  // UFO
  let ufo = null;      // { x, y, dir } or null
  let ufoTimer = 0;    // ms until next UFO
  let ufoFlash = 0;    // flash timer after being shot

  // ─── Helper: invader count ───────────────────────────────────────────────────
  function livingCount() {
    let n = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (invaders[r][c].alive) n++;
    return n;
  }

  function marchInterval() {
    const n = livingCount();
    if (n <= 0) return MARCH_MIN_INTERVAL;
    const t = (ROWS * COLS - n) / (ROWS * COLS - 1);
    return Math.max(MARCH_MIN_INTERVAL, MARCH_BASE_INTERVAL - t * (MARCH_BASE_INTERVAL - MARCH_MIN_INTERVAL));
  }

  // ─── Formation bounds (living invaders only) ─────────────────────────────────
  function formationBounds() {
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const inv = invaders[r][c];
        if (!inv.alive) continue;
        if (inv.x < minX) minX = inv.x;
        if (inv.x + INV_W > maxX) maxX = inv.x + INV_W;
        if (inv.y + INV_H > maxY) maxY = inv.y + INV_H;
      }
    }
    return { minX, maxX, maxY };
  }

  // ─── Build formation ─────────────────────────────────────────────────────────
  function buildFormation(startY) {
    invaders = [];
    for (let r = 0; r < ROWS; r++) {
      invaders[r] = [];
      for (let c = 0; c < COLS; c++) {
        invaders[r][c] = {
          alive: true,
          x: FORMATION_LEFT + c * (INV_W + INV_PAD_X),
          y: startY + r * (INV_H + INV_PAD_Y)
        };
      }
    }
    formationDx = 1;
    marchTimer = 0;
  }

  // ─── Build bunkers ───────────────────────────────────────────────────────────
  function buildBunkers() {
    bunkers = [];
    const totalBunkerW = BUNKER_COLS * BUNKER_BLOCK_W;
    const spacing = (CW - BUNKER_COUNT * totalBunkerW) / (BUNKER_COUNT + 1);
    const bunkerY = CH - BUNKER_Y_OFFSET;
    for (let i = 0; i < BUNKER_COUNT; i++) {
      const bx = spacing + i * (totalBunkerW + spacing);
      const blocks = [];
      for (let row = 0; row < BUNKER_ROWS_B; row++) {
        blocks[row] = [];
        for (let col = 0; col < BUNKER_COLS; col++) {
          // Arch cutout: bottom-center 2 blocks of bottom row
          const isBottomCenter = row === BUNKER_ROWS_B - 1 && (col === 2 || col === 3 || col === 4);
          const isBottomSemiCenter = row === BUNKER_ROWS_B - 2 && col === 3;
          blocks[row][col] = !(isBottomCenter || isBottomSemiCenter);
        }
      }
      bunkers.push({ x: bx, y: bunkerY, blocks });
    }
  }

  // ─── Reset / next wave ───────────────────────────────────────────────────────
  function reset() {
    score = 0;
    lives = LIVES_START;
    wave = 1;
    gameOver = false;
    gameOverMsg = '';
    playerX = CW / 2 - PLAYER_W / 2;
    playerAlive = true;
    invulTimer = 0;
    bullets = [];
    bulletCooldown = 0;
    bombs = [];
    bombTimer = BOMB_DROP_INTERVAL;
    ufo = null;
    ufoTimer = randomUfoInterval();
    ufoFlash = 0;
    buildFormation(FORMATION_TOP_START);
    buildBunkers();
    leftHeld = false;
    rightHeld = false;
  }

  function nextWave() {
    wave++;
    bullets = [];
    bulletCooldown = 0;
    bombs = [];
    bombTimer = BOMB_DROP_INTERVAL;
    ufo = null;
    ufoTimer = randomUfoInterval();
    // Start slightly lower each wave, capped
    const startY = Math.min(FORMATION_TOP_START + (wave - 1) * 15, 130);
    buildFormation(startY);
    // Keep bunkers partially eroded (don't rebuild)
  }

  function randomUfoInterval() {
    return UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN);
  }

  // ─── Fire ────────────────────────────────────────────────────────────────────
  // Fires a spread of 3 bullets simultaneously (triple shot).
  // Limited by a cooldown of 250 ms AND a max of 9 on-screen player bullets.
  const BULLET_VX_SPREAD = 120; // px/s horizontal offset for side bullets
  function fire() {
    if (gameOver || !playerAlive) return;
    if (bulletCooldown > 0) return;
    if (bullets.length >= 9) return; // cap: don't fire if too many on screen
    const nx = playerX + PLAYER_W / 2 - BULLET_W / 2;
    const ny = CH - PLAYER_Y_OFFSET - PLAYER_H - BULLET_H;
    // Centre bullet — straight up
    bullets.push({ x: nx, y: ny, vx: 0, vy: -BULLET_SPEED });
    // Left bullet — slight leftward drift
    bullets.push({ x: nx, y: ny, vx: -BULLET_VX_SPREAD, vy: -BULLET_SPEED });
    // Right bullet — slight rightward drift
    bullets.push({ x: nx, y: ny, vx:  BULLET_VX_SPREAD, vy: -BULLET_SPEED });
    bulletCooldown = 250; // 250 ms between volleys
  }

  // ─── Move left/right ─────────────────────────────────────────────────────────
  function moveLeft() { leftHeld = true; }
  function moveRight() { rightHeld = true; }

  // ─── Update player ───────────────────────────────────────────────────────────
  function updatePlayer(dt) {
    if (!playerAlive) {
      invulTimer -= dt * 1000;
      if (invulTimer <= 0) {
        playerAlive = true;
        invulTimer = 0;
      }
      return;
    }
    if (leftHeld)  playerX = Math.max(0, playerX - PLAYER_SPEED * dt);
    if (rightHeld) playerX = Math.min(CW - PLAYER_W, playerX + PLAYER_SPEED * dt);
    if (bulletCooldown > 0) bulletCooldown -= dt * 1000;
  }

  // ─── Update invaders (stepped march) ─────────────────────────────────────────
  function updateInvaders(dt) {
    marchTimer += dt * 1000;
    const interval = marchInterval();
    if (marchTimer < interval) return;
    marchTimer -= interval;

    const { minX, maxX } = formationBounds();
    // Check if we need to step down + reverse
    if (formationDx > 0 && maxX + MARCH_STEP_X >= CW) {
      // Step down and reverse
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          invaders[r][c].y += MARCH_STEP_Y;
      formationDx = -1;
    } else if (formationDx < 0 && minX - MARCH_STEP_X <= 0) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          invaders[r][c].y += MARCH_STEP_Y;
      formationDx = 1;
    } else {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          invaders[r][c].x += MARCH_STEP_X * formationDx;
    }

    // Check if any invader reached the player row
    const playerRow = CH - PLAYER_Y_OFFSET - PLAYER_H;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const inv = invaders[r][c];
        if (inv.alive && inv.y + INV_H >= playerRow) {
          triggerGameOver('Invaders reached Earth!');
          return;
        }
      }
    }
  }

  // ─── Update bullets ──────────────────────────────────────────────────────────
  function updateBullet(dt) {
    // Move all bullets using their individual vx/vy; cull any that leave the top
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt; // vy is negative (upward)
      if (b.y + BULLET_H < 0) {
        bullets.splice(i, 1);
      }
    }
  }

  // ─── Update bombs ────────────────────────────────────────────────────────────
  function updateBombs(dt) {
    bombTimer -= dt * 1000;

    // Move existing bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      bombs[i].y += BOMB_SPEED_BASE * dt;
      if (bombs[i].y > CH) {
        bombs.splice(i, 1);
      }
    }

    // Try to drop a new bomb
    if (bombTimer <= 0) {
      bombTimer = BOMB_DROP_INTERVAL;
      if (bombs.length < MAX_BOMBS) {
        dropBomb();
      }
    }
  }

  function dropBomb() {
    // Find all columns that have at least one living invader;
    // pick the bottom-most invader in a random non-empty column
    const cols = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = ROWS - 1; r >= 0; r--) {
        if (invaders[r][c].alive) {
          cols.push({ c, r });
          break;
        }
      }
    }
    if (cols.length === 0) return;
    const pick = cols[Math.floor(Math.random() * cols.length)];
    const inv = invaders[pick.r][pick.c];
    bombs.push({
      x: inv.x + INV_W / 2 - BOMB_W / 2,
      y: inv.y + INV_H
    });
  }

  // ─── Update UFO ──────────────────────────────────────────────────────────────
  function updateUFO(dt) {
    if (ufoFlash > 0) ufoFlash -= dt * 1000;

    if (ufo) {
      ufo.x += UFO_SPEED * ufo.dir * dt;
      if (ufo.dir > 0 && ufo.x > CW + UFO_W) ufo = null;
      if (ufo.dir < 0 && ufo.x + UFO_W < 0) ufo = null;
      if (!ufo) ufoTimer = randomUfoInterval();
    } else {
      ufoTimer -= dt * 1000;
      if (ufoTimer <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        ufo = {
          x: dir > 0 ? -UFO_W : CW,
          y: UFO_Y,
          dir
        };
      }
    }
  }

  // ─── AABB collision ──────────────────────────────────────────────────────────
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ─── Check collisions ────────────────────────────────────────────────────────
  function checkCollisions() {
    // Player bullets vs invaders — iterate backwards so splicing doesn't skip
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const blt = bullets[bi];
      let hit = false;
      outer:
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const inv = invaders[r][c];
          if (!inv.alive) continue;
          if (rectsOverlap(blt.x, blt.y, BULLET_W, BULLET_H,
                           inv.x, inv.y, INV_W, INV_H)) {
            inv.alive = false;
            score += ROW_POINTS[r];
            bullets.splice(bi, 1);
            hit = true;
            // Check wave clear
            if (livingCount() === 0) nextWave();
            break outer;
          }
        }
      }
      if (hit) continue;

      // Player bullet vs UFO
      if (ufo && rectsOverlap(blt.x, blt.y, BULLET_W, BULLET_H,
                               ufo.x, ufo.y, UFO_W, UFO_H)) {
        const pts = UFO_POINTS[Math.floor(Math.random() * UFO_POINTS.length)];
        score += pts;
        ufoFlash = 800; // ms flash message
        ufo = null;
        ufoTimer = randomUfoInterval();
        bullets.splice(bi, 1);
        continue;
      }

      // Player bullet vs bunkers
      for (const bk of bunkers) {
        if (erodeBunker(bk, blt.x, blt.y, BULLET_W, BULLET_H)) {
          bullets.splice(bi, 1);
          break;
        }
      }
    }

    // Bombs vs bunkers
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      for (const bk of bunkers) {
        if (erodeBunker(bk, b.x, b.y, BOMB_W, BOMB_H)) {
          bombs.splice(i, 1);
          break;
        }
      }
    }

    // Bombs vs player
    if (playerAlive && invulTimer <= 0) {
      const py = CH - PLAYER_Y_OFFSET - PLAYER_H;
      for (let i = bombs.length - 1; i >= 0; i--) {
        const b = bombs[i];
        if (rectsOverlap(b.x, b.y, BOMB_W, BOMB_H,
                         playerX, py, PLAYER_W, PLAYER_H)) {
          bombs.splice(i, 1);
          hitPlayer();
          break;
        }
      }
    }
  }

  function hitPlayer() {
    lives--;
    if (lives <= 0) {
      triggerGameOver('Game Over');
    } else {
      playerAlive = false;
      invulTimer = RESPAWN_INVUL_MS;
    }
  }

  function triggerGameOver(msg) {
    gameOver = true;
    gameOverMsg = msg;
    bullets = [];
    bombs = [];
  }

  // Erode bunker at projectile position; return true if any block hit
  function erodeBunker(bk, px, py, pw, ph) {
    let hit = false;
    for (let row = 0; row < BUNKER_ROWS_B; row++) {
      for (let col = 0; col < BUNKER_COLS; col++) {
        if (!bk.blocks[row][col]) continue;
        const bx = bk.x + col * BUNKER_BLOCK_W;
        const by = bk.y + row * BUNKER_BLOCK_H;
        if (rectsOverlap(px, py, pw, ph, bx, by, BUNKER_BLOCK_W, BUNKER_BLOCK_H)) {
          // Remove hit block and some neighbors for chunky erosion
          bk.blocks[row][col] = false;
          if (row + 1 < BUNKER_ROWS_B && Math.random() < 0.6) bk.blocks[row + 1][col] = false;
          if (row - 1 >= 0 && Math.random() < 0.4) bk.blocks[row - 1][col] = false;
          if (col + 1 < BUNKER_COLS && Math.random() < 0.5) bk.blocks[row][col + 1] = false;
          if (col - 1 >= 0 && Math.random() < 0.5) bk.blocks[row][col - 1] = false;
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
    return hit;
  }

  // ─── Draw helpers ────────────────────────────────────────────────────────────

  // Draw an invader using simple pixel-block shapes, by row type
  function drawInvader(x, y, row) {
    ctx.save();
    ctx.translate(x, y);

    if (row === 0) {
      // Small: 30pts — squid-like
      ctx.fillStyle = '#e0e0ff';
      // body
      ctx.fillRect(8, 4, 14, 10);
      // head
      ctx.fillRect(10, 0, 10, 6);
      // eyes
      ctx.fillStyle = '#0f0f1e';
      ctx.fillRect(12, 2, 3, 3);
      ctx.fillRect(16, 2, 3, 3);
      // antennae
      ctx.fillStyle = '#e0e0ff';
      ctx.fillRect(10, 0, 2, 3);
      ctx.fillRect(18, 0, 2, 3);
      // legs
      ctx.fillRect(6, 12, 4, 4);
      ctx.fillRect(12, 12, 6, 4);
      ctx.fillRect(20, 12, 4, 4);
    } else if (row <= 2) {
      // Medium: 20pts — crab-like
      ctx.fillStyle = '#80ffcc';
      ctx.fillRect(4, 4, 22, 10);
      ctx.fillRect(8, 0, 14, 6);
      // claws
      ctx.fillRect(0, 6, 6, 6);
      ctx.fillRect(24, 6, 6, 6);
      // eyes
      ctx.fillStyle = '#0f0f1e';
      ctx.fillRect(10, 2, 3, 3);
      ctx.fillRect(17, 2, 3, 3);
      // underbody legs
      ctx.fillStyle = '#80ffcc';
      ctx.fillRect(5, 13, 4, 4);
      ctx.fillRect(13, 13, 4, 4);
      ctx.fillRect(21, 13, 4, 4);
    } else {
      // Large: 10pts — octopus-like
      ctx.fillStyle = '#ffaa44';
      ctx.fillRect(2, 4, 26, 12);
      ctx.fillRect(6, 0, 18, 6);
      // big eyes
      ctx.fillStyle = '#0f0f1e';
      ctx.fillRect(8, 2, 4, 4);
      ctx.fillRect(18, 2, 4, 4);
      // tentacle legs
      ctx.fillStyle = '#ffaa44';
      ctx.fillRect(2, 14, 4, 6);
      ctx.fillRect(8, 16, 4, 4);
      ctx.fillRect(14, 16, 4, 4);
      ctx.fillRect(20, 14, 4, 6);
      ctx.fillRect(26, 14, 4, 6);
    }
    ctx.restore();
  }

  function drawUFO(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#e94560';
    // Hull
    ctx.beginPath();
    ctx.ellipse(UFO_W / 2, UFO_H * 0.65, UFO_W / 2, UFO_H * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dome
    ctx.fillStyle = '#ff8ca0';
    ctx.beginPath();
    ctx.ellipse(UFO_W / 2, UFO_H * 0.4, UFO_W * 0.3, UFO_H * 0.35, 0, Math.PI, 0, true);
    ctx.fill();
    // Lights
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(10 + i * 11, UFO_H * 0.62, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer(alpha) {
    const py = CH - PLAYER_Y_OFFSET - PLAYER_H;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#4cffaa';
    // body
    ctx.fillRect(playerX, py + 6, PLAYER_W, PLAYER_H - 6);
    // turret
    ctx.fillRect(playerX + PLAYER_W / 2 - 4, py, 8, 10);
    ctx.restore();
  }

  // ─── Main draw ───────────────────────────────────────────────────────────────
  function draw(now) {
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CW, CH);

    // Stars (static seed-based)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let i = 0; i < 40; i++) {
      // pseudo-random but stable per frame using a fixed pattern
      const sx = ((i * 137 + 23) % CW);
      const sy = ((i * 251 + 71) % (CH - 40));
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Bunkers
    ctx.fillStyle = '#4cffaa';
    for (const bk of bunkers) {
      for (let row = 0; row < BUNKER_ROWS_B; row++) {
        for (let col = 0; col < BUNKER_COLS; col++) {
          if (bk.blocks[row][col]) {
            ctx.fillRect(
              bk.x + col * BUNKER_BLOCK_W,
              bk.y + row * BUNKER_BLOCK_H,
              BUNKER_BLOCK_W - 1, BUNKER_BLOCK_H - 1
            );
          }
        }
      }
    }

    // Invaders
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const inv = invaders[r][c];
        if (inv.alive) drawInvader(inv.x, inv.y, r);
      }
    }

    // UFO
    if (ufo) drawUFO(ufo.x, ufo.y);
    if (ufoFlash > 0) {
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('UFO!', CW / 2, UFO_Y + UFO_H + 14);
    }

    // Player
    if (playerAlive) {
      const blinking = invulTimer > 0;
      const visible = !blinking || (Math.floor(Date.now() / 150) % 2 === 0);
      if (visible) drawPlayer(1);
    } else if (invulTimer > 0) {
      // Show explosion-like effect briefly
      const py = CH - PLAYER_Y_OFFSET - PLAYER_H;
      ctx.fillStyle = '#e94560';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✦ ✦ ✦', playerX + PLAYER_W / 2, py + PLAYER_H / 2);
    }

    // Bullets (triple shot — draw all active player bullets)
    ctx.fillStyle = '#ffffff';
    for (const b of bullets) {
      ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
    }

    // Bombs
    ctx.fillStyle = '#ff4444';
    for (const b of bombs) {
      // Zig-zag bomb shape
      ctx.fillRect(b.x, b.y, BOMB_W, BOMB_H);
    }

    // Lives as small ship icons
    const py = CH - PLAYER_Y_OFFSET - PLAYER_H;
    ctx.fillStyle = '#4cffaa';
    for (let i = 0; i < lives; i++) {
      ctx.fillRect(8 + i * 22, CH - 22, 16, 10);
      ctx.fillRect(14 + i * 22, CH - 28, 4, 8);
    }

    // Game over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(15,15,30,0.75)';
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(gameOverMsg, CW / 2, CH / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px monospace';
      ctx.fillText(`Score: ${score}  Wave: ${wave}`, CW / 2, CH / 2 + 20);
      ctx.fillStyle = '#888';
      ctx.font = '14px monospace';
      ctx.fillText('Press Space or Enter to restart', CW / 2, CH / 2 + 50);
    }
  }

  // ─── Main loop ───────────────────────────────────────────────────────────────
  let lastTs = 0;

  function loop(ts) {
    const dt = Math.min((ts - lastTs) / 1000, 0.05); // cap at 50ms to avoid spiral
    lastTs = ts;

    if (!gameOver) {
      updatePlayer(dt);
      updateInvaders(dt);
      updateBullet(dt);
      updateBombs(dt);
      updateUFO(dt);
      checkCollisions();
    }

    draw(ts);

    // Update status line
    statusEl.textContent = gameOver
      ? `${gameOverMsg} — Score: ${score}`
      : `Score: ${score}  |  Lives: ${lives}  |  Wave: ${wave}`;

    rafId = requestAnimationFrame(loop);
  }

  // ─── Mount ───────────────────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .inv-wrap { text-align: center; }
        .inv-status { font-size: 18px; margin-bottom: 8px; min-height: 24px; }
        .inv-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; display: block; margin: 0 auto; }
        .inv-hint { font-size: 12px; color: #888; margin-top: 6px; }
      </style>
      <div class="inv-wrap">
        <div class="inv-status">Score: 0  |  Lives: 3  |  Wave: 1</div>
        <canvas class="inv-canvas" width="${CW}" height="${CH}"></canvas>
        <div class="inv-hint">Arrow keys to move · Space to fire</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.inv-canvas');
    ctx = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.inv-status');

    reset();
    lastTs = 0;

    // Keyboard handlers
    keydownHandler = function (e) {
      const k = e.key;
      if (k === 'ArrowLeft')  { leftHeld = true;  e.preventDefault(); }
      if (k === 'ArrowRight') { rightHeld = true; e.preventDefault(); }
      if (k === ' ')          { e.preventDefault(); if (gameOver) reset(); else fire(); }
      if (k === 'Enter')      { if (gameOver) reset(); }
    };
    keyupHandler = function (e) {
      const k = e.key;
      if (k === 'ArrowLeft')  leftHeld = false;
      if (k === 'ArrowRight') rightHeld = false;
    };
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup',   keyupHandler);

    // Touch controls
    if (window.MiniGames && window.MiniGames.controls) {
      touchControls = window.MiniGames.controls.create(rootEl.querySelector('.inv-wrap'), {
        dpad: {
          left:  function () { leftHeld = true;  },
          right: function () { rightHeld = true; }
        },
        hold: true,
        buttons: [
          { label: 'Fire', action: fire }
        ]
      });

      // Touch dpad release needs to clear held state — wire pointer-up on the dpad buttons
      // We attach touchend/mouseup to left/right buttons to clear held flags
      const dpadBtns = rootEl.querySelectorAll('.tc-left, .tc-right');
      dpadBtns.forEach(function (btn) {
        btn.addEventListener('touchend',  function () { leftHeld = false; rightHeld = false; });
        btn.addEventListener('mouseup',   function () { leftHeld = false; rightHeld = false; });
        btn.addEventListener('mouseleave',function () { leftHeld = false; rightHeld = false; });
      });
    }

    rafId = requestAnimationFrame(loop);
  }

  // ─── Unmount ─────────────────────────────────────────────────────────────────
  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keydownHandler) { window.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    if (keyupHandler)   { window.removeEventListener('keyup',   keyupHandler);   keyupHandler = null; }
    if (touchControls)  { touchControls.destroy(); touchControls = null; }
    if (rootEl)         { rootEl.remove(); rootEl = null; }
    // Clear state
    canvas = null; ctx = null; statusEl = null;
    invaders = []; bombs = []; bunkers = []; bullets = [];
    ufo = null;
    leftHeld = false; rightHeld = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.invaders = { mount, unmount };
})();
