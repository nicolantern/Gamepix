(function () {
  // ===========================================================================
  // Frogger — hop from the bottom bank across a road and a river to fill the
  // five home bays at the top. Road traffic kills on contact; the river drowns
  // you unless you're riding a log. 3 lives, endless levels that speed up.
  // Same module contract as the other games: mount(container) / unmount().
  // ===========================================================================
  var COLS = 13, ROWS = 13, CELL = 32;
  var W = COLS * CELL, H = ROWS * CELL;
  var BAY_COLS = [0, 3, 6, 9, 12];

  // Lanes by row. speed in cells/sec; itemCells = width; gapCells = spacing.
  // Rows 1–5 = river (logs), row 6 = median, rows 7–11 = road (cars), 0 = goal,
  // 12 = start. dir +1 → moves right, -1 → moves left.
  var LANES = {
    1:  { type: 'river', dir:  1, speed: 1.6, itemCells: 3, gapCells: 6 },
    2:  { type: 'river', dir: -1, speed: 2.2, itemCells: 2, gapCells: 5 },
    3:  { type: 'river', dir:  1, speed: 1.2, itemCells: 4, gapCells: 7 },
    4:  { type: 'river', dir: -1, speed: 2.6, itemCells: 2, gapCells: 4 },
    5:  { type: 'river', dir:  1, speed: 1.8, itemCells: 3, gapCells: 6 },
    7:  { type: 'road',  dir: -1, speed: 2.4, itemCells: 1, gapCells: 4 },
    8:  { type: 'road',  dir:  1, speed: 1.8, itemCells: 2, gapCells: 5 },
    9:  { type: 'road',  dir: -1, speed: 3.0, itemCells: 1, gapCells: 4 },
    10: { type: 'road',  dir:  1, speed: 2.0, itemCells: 2, gapCells: 6 },
    11: { type: 'road',  dir: -1, speed: 1.5, itemCells: 1, gapCells: 3 }
  };
  var CAR_COLORS = { 7: '#ffb400', 8: '#5ad1ff', 9: '#ff5773', 10: '#b07bff', 11: '#ff8c42' };

  var rootEl = null, canvas = null, ctx = null, statusEl = null;
  var rafId = null, last = 0, keyHandler = null, touch = null;
  var frog, scroll, filled, lives, score, level, state;

  function speedMul() { return 1 + (level - 1) * 0.25; }
  function filledCount() { var n = 0; for (var k in filled) if (filled[k]) n++; return n; }

  function resetFrog() { frog = { px: 6 * CELL, row: ROWS - 1 }; }

  function newGame() {
    scroll = {};
    for (var r in LANES) scroll[r] = (parseInt(r, 10) * 3.1) % COLS; // varied lane phase
    filled = {};
    lives = 3; score = 0; level = 1; state = 'play';
    resetFrog();
  }

  // Item intervals [leftPx, rightPx] for a lane, including a wrapped twin so
  // objects scroll seamlessly across the edge (used for both draw + collision).
  function laneIntervals(r) {
    var lane = LANES[r];
    var count = Math.floor(COLS / lane.gapCells) + 2;
    var out = [];
    for (var i = 0; i < count; i++) {
      var base = i * lane.gapCells;
      var pos = lane.dir > 0 ? (base + scroll[r]) : (base - scroll[r]);
      var leftCell = ((pos % COLS) + COLS) % COLS;
      var leftPx = leftCell * CELL;
      var rightPx = leftPx + lane.itemCells * CELL;
      out.push([leftPx, rightPx]);
      if (rightPx > W) out.push([leftPx - W, rightPx - W]); // wrapped twin
    }
    return out;
  }

  function die() {
    lives -= 1;
    if (lives <= 0) { state = 'over'; if (window.MiniGames.scores) window.MiniGames.scores.submit('frogger', score); }
    else resetFrog();
  }

  function levelUp() {
    level += 1;
    filled = {};
    score += 100;
    resetFrog();
  }

  function goalAttempt() {
    var col = Math.round(frog.px / CELL);
    if (BAY_COLS.indexOf(col) >= 0 && !filled[col]) {
      filled[col] = true;
      score += 50;
      if (filledCount() === BAY_COLS.length) levelUp();
      else resetFrog();
    } else {
      die();
    }
  }

  function hop(dx, dy) {
    if (state === 'over') { newGame(); return; }
    if (dy < 0) {
      var nr = frog.row - 1;
      if (nr === 0) { goalAttempt(); return; }
      frog.row = Math.max(1, nr);
      score += 2;
    } else if (dy > 0) {
      frog.row = Math.min(ROWS - 1, frog.row + 1);
    } else if (dx) {
      frog.px = Math.max(0, Math.min(W - CELL, frog.px + dx * CELL));
    }
  }

  function update(dt) {
    if (state !== 'play') return;
    for (var r in LANES) scroll[r] += LANES[r].speed * speedMul() * dt;

    var lane = LANES[frog.row];
    if (!lane) return;
    var ints = laneIntervals(frog.row);
    var fl = frog.px, fr = frog.px + CELL, fc = frog.px + CELL / 2;

    if (lane.type === 'road') {
      for (var i = 0; i < ints.length; i++) {
        if (fl < ints[i][1] && fr > ints[i][0]) { die(); return; }
      }
    } else { // river
      var onLog = false;
      for (var j = 0; j < ints.length; j++) {
        if (fc >= ints[j][0] && fc <= ints[j][1]) { onLog = true; break; }
      }
      if (onLog) {
        frog.px += lane.dir * lane.speed * speedMul() * CELL * dt;
        if (frog.px < 0 || frog.px + CELL > W) { die(); return; }
      } else {
        die(); return;
      }
    }
  }

  function rowY(row) { return row * CELL; }

  function draw() {
    // Backgrounds
    ctx.fillStyle = '#0f0f1e'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16324a'; ctx.fillRect(0, rowY(1), W, 5 * CELL);   // river
    ctx.fillStyle = '#2e8b57'; ctx.fillRect(0, rowY(6), W, CELL);       // median
    ctx.fillStyle = '#2a2a3e'; ctx.fillRect(0, rowY(7), W, 5 * CELL);   // road
    ctx.fillStyle = '#2e8b57'; ctx.fillRect(0, rowY(12), W, CELL);      // start bank
    ctx.fillStyle = '#1d5e3a'; ctx.fillRect(0, 0, W, CELL);             // goal bank

    // Home bays
    for (var b = 0; b < BAY_COLS.length; b++) {
      var bx = BAY_COLS[b] * CELL;
      ctx.fillStyle = filled[BAY_COLS[b]] ? '#4caf50' : '#0c3a24';
      ctx.fillRect(bx + 3, 4, CELL - 6, CELL - 8);
    }

    // Lane items
    for (var r in LANES) {
      var lane = LANES[r];
      var y = rowY(parseInt(r, 10)) + 4;
      var ints = laneIntervals(r);
      for (var i = 0; i < ints.length; i++) {
        var x = ints[i][0], w = ints[i][1] - ints[i][0];
        if (lane.type === 'river') {
          ctx.fillStyle = '#8a5a2b';
          roundRect(x + 2, y, w - 4, CELL - 8, 6);
        } else {
          ctx.fillStyle = CAR_COLORS[r] || '#ff5773';
          roundRect(x + 3, y, w - 6, CELL - 8, 4);
        }
      }
    }

    // Frog
    var fx = frog.px, fy = rowY(frog.row);
    ctx.fillStyle = '#7CFC00';
    roundRect(fx + 4, fy + 4, CELL - 8, CELL - 8, 6);
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(fx + 9, fy + 9, 3, 3);
    ctx.fillRect(fx + CELL - 12, fy + 9, 3, 3);

    if (state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', W / 2, H / 2 - 10);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('Score: ' + score, W / 2, H / 2 + 18);
      ctx.textAlign = 'left';
    }

    statusEl.textContent = state === 'over'
      ? 'Game over — Score: ' + score + '. Press Space / tap to restart.'
      : '♥ ' + lives + '    Score: ' + score + '    Homes: ' + filledCount() + '/5    Lv ' + level;
  }

  function roundRect(x, y, w, h, r) {
    if (w < 0) return;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML =
      '<style>' +
      '.frog-wrap { text-align: center; }' +
      '.frog-status { font-size: 16px; margin-bottom: 12px; min-height: 22px; }' +
      '.frog-canvas { background: #0f0f1e; border: 2px solid #4a4a6a; border-radius: 4px; max-width: 100%; height: auto; touch-action: none; }' +
      '.frog-hint { font-size: 12px; color: #888; margin-top: 8px; }' +
      '</style>' +
      '<div class="frog-wrap">' +
      '<div class="frog-status"></div>' +
      '<canvas class="frog-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<div class="frog-hint">Arrow keys / WASD to hop — reach the 5 bays up top</div>' +
      '</div>';
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.frog-canvas');
    ctx = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.frog-status');

    newGame();
    last = 0;

    keyHandler = function (e) {
      var k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { hop(0, -1); e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { hop(0, 1); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { hop(-1, 0); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { hop(1, 0); e.preventDefault(); }
      else if (k === ' ') { if (state === 'over') newGame(); e.preventDefault(); }
    };
    window.addEventListener('keydown', keyHandler);

    if (window.MiniGames && window.MiniGames.controls) {
      touch = window.MiniGames.controls.create(container, {
        dpad: {
          up: function () { hop(0, -1); },
          down: function () { hop(0, 1); },
          left: function () { hop(-1, 0); },
          right: function () { hop(1, 0); }
        }
      });
    }

    rafId = requestAnimationFrame(loop);
  }

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (touch) { touch.destroy(); touch = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null; statusEl = null;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.frogger = { mount: mount, unmount: unmount };
})();
