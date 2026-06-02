(function () {
  // ─── Maze legend ───────────────────────────────────────────────────────────
  // '#' = wall
  // '.' = dot
  // 'o' = power pellet
  // ' ' = empty path (no dot)
  // '-' = ghost house door (ghosts only)
  // 'P' = Pac-Man start (treated as empty path)

  // Fully hand-crafted 28×31 faithful Pac-Man maze
  const MAZE_ROWS = [
    '############################',  // 0
    '#............##............#',  // 1
    '#.####.#####.##.#####.####.#',  // 2
    '#o####.#####.##.#####.####o#',  // 3
    '#.####.#####.##.#####.####.#',  // 4
    '#..........................#',  // 5
    '#.####.##.########.##.####.#',  // 6
    '#.####.##.########.##.####.#',  // 7
    '#......##....##....##......#',  // 8
    '######.#####.##.#####.######',  // 9
    '######.#####.##.#####.######',  // 10
    '######.##          ##.######',  // 11
    '######.## ###--### ##.######',  // 12
    '######.## #      # ##.######',  // 13
    '      .   #      #   .      ',  // 14  ← tunnel row
    '######.## #      # ##.######',  // 15
    '######.## ######## ##.######',  // 16
    '######.##          ##.######',  // 17
    '######.## ######## ##.######',  // 18
    '######.## ######## ##.######',  // 19
    '#............##............#',  // 20
    '#.####.#####.##.#####.####.#',  // 21
    '#o..##................##..o#',  // 22
    '###.##.##.########.##.##.###',  // 23
    '###.##.##.########.##.##.###',  // 24
    '#......##....##....##......#',  // 25
    '#.##########.##.##########.#',  // 26
    '#.##########.##.##########.#',  // 27
    '#............P.............#',  // 28  (P = pac start)
    '#.####.#####.##.#####.####.#',  // 29
    '############################',  // 30
  ];

  const COLS = 28;
  const ROWS = 31;
  const CELL = 16;               // px per tile
  const CANVAS_W = COLS * CELL;  // 448
  const CANVAS_H = ROWS * CELL;  // 496
  const TUNNEL_ROW = 14;         // row that wraps left ↔ right

  // Tile types
  const T_WALL  = 0;
  const T_DOT   = 1;
  const T_POWER = 2;
  const T_EMPTY = 3;
  const T_DOOR  = 4;

  // Directions
  const DIR_LEFT  = { x: -1, y:  0 };
  const DIR_RIGHT = { x:  1, y:  0 };
  const DIR_UP    = { x:  0, y: -1 };
  const DIR_DOWN  = { x:  0, y:  1 };
  const DIRS = [DIR_LEFT, DIR_RIGHT, DIR_UP, DIR_DOWN];

  // Ghost modes
  const MODE_SCATTER    = 'scatter';
  const MODE_CHASE      = 'chase';
  const MODE_FRIGHTENED = 'frightened';
  const MODE_EYES       = 'eyes';

  // Ghost house
  const HOUSE_CENTER_X = 13;
  const HOUSE_CENTER_Y = 14;

  // Pac-Man start
  const PAC_START_X = 13;
  const PAC_START_Y = 28;

  // Ghost definitions: start tile, scatter corner
  const GHOST_DEFS = [
    { tx: 13, ty: 11, name: 'blinky', color: '#FF0000', scatterX: 25, scatterY:  0, dotLimit:  0 },
    { tx: 11, ty: 13, name: 'pinky',  color: '#FFB8FF', scatterX:  2, scatterY:  0, dotLimit:  0 },
    { tx: 13, ty: 14, name: 'inky',   color: '#00FFFF', scatterX: 27, scatterY: 30, dotLimit: 30 },
    { tx: 15, ty: 14, name: 'clyde',  color: '#FFB852', scatterX:  0, scatterY: 30, dotLimit: 60 },
  ];

  // Mode schedule: alternating scatter/chase durations in seconds
  // Phase 0 = scatter (7s), phase 1 = chase (20s), …, last phase = indefinite chase
  const MODE_SCHEDULE_S = [7, 20, 7, 20, 5, 20, 5]; // last item reached → stay in chase

  // Speeds (px/s)
  const PAC_SPD_BASE    = 80;
  const GHOST_SPD_BASE  = 75;
  const GHOST_FRIGHT_SPD = 50;
  const GHOST_EYES_SPD  = 120;
  const TUNNEL_SPD_MUL  = 0.5;

  // Frightened config
  const FRIGHT_MS_BASE  = 8000;
  const FRIGHT_FLASH_MS = 2000;   // flash starts this many ms before end

  // Fruit
  const FRUIT_TILE_X   = 13;
  const FRUIT_TILE_Y   = 17;
  const FRUIT_DOT_1    = 70;
  const FRUIT_MS       = 9000;
  const FRUIT_PTS      = [100, 300, 500, 700, 1000, 2000, 3000, 5000];

  // ─── Module state ─────────────────────────────────────────────────────────
  let rootEl         = null;
  let canvas         = null;
  let ctx            = null;
  let rafId          = null;
  let keyHandler     = null;
  let controlsHandle = null;
  let swipeHandle    = null;
  let statusEl       = null;

  let grid       = [];
  let totalDots  = 0;
  let dotsEaten  = 0;

  let pac    = {};
  let ghosts = [];

  let score       = 0;
  let lives       = 3;
  let level       = 1;
  let gameOver    = false;
  let gameStarted = false;

  // Scatter/chase cycling
  let modeTimer    = 0;
  let modePhaseIdx = 0;
  let globalMode   = MODE_SCATTER;

  // Frightened
  let frightMs    = 0;
  let frightTotal = FRIGHT_MS_BASE;
  let eatCombo    = 0;

  // Fruit
  let fruitActive = false;
  let fruitMs     = 0;
  let fruitLevel  = 0;

  // Floating score popups
  let floatTexts = [];

  // Timing
  let lastTs     = 0;

  // Blink / mouth animation
  let blinkMs  = 0;
  let blinkOn  = true;
  let mouthAng = 0;   // 0..0.25 (× PI)
  let mouthDir = 1;

  // ─── Grid ─────────────────────────────────────────────────────────────────
  function buildGrid() {
    grid = [];
    totalDots = 0;
    dotsEaten = 0;
    for (let row = 0; row < ROWS; row++) {
      const s = MAZE_ROWS[row] || '';
      grid[row] = [];
      for (let col = 0; col < COLS; col++) {
        const ch = s[col] || '#';
        let t;
        switch (ch) {
          case '#': t = T_WALL;  break;
          case '.': t = T_DOT;   totalDots++; break;
          case 'o': t = T_POWER; totalDots++; break;
          case '-': t = T_DOOR;  break;
          default:  t = T_EMPTY; break;  // ' ', 'P', etc.
        }
        grid[row][col] = t;
      }
    }
  }

  function wrapX(tx) { return ((tx % COLS) + COLS) % COLS; }

  function tileAt(tx, ty) {
    if (ty < 0 || ty >= ROWS) return T_WALL;
    return grid[ty][wrapX(tx)];
  }

  // Can actor walk here? Only ghosts cross the door.
  function passable(tx, ty, isGhost) {
    const t = tileAt(tx, ty);
    if (t === T_WALL) return false;
    if (t === T_DOOR) return isGhost;
    return true;
  }

  // Pixel centre of a tile
  function tpx(tx, ty) { return { x: tx * CELL + CELL / 2, y: ty * CELL + CELL / 2 }; }

  function distSq(ax, ay, bx, by) { return (bx - ax) ** 2 + (by - ay) ** 2; }
  function dist(ax, ay, bx, by)   { return Math.sqrt(distSq(ax, ay, bx, by)); }

  // ─── Ghost AI ─────────────────────────────────────────────────────────────
  function targetFor(g) {
    if (g.mode === MODE_SCATTER)    return { tx: g.scatterX, ty: g.scatterY };
    if (g.mode === MODE_EYES)       return { tx: HOUSE_CENTER_X, ty: HOUSE_CENTER_Y };
    if (g.mode === MODE_FRIGHTENED) return { tx: Math.floor(Math.random() * COLS), ty: Math.floor(Math.random() * ROWS) };

    // CHASE targets — the four distinct personalities
    const pd = pac.dir;
    switch (g.name) {
      case 'blinky':
        // Direct pursuit: Pac-Man's tile
        return { tx: pac.tileX, ty: pac.tileY };

      case 'pinky': {
        // 4 tiles ahead of Pac-Man
        return { tx: pac.tileX + pd.x * 4, ty: pac.tileY + pd.y * 4 };
      }

      case 'inky': {
        // Pivot = 2 ahead of Pac; double vector from Blinky to pivot
        const blinky = ghosts[0];
        const pivX = pac.tileX + pd.x * 2;
        const pivY = pac.tileY + pd.y * 2;
        return { tx: 2 * pivX - blinky.tileX, ty: 2 * pivY - blinky.tileY };
      }

      case 'clyde': {
        // > 8 tiles away → chase like Blinky; ≤ 8 → retreat to scatter corner
        return dist(g.tileX, g.tileY, pac.tileX, pac.tileY) > 8
          ? { tx: pac.tileX, ty: pac.tileY }
          : { tx: g.scatterX, ty: g.scatterY };
      }

      default:
        return { tx: pac.tileX, ty: pac.tileY };
    }
  }

  function pickGhostDir(g) {
    const target  = targetFor(g);
    const oppDir  = { x: -g.dir.x, y: -g.dir.y };
    const isEyes  = g.mode === MODE_EYES;

    let bestDir   = null;
    let bestDSq   = Infinity;

    for (const d of DIRS) {
      if (!isEyes && d.x === oppDir.x && d.y === oppDir.y) continue; // no reversal
      const nx = g.tileX + d.x;
      const ny = g.tileY + d.y;
      if (!passable(wrapX(nx), ny, true)) continue;
      const dsq = distSq(nx, ny, target.tx, target.ty);
      if (dsq < bestDSq) { bestDSq = dsq; bestDir = d; }
    }

    return bestDir || oppDir; // fallback: reverse if trapped
  }

  // ─── Pac-Man direction ────────────────────────────────────────────────────
  function pickPacDir() {
    for (const d of [pac.nextDir, pac.dir]) {
      if (!d) continue;
      if (passable(wrapX(pac.tileX + d.x), pac.tileY + d.y, false)) return d;
    }
    return null;
  }

  // ─── Actor stepping ───────────────────────────────────────────────────────
  function stepActor(a, dtSec, speed, isGhost) {
    if (a.stuck) return;

    a.pixelProgress += speed * dtSec;

    while (a.pixelProgress >= CELL) {
      a.pixelProgress -= CELL;

      // Advance one tile
      let nx = a.tileX + a.dir.x;
      let ny = a.tileY + a.dir.y;
      if (a.tileY === TUNNEL_ROW) nx = wrapX(nx);
      a.tileX = nx;
      a.tileY = ny;

      // Pick direction for the next tile
      if (isGhost) {
        a.dir = pickGhostDir(a);
      } else {
        const chosen = pickPacDir();
        if (chosen) {
          a.dir = chosen;
          a.stuck = false;
        } else {
          a.stuck = true;
          a.pixelProgress = 0;
        }
      }
    }

    // Smooth pixel interpolation toward next tile
    const p  = a.pixelProgress / CELL;
    const c  = tpx(a.tileX, a.tileY);
    const nx = tpx(wrapX(a.tileX + a.dir.x), a.tileY + a.dir.y);
    a.px = c.x + (nx.x - c.x) * p;
    a.py = c.y + (nx.y - c.y) * p;

    // Wrap pixel X for tunnel
    if (a.px < 0)        a.px += CANVAS_W;
    if (a.px > CANVAS_W) a.px -= CANVAS_W;
  }

  // ─── Reset positions ──────────────────────────────────────────────────────
  function resetPositions() {
    const pc = tpx(PAC_START_X, PAC_START_Y);
    pac.tileX = PAC_START_X; pac.tileY = PAC_START_Y;
    pac.px = pc.x; pac.py = pc.y;
    pac.dir = DIR_LEFT; pac.nextDir = DIR_LEFT;
    pac.pixelProgress = 0; pac.stuck = false;

    ghosts.forEach((g, i) => {
      const def = GHOST_DEFS[i];
      const gc  = tpx(def.tx, def.ty);
      g.tileX = def.tx; g.tileY = def.ty;
      g.px = gc.x; g.py = gc.y;
      g.dir = DIR_LEFT;
      g.pixelProgress = 0;
      g.mode = MODE_SCATTER;
      g.stuck = false;
    });

    modeTimer    = 0;
    modePhaseIdx = 0;
    globalMode   = MODE_SCATTER;
    frightMs     = 0;
    eatCombo     = 0;
  }

  function initActors() {
    const pc = tpx(PAC_START_X, PAC_START_Y);
    pac = {
      tileX: PAC_START_X, tileY: PAC_START_Y,
      px: pc.x, py: pc.y,
      dir: DIR_LEFT, nextDir: DIR_LEFT,
      pixelProgress: 0, stuck: false,
    };

    ghosts = GHOST_DEFS.map((def) => {
      const gc = tpx(def.tx, def.ty);
      return {
        tileX: def.tx, tileY: def.ty,
        px: gc.x, py: gc.y,
        dir: DIR_LEFT,
        pixelProgress: 0,
        mode: MODE_SCATTER,
        name: def.name, color: def.color,
        scatterX: def.scatterX, scatterY: def.scatterY,
        dotLimit: def.dotLimit,
        stuck: false,
      };
    });
  }

  // ─── Power pellet / frightened ────────────────────────────────────────────
  function enterFrightened() {
    frightMs = frightTotal;
    eatCombo = 0;
    ghosts.forEach(g => {
      if (g.mode !== MODE_EYES) {
        g.mode = MODE_FRIGHTENED;
        g.dir  = { x: -g.dir.x, y: -g.dir.y };
      }
    });
  }

  // ─── Eating ───────────────────────────────────────────────────────────────
  function eatAt() {
    const ty = pac.tileY, tx = pac.tileX;
    const t = tileAt(tx, ty);
    if (t === T_DOT) {
      grid[ty][wrapX(tx)] = T_EMPTY;
      score += 10;
      dotsEaten++;
      checkFruit();
    } else if (t === T_POWER) {
      grid[ty][wrapX(tx)] = T_EMPTY;
      score += 50;
      dotsEaten++;
      enterFrightened();
      checkFruit();
    }
  }

  function checkFruit() {
    if (!fruitActive && dotsEaten >= FRUIT_DOT_1) {
      fruitActive = true;
      fruitMs     = FRUIT_MS;
    }
  }

  // ─── Mode cycling ─────────────────────────────────────────────────────────
  function updateModeCycle(dt) {
    if (modePhaseIdx >= MODE_SCHEDULE_S.length) return;
    modeTimer += dt;
    const dur = MODE_SCHEDULE_S[modePhaseIdx] * 1000;
    if (modeTimer >= dur) {
      modeTimer -= dur;
      modePhaseIdx++;
      globalMode = (modePhaseIdx % 2 === 0) ? MODE_SCATTER : MODE_CHASE;
      ghosts.forEach(g => {
        if (g.mode !== MODE_FRIGHTENED && g.mode !== MODE_EYES) {
          g.mode = globalMode;
          g.dir  = { x: -g.dir.x, y: -g.dir.y };
        }
      });
    }
  }

  // ─── Frightened timer ─────────────────────────────────────────────────────
  function updateFrightened(dt) {
    if (frightMs <= 0) return;
    frightMs -= dt;
    if (frightMs <= 0) {
      frightMs = 0;
      ghosts.forEach(g => {
        if (g.mode === MODE_FRIGHTENED) g.mode = globalMode;
      });
    }
  }

  // ─── Ghost house exit ─────────────────────────────────────────────────────
  function updateHouseExit() {
    ghosts.forEach((g, i) => {
      if (i === 0) return; // Blinky already out
      if (g.mode === MODE_SCATTER || g.mode === MODE_CHASE) return;
      if (g.mode === MODE_FRIGHTENED || g.mode === MODE_EYES) return;
      if (dotsEaten >= g.dotLimit) g.mode = globalMode;
    });
  }

  // ─── Eyes revival ─────────────────────────────────────────────────────────
  function updateEyes(g) {
    if (g.mode === MODE_EYES &&
        g.tileX === HOUSE_CENTER_X &&
        g.tileY === HOUSE_CENTER_Y) {
      g.mode = globalMode;
      g.dir  = DIR_LEFT;
    }
  }

  // ─── Collisions ───────────────────────────────────────────────────────────
  function checkCollisions() {
    for (const g of ghosts) {
      const dx = Math.abs(g.px - pac.px);
      const dy = Math.abs(g.py - pac.py);
      if (dx >= CELL * 0.75 || dy >= CELL * 0.75) continue;

      if (g.mode === MODE_FRIGHTENED) {
        eatCombo++;
        const pts = 200 * (1 << (eatCombo - 1));
        score += pts;
        pushFloat(g.px, g.py, pts);
        g.mode = MODE_EYES;
        g.dir  = DIR_UP;
      } else if (g.mode !== MODE_EYES) {
        lives--;
        if (lives <= 0) { lives = 0; gameOver = true; }
        else resetPositions();
        return;
      }
    }
  }

  // ─── Fruit ────────────────────────────────────────────────────────────────
  function updateFruit(dt) {
    if (!fruitActive) return;
    fruitMs -= dt;
    if (fruitMs <= 0) { fruitActive = false; return; }
    if (pac.tileX === FRUIT_TILE_X && pac.tileY === FRUIT_TILE_Y) {
      const pts = FRUIT_PTS[Math.min(fruitLevel, FRUIT_PTS.length - 1)];
      score += pts;
      pushFloat(FRUIT_TILE_X * CELL + CELL / 2, FRUIT_TILE_Y * CELL + CELL / 2, pts);
      fruitActive = false;
      fruitLevel++;
    }
  }

  // ─── Floating score texts ─────────────────────────────────────────────────
  function pushFloat(x, y, pts) {
    floatTexts.push({ x, y, text: String(pts), ms: 1200 });
  }

  function updateFloats(dt) {
    floatTexts = floatTexts.filter(f => {
      f.ms -= dt;
      f.y  -= 0.35 * (dt / 16);
      return f.ms > 0;
    });
  }

  // ─── Level advance ────────────────────────────────────────────────────────
  function nextLevel() {
    level++;
    buildGrid();
    fruitActive  = false;
    fruitMs      = 0;
    fruitLevel   = 0;
    frightTotal  = Math.max(2000, FRIGHT_MS_BASE - (level - 1) * 800);
    resetPositions();
  }

  // ─── Main update ──────────────────────────────────────────────────────────
  function update(dt) {
    if (gameOver || !gameStarted) return;

    // Blink
    blinkMs += dt;
    if (blinkMs > 500) { blinkMs = 0; blinkOn = !blinkOn; }

    // Pac mouth
    mouthAng += 0.05 * mouthDir;
    if (mouthAng >= 0.25) mouthDir = -1;
    if (mouthAng <= 0)    mouthDir =  1;

    updateModeCycle(dt);
    updateFrightened(dt);
    updateHouseExit();

    // Move ghosts
    for (const g of ghosts) {
      let spd = (g.mode === MODE_EYES)       ? GHOST_EYES_SPD
              : (g.mode === MODE_FRIGHTENED)  ? GHOST_FRIGHT_SPD
              : GHOST_SPD_BASE * (1 + (level - 1) * 0.05);
      if (g.tileY === TUNNEL_ROW && (g.tileX < 5 || g.tileX > COLS - 6)) spd *= TUNNEL_SPD_MUL;
      stepActor(g, dt / 1000, spd, true);
      updateEyes(g);
    }

    // Move Pac-Man
    const pacSpd = PAC_SPD_BASE * (1 + (level - 1) * 0.03);
    stepActor(pac, dt / 1000, pacSpd, false);

    eatAt();
    checkCollisions();
    updateFruit(dt);
    updateFloats(dt);

    if (dotsEaten >= totalDots) nextLevel();
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────
  function drawMaze() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const t = grid[row][col];
        const x = col * CELL, y = row * CELL;

        if (t === T_WALL) {
          ctx.fillStyle = '#1a1acd';
          ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          ctx.strokeStyle = '#2121de';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
        } else if (t === T_DOOR) {
          ctx.fillStyle = '#ffb8ff';
          ctx.fillRect(x + 2, y + CELL / 2 - 1, CELL - 4, 3);
        } else if (t === T_DOT) {
          ctx.fillStyle = '#ffff99';
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (t === T_POWER && blinkOn) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawPac() {
    const r = CELL / 2 - 1;
    const a = mouthAng * Math.PI;
    const base = pac.dir === DIR_LEFT  ? Math.PI :
                 pac.dir === DIR_UP    ? Math.PI * 1.5 :
                 pac.dir === DIR_DOWN  ? Math.PI * 0.5 :
                 0; // right
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(pac.px, pac.py);
    ctx.arc(pac.px, pac.py, r, base + a, base + Math.PI * 2 - a);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(g) {
    const r = CELL / 2 - 1;
    const x = g.px, y = g.py;

    if (g.mode === MODE_EYES) {
      // Bodiless eyes
      drawEyes(x, y, r, g.dir, '#0af');
      return;
    }

    // Body colour
    let col;
    if (g.mode === MODE_FRIGHTENED) {
      const flash = frightMs < FRIGHT_FLASH_MS && Math.floor(blinkMs / 100) % 2 === 0;
      col = flash ? '#ffffff' : '#0000cd';
    } else {
      col = g.color;
    }

    // Ghost body: semicircle + wavy skirt
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r, Math.PI, 0);
    const by = y + r * 0.9;
    ctx.lineTo(x + r, by);
    const ww = (r * 2) / 3;
    for (let i = 2; i >= 0; i--) {
      const cx1 = x + r - i * ww - ww * 0.5;
      const cx2 = x + r - i * ww;
      ctx.quadraticCurveTo(cx1, by + r * 0.45, cx2 - ww * 0.5, y + r * 0.5);
      ctx.quadraticCurveTo(cx2 - ww * 0.25, y, cx2 - ww, by);
    }
    ctx.lineTo(x - r, by);
    ctx.closePath();
    ctx.fill();

    if (g.mode !== MODE_FRIGHTENED) {
      drawEyes(x, y, r, g.dir, '#0af');
      // White part of eyes
      ctx.fillStyle = '#fff';
      const ex = r * 0.35, ey = y - r * 0.3;
      ctx.beginPath();
      ctx.arc(x - ex, ey, r * 0.28, 0, Math.PI * 2);
      ctx.arc(x + ex, ey, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#00f';
      const po = r * 0.12;
      ctx.beginPath();
      ctx.arc(x - ex + g.dir.x * po, ey + g.dir.y * po, r * 0.14, 0, Math.PI * 2);
      ctx.arc(x + ex + g.dir.x * po, ey + g.dir.y * po, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Frightened face
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.12, 0, Math.PI * 2);
      ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y + r * 0.2);
      ctx.lineTo(x - r * 0.2, y + r * 0.1);
      ctx.lineTo(x,            y + r * 0.2);
      ctx.lineTo(x + r * 0.2,  y + r * 0.1);
      ctx.lineTo(x + r * 0.4,  y + r * 0.2);
      ctx.stroke();
    }
  }

  function drawEyes(x, y, r, dir, pupilCol) {
    const ex = r * 0.35, ey = y - r * 0.1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - ex, ey, r * 0.32, 0, Math.PI * 2);
    ctx.arc(x + ex, ey, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    const po = r * 0.14;
    ctx.fillStyle = pupilCol;
    ctx.beginPath();
    ctx.arc(x - ex + dir.x * po, ey + dir.y * po, r * 0.16, 0, Math.PI * 2);
    ctx.arc(x + ex + dir.x * po, ey + dir.y * po, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFruit() {
    if (!fruitActive) return;
    const x = FRUIT_TILE_X * CELL + CELL / 2;
    const y = FRUIT_TILE_Y * CELL + CELL / 2;
    ctx.fillStyle = '#e00';
    ctx.beginPath();
    ctx.arc(x, y, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // Cherry stem hint
    ctx.strokeStyle = '#0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y - 8);
    ctx.stroke();
  }

  function drawFloats() {
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of floatTexts) {
      ctx.fillStyle = `rgba(255,255,64,${Math.min(1, f.ms / 400)})`;
      ctx.fillText(f.text, f.x, f.y);
    }
  }

  function draw() {
    drawMaze();
    drawPac();
    for (const g of ghosts) drawGhost(g);
    drawFruit();
    drawFloats();

    if (!gameStarted) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAC-MAN', CANVAS_W / 2, CANVAS_H / 2 - 30);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText('Press Space or Enter to start', CANVAS_W / 2, CANVAS_H / 2 + 10);
    } else if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 24);
      ctx.fillStyle = '#fff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
      ctx.fillText('Space / Enter to restart', CANVAS_W / 2, CANVAS_H / 2 + 34);
    }
  }

  // ─── RAF loop ─────────────────────────────────────────────────────────────
  function loop(ts) {
    if (!rootEl) return;
    const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
    lastTs = ts;

    update(dt);
    draw();

    if (statusEl) {
      statusEl.textContent = `Score: ${score}   Lives: ${lives}   Level: ${level}`;
    }

    rafId = requestAnimationFrame(loop);
  }

  // ─── Init helpers ─────────────────────────────────────────────────────────
  function initGame() {
    buildGrid();
    initActors();
    score = 0; lives = 3; level = 1;
    gameOver = false; gameStarted = false;
    modeTimer = 0; modePhaseIdx = 0; globalMode = MODE_SCATTER;
    frightMs = 0; frightTotal = FRIGHT_MS_BASE; eatCombo = 0;
    fruitActive = false; fruitMs = 0; fruitLevel = 0;
    floatTexts = [];
    lastTs = 0; blinkMs = 0; blinkOn = true; mouthAng = 0; mouthDir = 1;
  }

  function restartGame() {
    buildGrid();
    initActors();
    score = 0; lives = 3; level = 1;
    gameOver = false; gameStarted = true;
    modeTimer = 0; modePhaseIdx = 0; globalMode = MODE_SCATTER;
    frightMs = 0; frightTotal = FRIGHT_MS_BASE; eatCombo = 0;
    fruitActive = false; fruitMs = 0; fruitLevel = 0;
    floatTexts = [];
    blinkMs = 0; blinkOn = true; mouthAng = 0; mouthDir = 1;
  }

  // ─── Mount / Unmount ──────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .pm-wrap   { text-align: center; user-select: none; }
        .pm-status { font-size: 18px; margin-bottom: 8px; min-height: 24px; color: #fff; }
        .pm-canvas { background: #000; border: 2px solid #2121de; border-radius: 4px;
                     display: block; margin: 0 auto; }
        .pm-hint   { font-size: 12px; color: #888; margin-top: 8px; }
      </style>
      <div class="pm-wrap">
        <div class="pm-status">Score: 0   Lives: 3   Level: 1</div>
        <canvas class="pm-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        <div class="pm-hint">Arrow keys to move &nbsp;|&nbsp; Space / Enter to start</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas   = rootEl.querySelector('.pm-canvas');
    ctx      = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.pm-status');

    initGame();

    keyHandler = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft')  { pac.nextDir = DIR_LEFT;  e.preventDefault(); }
      if (k === 'ArrowRight') { pac.nextDir = DIR_RIGHT; e.preventDefault(); }
      if (k === 'ArrowUp')    { pac.nextDir = DIR_UP;    e.preventDefault(); }
      if (k === 'ArrowDown')  { pac.nextDir = DIR_DOWN;  e.preventDefault(); }
      if (k === ' ' || k === 'Enter') {
        if (!gameStarted) { gameStarted = true; e.preventDefault(); }
        else if (gameOver) { restartGame(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', keyHandler);

    const setDir = (d) => () => { if (!gameStarted) gameStarted = true; pac.nextDir = d; };
    controlsHandle = window.MiniGames.controls.create(rootEl.querySelector('.pm-wrap'), {
      dpad: {
        up:    setDir(DIR_UP),
        down:  setDir(DIR_DOWN),
        left:  setDir(DIR_LEFT),
        right: setDir(DIR_RIGHT),
      },
    });

    swipeHandle = window.MiniGames.controls.onSwipe(canvas, {
      up:    setDir(DIR_UP),
      down:  setDir(DIR_DOWN),
      left:  setDir(DIR_LEFT),
      right: setDir(DIR_RIGHT),
    });

    rafId = requestAnimationFrame(loop);
  }

  function unmount() {
    if (rafId)          { cancelAnimationFrame(rafId); rafId = null; }
    if (keyHandler)     { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (swipeHandle)    { swipeHandle.destroy();    swipeHandle    = null; }
    if (controlsHandle) { controlsHandle.destroy(); controlsHandle = null; }
    if (rootEl)         { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null; statusEl = null;
    pac = {}; ghosts = []; grid = []; floatTexts = [];
  }

  // ─── Self-checks ──────────────────────────────────────────────────────────
  console.assert(wrapX(-1)    === COLS - 1, 'wrapX(-1) should equal COLS-1');
  console.assert(wrapX(COLS)  === 0,        'wrapX(COLS) should equal 0');

  // ─── Register ─────────────────────────────────────────────────────────────
  window.MiniGames = window.MiniGames || {};
  window.MiniGames.pacman = { mount, unmount };
})();
