(function () {
  // ─── Constants ────────────────────────────────────────────────────────────
  const COLS = 10;
  const ROWS = 20;
  const CELL = 24;
  const PANEL_W = 120;
  const CANVAS_W = COLS * CELL;           // 240
  const CANVAS_H = ROWS * CELL;           // 480
  const LOCK_DELAY_MS = 500;
  const LOCK_RESET_CAP = 15;             // max resets per placement

  // Gravity intervals (ms) per level (0-indexed, capped at 20)
  function gravityMs(level) {
    const frames = [48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2,2];
    return (frames[Math.min(level, 20)] / 60) * 1000;
  }

  // Line-clear scoring multipliers
  const LINE_SCORES = [0, 100, 300, 500, 800];

  // ─── Piece definitions ────────────────────────────────────────────────────
  // Each piece: array of 4 rotation states, each state = array of [col,row] offsets from origin
  // Origin is the rotation pivot; offsets are relative to it.

  const PIECES = {
    I: {
      color: '#00cfcf',
      rotations: [
        [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1}],  // 0
        [{x:2,y:0},{x:2,y:1},{x:2,y:2},{x:2,y:3}],  // R
        [{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2}],  // 2
        [{x:1,y:0},{x:1,y:1},{x:1,y:2},{x:1,y:3}],  // L
      ]
    },
    O: {
      color: '#cfcf00',
      rotations: [
        [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}],
        [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}],
        [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}],
        [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}],
      ]
    },
    T: {
      color: '#a000cf',
      rotations: [
        [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],  // 0
        [{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:1,y:2}],  // R
        [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:2}],  // 2
        [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:2}],  // L
      ]
    },
    S: {
      color: '#00cf00',
      rotations: [
        [{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:1,y:1}],  // 0
        [{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2}],  // R
        [{x:1,y:1},{x:2,y:1},{x:0,y:2},{x:1,y:2}],  // 2
        [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:2}],  // L
      ]
    },
    Z: {
      color: '#cf0000',
      rotations: [
        [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1}],  // 0
        [{x:2,y:0},{x:1,y:1},{x:2,y:1},{x:1,y:2}],  // R
        [{x:0,y:1},{x:1,y:1},{x:1,y:2},{x:2,y:2}],  // 2
        [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:0,y:2}],  // L
      ]
    },
    J: {
      color: '#0000cf',
      rotations: [
        [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],  // 0
        [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:1,y:2}],  // R
        [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:2}],  // 2
        [{x:1,y:0},{x:1,y:1},{x:0,y:2},{x:1,y:2}],  // L
      ]
    },
    L: {
      color: '#cf7000',
      rotations: [
        [{x:2,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],  // 0
        [{x:1,y:0},{x:1,y:1},{x:1,y:2},{x:2,y:2}],  // R
        [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:0,y:2}],  // 2
        [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:2}],  // L
      ]
    },
  };

  const PIECE_TYPES = Object.keys(PIECES); // ['I','O','T','S','Z','J','L']

  // ─── SRS Wall-Kick tables ─────────────────────────────────────────────────
  // JLSTZ kicks: indexed by [fromRotation][0=CW/1=CCW], each entry = array of [dx,dy] offsets to try
  const KICKS_JLSTZ = {
    // CW transitions: 0→R, R→2, 2→L, L→0
    cw: [
      [{x:-1,y:0},{x:-1,y:-1},{x:0,y:2},{x:-1,y:2}],   // 0→R
      [{x:1,y:0},{x:1,y:1},{x:0,y:-2},{x:1,y:-2}],      // R→2
      [{x:1,y:0},{x:1,y:-1},{x:0,y:2},{x:1,y:2}],       // 2→L
      [{x:-1,y:0},{x:-1,y:1},{x:0,y:-2},{x:-1,y:-2}],   // L→0
    ],
    // CCW transitions: 0→L, L→2, 2→R, R→0
    ccw: [
      [{x:1,y:0},{x:1,y:-1},{x:0,y:2},{x:1,y:2}],       // 0→L
      [{x:1,y:0},{x:1,y:1},{x:0,y:-2},{x:1,y:-2}],      // L→2  (from=L=3, index=3 in array... we index by fromRot)
      [{x:-1,y:0},{x:-1,y:-1},{x:0,y:2},{x:-1,y:2}],    // 2→R
      [{x:-1,y:0},{x:-1,y:1},{x:0,y:-2},{x:-1,y:-2}],   // R→0
    ]
  };

  // I-piece kicks
  const KICKS_I = {
    cw: [
      [{x:-2,y:0},{x:1,y:0},{x:-2,y:1},{x:1,y:-2}],    // 0→R
      [{x:-1,y:0},{x:2,y:0},{x:-1,y:-2},{x:2,y:1}],    // R→2
      [{x:2,y:0},{x:-1,y:0},{x:2,y:-1},{x:-1,y:2}],    // 2→L
      [{x:1,y:0},{x:-2,y:0},{x:1,y:2},{x:-2,y:-1}],    // L→0
    ],
    ccw: [
      [{x:-1,y:0},{x:2,y:0},{x:-1,y:-2},{x:2,y:1}],    // 0→L
      [{x:2,y:0},{x:-1,y:0},{x:2,y:-1},{x:-1,y:2}],    // L→2
      [{x:1,y:0},{x:-2,y:0},{x:1,y:2},{x:-2,y:-1}],    // 2→R
      [{x:-2,y:0},{x:1,y:0},{x:-2,y:1},{x:1,y:-2}],    // R→0
    ]
  };

  // Get kick offsets for a piece type, direction, and fromRotation
  function getKicks(type, dir, fromRot) {
    if (type === 'O') return [];
    const table = (type === 'I') ? KICKS_I : KICKS_JLSTZ;
    return table[dir][fromRot];
  }

  // ─── Pure collision function (exported via self-check) ─────────────────────
  // grid: 2D array [row][col], 0=empty, nonzero=filled
  // cells: array of {x,y} absolute cell coords
  // Returns true if any cell is out of bounds or overlaps a filled grid cell.
  function collides(grid, cells) {
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.x < 0 || c.x >= COLS) return true;
      if (c.y >= ROWS) return true;
      // y < 0 is above the grid (spawn area) — allowed
      if (c.y >= 0 && grid[c.y][c.x] !== 0) return true;
    }
    return false;
  }

  // ─── Inline self-checks ───────────────────────────────────────────────────
  (function selfCheck() {
    var emptyGrid = [];
    for (var r = 0; r < ROWS; r++) {
      emptyGrid.push(new Array(COLS).fill(0));
    }

    // Spawn-position I piece (cells at y=1) on empty grid → no collision
    var iSpawnCells = PIECES.I.rotations[0].map(function(o) { return {x: o.x + 3, y: o.y + 0}; });
    console.assert(!collides(emptyGrid, iSpawnCells), 'Self-check FAIL: I spawn should not collide on empty grid');

    // Cell at y=20 (below floor) → collides
    console.assert(collides(emptyGrid, [{x:5, y:20}]), 'Self-check FAIL: y=20 should collide (below floor)');

    // Cell at x=-1 → collides
    console.assert(collides(emptyGrid, [{x:-1, y:5}]), 'Self-check FAIL: x=-1 should collide (left wall)');

    // Cell at x=10 → collides
    console.assert(collides(emptyGrid, [{x:10, y:5}]), 'Self-check FAIL: x=10 should collide (right wall)');

    // Cell overlapping a filled grid cell → collides
    var filledGrid = emptyGrid.map(function(row) { return row.slice(); });
    filledGrid[5][3] = 1;
    console.assert(collides(filledGrid, [{x:3, y:5}]), 'Self-check FAIL: filled cell should collide');

    // Cell above grid (y<0) on otherwise-empty grid → no collision (spawn area)
    console.assert(!collides(emptyGrid, [{x:5, y:-1}]), 'Self-check FAIL: y=-1 (above grid) should NOT collide');

    console.log('[Tetris] self-checks passed');
  })();

  // ─── Module state ─────────────────────────────────────────────────────────
  let rootEl = null;
  let canvas = null;
  let ctx = null;
  let rafId = null;
  let keydownHandler = null;
  let keyupHandler = null;
  let controlsHandle = null;

  // Game state
  let grid = [];
  let current = null;      // { type, rot, x, y }
  let holdPiece = null;    // type string or null
  let canHold = true;
  let nextQueue = [];      // array of type strings, length = 3 visible
  let bag = [];
  let score = 0;
  let level = 0;
  let lines = 0;
  let gameOver = false;
  let lastTime = 0;
  let gravityAccum = 0;
  let lockTimer = 0;
  let lockResets = 0;
  let onGround = false;
  let softDropping = false;
  let statusEl = null;

  // ─── Bag randomizer ───────────────────────────────────────────────────────
  function shuffleBag() {
    const b = PIECE_TYPES.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }

  function nextPiece() {
    if (bag.length === 0) bag = shuffleBag();
    return bag.shift();
  }

  function fillQueue() {
    while (nextQueue.length < 4) nextQueue.push(nextPiece());
  }

  // ─── Grid helpers ─────────────────────────────────────────────────────────
  function makeGrid() {
    return Array.from({length: ROWS}, () => new Array(COLS).fill(0));
  }

  function getCells(type, rot, px, py) {
    return PIECES[type].rotations[rot].map(o => ({x: px + o.x, y: py + o.y}));
  }

  // ─── Ghost piece ──────────────────────────────────────────────────────────
  function ghostY() {
    let gy = current.y;
    while (!collides(grid, getCells(current.type, current.rot, current.x, gy + 1))) {
      gy++;
    }
    return gy;
  }

  // ─── Spawn ────────────────────────────────────────────────────────────────
  function spawnPiece(type) {
    // Standard spawn: origin at col 3, row -1 (cells occupy the top visible row, y=0).
    const piece = { type, rot: 0, x: 3, y: -1 };
    // Block-out rule: if the piece overlaps the stack at its spawn position, it's game over.
    // (Do NOT nudge upward — cells above the grid never "collide", so nudging would mask
    // the top-out and make the game unlosable.)
    if (collides(grid, getCells(type, 0, piece.x, piece.y))) {
      return null; // top-out
    }
    return piece;
  }

  // ─── Movement ─────────────────────────────────────────────────────────────
  function tryMove(dx, dy) {
    const nx = current.x + dx;
    const ny = current.y + dy;
    if (collides(grid, getCells(current.type, current.rot, nx, ny))) return false;
    current.x = nx;
    current.y = ny;
    if (dy === 0) {
      // Horizontal move resets lock timer if on ground
      if (onGround && lockResets < LOCK_RESET_CAP) {
        lockTimer = 0;
        lockResets++;
      }
    }
    return true;
  }

  function tryRotate(dir) {
    // dir: 'cw' or 'ccw'
    const fromRot = current.rot;
    const toRot = dir === 'cw'
      ? (fromRot + 1) % 4
      : (fromRot + 3) % 4;

    // Try base position first
    if (!collides(grid, getCells(current.type, toRot, current.x, current.y))) {
      current.rot = toRot;
      if (onGround && lockResets < LOCK_RESET_CAP) {
        lockTimer = 0;
        lockResets++;
      }
      return true;
    }

    // Try kicks
    const kicks = getKicks(current.type, dir, fromRot);
    for (const kick of kicks) {
      const kx = current.x + kick.x;
      const ky = current.y + kick.y;
      if (!collides(grid, getCells(current.type, toRot, kx, ky))) {
        current.x = kx;
        current.y = ky;
        current.rot = toRot;
        if (onGround && lockResets < LOCK_RESET_CAP) {
          lockTimer = 0;
          lockResets++;
        }
        return true;
      }
    }
    return false;
  }

  function hardDrop() {
    const gy = ghostY();
    const dropped = gy - current.y;
    current.y = gy;
    score += dropped * 2; // bonus: 2 pts per row hard-dropped
    lockPiece();
  }

  function holdSwap() {
    if (!canHold) return;
    canHold = false;
    const prevHold = holdPiece;
    holdPiece = current.type;
    if (prevHold === null) {
      // Draw from queue
      const type = nextQueue.shift();
      fillQueue();
      current = spawnPiece(type);
    } else {
      current = spawnPiece(prevHold);
    }
    if (current === null) {
      triggerGameOver();
    }
    onGround = false;
    lockTimer = 0;
    lockResets = 0;
  }

  // ─── Locking ──────────────────────────────────────────────────────────────
  function lockPiece() {
    const cells = getCells(current.type, current.rot, current.x, current.y);
    const colorIdx = PIECE_TYPES.indexOf(current.type) + 1; // 1-7
    for (const c of cells) {
      if (c.y >= 0) {
        grid[c.y][c.x] = colorIdx;
      }
    }
    clearLines();

    // Spawn next
    const type = nextQueue.shift();
    fillQueue();
    current = spawnPiece(type);
    canHold = true;
    onGround = false;
    lockTimer = 0;
    lockResets = 0;

    if (current === null) {
      triggerGameOver();
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(c => c !== 0)) {
        grid.splice(r, 1);
        grid.unshift(new Array(COLS).fill(0));
        cleared++;
        r++; // re-check same index after splice
      }
    }
    if (cleared > 0) {
      score += (LINE_SCORES[cleared] || 0) * (level + 1);
      lines += cleared;
      level = Math.floor(lines / 10);
    }
  }

  function triggerGameOver() {
    gameOver = true; if (window.MiniGames.scores) window.MiniGames.scores.submit('tetris', score);
    current = null;
    updateStatus();
  }

  // ─── Status display ───────────────────────────────────────────────────────
  function updateStatus() {
    if (!statusEl) return;
    if (gameOver) {
      statusEl.textContent = `Game Over — Score: ${score} | Press Space or Enter to restart`;
    } else {
      statusEl.textContent = `Score: ${score}  Level: ${level + 1}  Lines: ${lines}`;
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────
  function resetGame() {
    grid = makeGrid();
    holdPiece = null;
    canHold = true;
    nextQueue = [];
    bag = [];
    score = 0;
    level = 0;
    lines = 0;
    gameOver = false;
    gravityAccum = 0;
    lockTimer = 0;
    lockResets = 0;
    onGround = false;
    softDropping = false;
    lastTime = 0;

    fillQueue();
    const type = nextQueue.shift();
    fillQueue();
    current = spawnPiece(type);
    // spawnPiece can't fail on a fresh grid
    updateStatus();
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────
  // Color table indexed 1-7 matching PIECE_TYPES order
  const PIECE_COLORS = PIECE_TYPES.map(t => PIECES[t].color);

  function cellColor(idx) {
    if (idx === 0) return null;
    return PIECE_COLORS[idx - 1];
  }

  function drawCell(cx, cy, color, alpha) {
    const px = cx * CELL;
    const py = cy * CELL;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    // Highlight edge
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(px + 1, py + 1, CELL - 2, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px + 1, py + CELL - 4, CELL - 2, 3);
    ctx.globalAlpha = 1;
  }

  function drawGrid() {
    // Background
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = '#1f1f3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, CANVAS_H);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(CANVAS_W, r * CELL);
    }
    ctx.stroke();

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== 0) {
          drawCell(c, r, cellColor(grid[r][c]));
        }
      }
    }
  }

  function drawGhost() {
    if (!current || gameOver) return;
    const gy = ghostY();
    const cells = getCells(current.type, current.rot, current.x, gy);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = PIECES[current.type].color;
    for (const c of cells) {
      if (c.y >= 0) {
        ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
        // Ghost outline
        ctx.strokeStyle = PIECES[current.type].color;
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x * CELL + 1.5, c.y * CELL + 1.5, CELL - 3, CELL - 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawCurrent() {
    if (!current || gameOver) return;
    const cells = getCells(current.type, current.rot, current.x, current.y);
    for (const c of cells) {
      if (c.y >= 0) {
        drawCell(c.x, c.y, PIECES[current.type].color);
      }
    }
  }

  // ─── Panel drawing (HOLD + NEXT + stats) ──────────────────────────────────
  function drawMiniPiece(panelCtx, type, boxX, boxY, boxSize) {
    if (!type) return;
    const cells = PIECES[type].rotations[0];
    // Find bounding box
    const minX = Math.min(...cells.map(c => c.x));
    const maxX = Math.max(...cells.map(c => c.x));
    const minY = Math.min(...cells.map(c => c.y));
    const maxY = Math.max(...cells.map(c => c.y));
    const pieceW = maxX - minX + 1;
    const pieceH = maxY - minY + 1;
    const cs = Math.min(Math.floor(boxSize / Math.max(pieceW, pieceH)), 16);
    const offX = boxX + Math.floor((boxSize - pieceW * cs) / 2);
    const offY = boxY + Math.floor((boxSize - pieceH * cs) / 2);
    panelCtx.fillStyle = PIECES[type].color;
    for (const c of cells) {
      panelCtx.fillRect(
        offX + (c.x - minX) * cs + 1,
        offY + (c.y - minY) * cs + 1,
        cs - 2, cs - 2
      );
    }
  }

  function drawPanel(panelCtx, panelW, panelH) {
    panelCtx.fillStyle = '#0f0f1e';
    panelCtx.fillRect(0, 0, panelW, panelH);

    panelCtx.fillStyle = '#888';
    panelCtx.font = '11px monospace';
    panelCtx.textAlign = 'center';

    const boxW = panelW - 16;
    const boxX = 8;

    // HOLD
    panelCtx.fillStyle = '#555';
    panelCtx.fillText('HOLD', panelW / 2, 16);
    panelCtx.strokeStyle = canHold ? '#4a4a6a' : '#333';
    panelCtx.lineWidth = 1;
    panelCtx.strokeRect(boxX, 20, boxW, 50);
    if (holdPiece) {
      panelCtx.globalAlpha = canHold ? 1 : 0.4;
      drawMiniPiece(panelCtx, holdPiece, boxX, 20, boxW < 50 ? boxW : 50);
      panelCtx.globalAlpha = 1;
    }

    // NEXT
    panelCtx.fillStyle = '#555';
    panelCtx.fillText('NEXT', panelW / 2, 84);
    const showNext = nextQueue.slice(0, 3);
    for (let i = 0; i < showNext.length; i++) {
      const ty = 88 + i * 56;
      panelCtx.strokeStyle = '#4a4a6a';
      panelCtx.strokeRect(boxX, ty, boxW, 50);
      drawMiniPiece(panelCtx, showNext[i], boxX, ty, boxW < 50 ? boxW : 50);
    }

    // Stats
    const statsY = 88 + 3 * 56 + 10;
    panelCtx.fillStyle = '#aaa';
    panelCtx.font = 'bold 11px monospace';
    panelCtx.textAlign = 'left';
    panelCtx.fillText('SCORE', boxX, statsY);
    panelCtx.fillStyle = '#e94560';
    panelCtx.font = '13px monospace';
    panelCtx.fillText(score, boxX, statsY + 16);

    panelCtx.fillStyle = '#aaa';
    panelCtx.font = 'bold 11px monospace';
    panelCtx.fillText('LEVEL', boxX, statsY + 36);
    panelCtx.fillStyle = '#e94560';
    panelCtx.font = '13px monospace';
    panelCtx.fillText(level + 1, boxX, statsY + 52);

    panelCtx.fillStyle = '#aaa';
    panelCtx.font = 'bold 11px monospace';
    panelCtx.fillText('LINES', boxX, statsY + 72);
    panelCtx.fillStyle = '#e94560';
    panelCtx.font = '13px monospace';
    panelCtx.fillText(lines, boxX, statsY + 88);
  }

  // ─── Game loop ────────────────────────────────────────────────────────────
  let panelCanvas = null;
  let panelCtx = null;

  function draw() {
    drawGrid();
    drawGhost();
    drawCurrent();
    drawPanel(panelCtx, PANEL_W, CANVAS_H);
  }

  function loop(ts) {
    if (!rafId) return; // unmounted during frame

    if (!lastTime) lastTime = ts;
    const dt = ts - lastTime;
    lastTime = ts;

    if (!gameOver && current) {
      // Gravity
      const gMs = softDropping ? Math.min(gravityMs(level), 50) : gravityMs(level);
      gravityAccum += dt;

      while (gravityAccum >= gMs) {
        gravityAccum -= gMs;
        const moved = tryMove(0, 1);
        if (softDropping && moved) score += 1; // soft drop bonus
        const nowOnGround = collides(grid, getCells(current.type, current.rot, current.x, current.y + 1));
        if (!moved || nowOnGround) {
          onGround = true;
          gravityAccum = 0;
          break;
        } else {
          onGround = false;
          lockTimer = 0;
          lockResets = 0;
        }
      }

      // Recalculate onGround after gravity
      onGround = collides(grid, getCells(current.type, current.rot, current.x, current.y + 1));

      // Lock delay
      if (onGround) {
        lockTimer += dt;
        if (lockTimer >= LOCK_DELAY_MS) {
          lockPiece();
        }
      } else {
        lockTimer = 0;
      }
    }

    draw();
    updateStatus();
    rafId = requestAnimationFrame(loop);
  }

  // ─── Controls ─────────────────────────────────────────────────────────────
  function moveLeft()  { if (!gameOver && current) { tryMove(-1, 0); } }
  function moveRight() { if (!gameOver && current) { tryMove(1, 0); } }
  function softDrop()  { if (!gameOver && current) { tryMove(0, 1); score += 1; } }
  function rotateCW()  { if (!gameOver && current) { tryRotate('cw'); } }
  function doHardDrop() {
    if (gameOver) {
      resetGame();
      return;
    }
    if (current) hardDrop();
  }

  // ─── Mount ────────────────────────────────────────────────────────────────
  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .tetris-wrap { text-align: center; display: flex; flex-direction: column; align-items: center; }
        .tetris-status { font-size: 18px; margin-bottom: 10px; min-height: 24px; }
        .tetris-board-row { display: flex; justify-content: center; gap: 4px; }
        .tetris-main { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; }
        .tetris-panel { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; }
        .tetris-hint { font-size: 12px; color: #888; margin-top: 8px; }
      </style>
      <div class="tetris-wrap">
        <div class="tetris-status"></div>
        <div class="tetris-board-row">
          <canvas class="tetris-panel"></canvas>
          <canvas class="tetris-main"></canvas>
        </div>
        <div class="tetris-hint">← → Move &nbsp; ↑ Rotate &nbsp; ↓ Soft Drop &nbsp; Space Hard Drop &nbsp; C Hold</div>
      </div>
    `;
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.tetris-main');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');

    panelCanvas = rootEl.querySelector('.tetris-panel');
    panelCanvas.width = PANEL_W;
    panelCanvas.height = CANVAS_H;
    panelCtx = panelCanvas.getContext('2d');

    statusEl = rootEl.querySelector('.tetris-status');

    resetGame();
    lastTime = 0;

    // Keyboard handler
    keydownHandler = (e) => {
      const k = e.key;
      if (k === 'ArrowLeft'  || k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowUp' || k === ' ') {
        e.preventDefault();
      }
      if (gameOver) {
        if (k === ' ' || k === 'Enter') { resetGame(); }
        return;
      }
      if (!current) return;
      if (k === 'ArrowLeft')  moveLeft();
      if (k === 'ArrowRight') moveRight();
      if (k === 'ArrowDown')  { softDropping = true; softDrop(); }
      if (k === 'ArrowUp')    rotateCW();
      if (k === ' ')          hardDrop();
      if (k === 'c' || k === 'C') holdSwap();
    };
    keyupHandler = (e) => {
      if (e.key === 'ArrowDown') softDropping = false;
    };
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup', keyupHandler);

    // Touch controls
    controlsHandle = window.MiniGames.controls.create(rootEl, {
      dpad: {
        left: moveLeft,
        right: moveRight,
        down: softDrop,
      },
      hold: true,
      buttons: [
        { label: '⟳', action: rotateCW },
        { label: '⤓ Drop', action: doHardDrop },
        { label: 'Hold', action: holdSwap },
      ],
    });

    rafId = requestAnimationFrame(loop);
  }

  // ─── Unmount ──────────────────────────────────────────────────────────────
  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keydownHandler) { window.removeEventListener('keydown', keydownHandler); keydownHandler = null; }
    if (keyupHandler)   { window.removeEventListener('keyup', keyupHandler);     keyupHandler = null; }
    if (controlsHandle) { controlsHandle.destroy(); controlsHandle = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null;
    panelCanvas = null; panelCtx = null;
    statusEl = null;
    // Reset game state
    grid = []; current = null; holdPiece = null; nextQueue = []; bag = [];
    score = 0; level = 0; lines = 0; gameOver = false;
    gravityAccum = 0; lockTimer = 0; lockResets = 0;
    onGround = false; softDropping = false; lastTime = 0; canHold = true;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.tetris = { mount, unmount };
})();
