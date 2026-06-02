(function () {
  // ── Pure logic ─────────────────────────────────────────────────────────────

  // Collapse a single row to the LEFT. Returns { row: newArray, gained: points }.
  // Merges equal pairs once, left-to-right. Zeros are empty.
  function slideRow(row) {
    // Compact non-zero values to the left
    var vals = row.filter(function (v) { return v !== 0; });
    var gained = 0;
    // Merge adjacent equal pairs (once per position)
    for (var i = 0; i < vals.length - 1; i++) {
      if (vals[i] === vals[i + 1]) {
        vals[i] = vals[i] * 2;
        gained += vals[i];
        vals.splice(i + 1, 1);
        i++; // skip the merged position so we don't chain
        i--; // counteract the loop increment — actually: after merge, i stays same
        // correction: we want to skip the merged slot, so just increment i once extra
        // Re-examine: after splice, vals[i] is now merged, vals[i+1] is the next.
        // The loop i++ will advance past the merged tile, which is correct (no chain).
        // The extra i-- above is wrong — remove it. Let's do it cleanly:
      }
    }
    // Re-do the merge cleanly without the confusing i-- above
    // (We already mutated vals above; let's redo from scratch)
    vals = row.filter(function (v) { return v !== 0; });
    gained = 0;
    var merged = [];
    var skip = false;
    for (var j = 0; j < vals.length; j++) {
      if (skip) { skip = false; continue; }
      if (j + 1 < vals.length && vals[j] === vals[j + 1]) {
        var m = vals[j] * 2;
        merged.push(m);
        gained += m;
        skip = true;
      } else {
        merged.push(vals[j]);
      }
    }
    // Pad with zeros to length 4
    while (merged.length < row.length) { merged.push(0); }
    return { row: merged, gained: gained };
  }

  // ── Inline self-checks (run once at load) ─────────────────────────────────
  console.assert(JSON.stringify(slideRow([2,2,2,2]).row) === JSON.stringify([4,4,0,0]), '2048 merge [2,2,2,2]');
  console.assert(slideRow([2,2,2,2]).gained === 8, '2048 gained [2,2,2,2]');
  console.assert(JSON.stringify(slideRow([2,0,2,0]).row) === JSON.stringify([4,0,0,0]), '2048 merge [2,0,2,0]');
  console.assert(slideRow([2,0,2,0]).gained === 4, '2048 gained [2,0,2,0]');
  console.assert(JSON.stringify(slideRow([2,2,4,0]).row) === JSON.stringify([4,4,0,0]), '2048 no-chain [2,2,4]');
  console.assert(JSON.stringify(slideRow([4,0,0,0]).row) === JSON.stringify([4,0,0,0]), '2048 single stays');

  // ── Grid helpers ───────────────────────────────────────────────────────────

  function makeEmpty() {
    return [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  }

  function copyGrid(g) {
    return g.map(function (row) { return row.slice(); });
  }

  function gridsEqual(a, b) {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  function transpose(g) {
    var t = makeEmpty();
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        t[c][r] = g[r][c];
      }
    }
    return t;
  }

  function reverseRows(g) {
    return g.map(function (row) { return row.slice().reverse(); });
  }

  // Apply slideRow to every row of g, accumulate gained, return { grid, gained }.
  function slideAllLeft(g) {
    var gained = 0;
    var newGrid = g.map(function (row) {
      var res = slideRow(row);
      gained += res.gained;
      return res.row;
    });
    return { grid: newGrid, gained: gained };
  }

  // Move in any direction; returns { grid, gained, changed }.
  function applyMove(grid, dir) {
    var before = copyGrid(grid);
    var res, result;

    if (dir === 'left') {
      result = slideAllLeft(grid);
    } else if (dir === 'right') {
      // Reverse rows, slide left, reverse back
      res = slideAllLeft(reverseRows(grid));
      result = { grid: reverseRows(res.grid), gained: res.gained };
    } else if (dir === 'up') {
      // Transpose, slide left, transpose back
      res = slideAllLeft(transpose(grid));
      result = { grid: transpose(res.grid), gained: res.gained };
    } else { // down
      // Transpose, reverse rows, slide left, reverse rows back, transpose back
      var t = transpose(grid);
      var tr = reverseRows(t);
      res = slideAllLeft(tr);
      var back = transpose(reverseRows(res.grid));
      result = { grid: back, gained: res.gained };
    }

    return {
      grid: result.grid,
      gained: result.gained,
      changed: !gridsEqual(before, result.grid)
    };
  }

  function emptyCells(grid) {
    var cells = [];
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        if (grid[r][c] === 0) cells.push([r, c]);
      }
    }
    return cells;
  }

  function spawnTile(grid) {
    var cells = emptyCells(grid);
    if (cells.length === 0) return;
    var idx = Math.floor(Math.random() * cells.length);
    var cell = cells[idx];
    grid[cell[0]][cell[1]] = Math.random() < 0.9 ? 2 : 4;
  }

  function isGameOver(grid) {
    if (emptyCells(grid).length > 0) return false;
    var dirs = ['left', 'right', 'up', 'down'];
    for (var i = 0; i < dirs.length; i++) {
      if (applyMove(grid, dirs[i]).changed) return false;
    }
    return true;
  }

  // ── Tile colors ────────────────────────────────────────────────────────────
  var TILE_COLORS = {
    0:    { bg: '#1a1a2e', color: '#1a1a2e' },
    2:    { bg: '#2a2a4e', color: '#ccc' },
    4:    { bg: '#3b2d5f', color: '#ccc' },
    8:    { bg: '#6a2d7a', color: '#eee' },
    16:   { bg: '#a0244e', color: '#fff' },
    32:   { bg: '#c42d2d', color: '#fff' },
    64:   { bg: '#e94560', color: '#fff' },
    128:  { bg: '#d4720a', color: '#fff' },
    256:  { bg: '#e8a020', color: '#fff' },
    512:  { bg: '#c8c020', color: '#1a1a2e' },
    1024: { bg: '#60c060', color: '#1a1a2e' },
    2048: { bg: '#40e0c0', color: '#1a1a2e' }
  };

  function tileColor(val) {
    if (TILE_COLORS[val]) return TILE_COLORS[val];
    // Values beyond 2048
    return { bg: '#a0f0ff', color: '#1a1a2e' };
  }

  // ── Module state ───────────────────────────────────────────────────────────
  var rootEl = null;
  var keyHandler = null;
  var swipeHandle = null;

  var grid = null;
  var score = 0;
  var bestScore = 0;
  var won = false;
  var gameOver = false;

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderGrid(cellEls) {
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 4; c++) {
        var val = grid[r][c];
        var el = cellEls[r * 4 + c];
        var colors = tileColor(val);
        el.textContent = val === 0 ? '' : String(val);
        el.style.background = colors.bg;
        el.style.color = colors.color;
        el.style.fontSize = val >= 1000 ? '20px' : val >= 100 ? '24px' : '28px';
        el.dataset.val = val;
      }
    }
  }

  function renderStatus(scoreEl, bestEl, statusBanner) {
    scoreEl.textContent = score;
    bestEl.textContent = bestScore;
    if (gameOver) {
      statusBanner.textContent = 'Game Over!';
      statusBanner.style.display = 'block';
      statusBanner.style.color = '#e94560';
    } else if (won) {
      statusBanner.textContent = 'You reached 2048! Keep going?';
      statusBanner.style.display = 'block';
      statusBanner.style.color = '#40e0c0';
    } else {
      statusBanner.style.display = 'none';
    }
  }

  function startGame(cellEls, scoreEl, bestEl, statusBanner) {
    grid = makeEmpty();
    score = 0;
    won = false;
    gameOver = false;
    spawnTile(grid);
    spawnTile(grid);
    renderGrid(cellEls);
    renderStatus(scoreEl, bestEl, statusBanner);
  }

  function move(dir, cellEls, scoreEl, bestEl, statusBanner) {
    if (gameOver) return;
    var result = applyMove(grid, dir);
    if (!result.changed) return;
    grid = result.grid;
    score += result.gained;
    if (score > bestScore) bestScore = score;
    spawnTile(grid);
    // Check win (only trigger once)
    if (!won) {
      outer:
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          if (grid[r][c] >= 2048) { won = true; break outer; }
        }
      }
    }
    if (isGameOver(grid)) gameOver = true;
    renderGrid(cellEls);
    renderStatus(scoreEl, bestEl, statusBanner);
  }

  // ── Mount / Unmount ────────────────────────────────────────────────────────

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = [
      '<style>',
      '  .g2048-wrap { text-align: center; user-select: none; }',
      '  .g2048-header { display: flex; justify-content: center; align-items: center; gap: 24px; margin-bottom: 12px; }',
      '  .g2048-score-box { background: #0f0f1e; border: 1px solid #4a4a6a; border-radius: 6px; padding: 6px 16px; min-width: 72px; }',
      '  .g2048-score-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }',
      '  .g2048-score-val { font-size: 22px; font-weight: bold; color: #eaeaea; }',
      '  .g2048-title { font-size: 48px; font-weight: bold; color: #e94560; line-height: 1; }',
      '  .g2048-banner { font-size: 18px; min-height: 24px; margin-bottom: 8px; }',
      '  .g2048-board {',
      '    display: inline-grid;',
      '    grid-template-columns: repeat(4, 72px);',
      '    grid-template-rows: repeat(4, 72px);',
      '    gap: 8px;',
      '    background: #0f0f1e;',
      '    border: 2px solid #4a4a6a;',
      '    border-radius: 8px;',
      '    padding: 8px;',
      '    touch-action: none;',
      '  }',
      '  .g2048-cell {',
      '    width: 72px; height: 72px;',
      '    border-radius: 6px;',
      '    display: flex; align-items: center; justify-content: center;',
      '    font-weight: bold;',
      '    font-size: 28px;',
      '    transition: background 0.08s;',
      '  }',
      '  .g2048-cell[data-val="0"] { box-shadow: inset 0 2px 4px rgba(0,0,0,0.4); }',
      '  .g2048-cell:not([data-val="0"]) { box-shadow: 0 2px 6px rgba(0,0,0,0.5); }',
      '  .g2048-controls { margin-top: 14px; display: flex; gap: 12px; justify-content: center; align-items: center; }',
      '  .g2048-restart {',
      '    padding: 8px 20px; font-size: 15px; cursor: pointer;',
      '    background: #e94560; color: #fff; border: none; border-radius: 6px;',
      '    font-weight: bold;',
      '  }',
      '  .g2048-restart:hover { background: #c73550; }',
      '  .g2048-hint { font-size: 12px; color: #888; }',
      '</style>',
      '<div class="g2048-wrap">',
      '  <div class="g2048-header">',
      '    <div class="g2048-score-box">',
      '      <div class="g2048-score-label">Score</div>',
      '      <div class="g2048-score-val" id="g2048-score">0</div>',
      '    </div>',
      '    <div class="g2048-title">2048</div>',
      '    <div class="g2048-score-box">',
      '      <div class="g2048-score-label">Best</div>',
      '      <div class="g2048-score-val" id="g2048-best">0</div>',
      '    </div>',
      '  </div>',
      '  <div class="g2048-banner" id="g2048-banner" style="display:none"></div>',
      '  <div class="g2048-board" id="g2048-board">',
        Array.from({length: 16}, function () { return '<div class="g2048-cell" data-val="0"></div>'; }).join(''),
      '  </div>',
      '  <div class="g2048-controls">',
      '    <button class="g2048-restart" id="g2048-restart">New Game</button>',
      '    <span class="g2048-hint">Arrow keys or swipe to move</span>',
      '  </div>',
      '</div>'
    ].join('\n');

    container.appendChild(rootEl);

    var cellEls = Array.from(rootEl.querySelectorAll('.g2048-cell'));
    var scoreEl = rootEl.querySelector('#g2048-score');
    var bestEl = rootEl.querySelector('#g2048-best');
    var statusBanner = rootEl.querySelector('#g2048-banner');
    var boardEl = rootEl.querySelector('#g2048-board');
    var restartBtn = rootEl.querySelector('#g2048-restart');

    startGame(cellEls, scoreEl, bestEl, statusBanner);

    keyHandler = function (e) {
      var dirMap = {
        'ArrowLeft': 'left', 'ArrowRight': 'right',
        'ArrowUp': 'up', 'ArrowDown': 'down'
      };
      if (!dirMap[e.key]) return;
      e.preventDefault();
      move(dirMap[e.key], cellEls, scoreEl, bestEl, statusBanner);
    };
    window.addEventListener('keydown', keyHandler);

    swipeHandle = window.MiniGames.controls.onSwipe(boardEl, {
      up:    function () { move('up',    cellEls, scoreEl, bestEl, statusBanner); },
      down:  function () { move('down',  cellEls, scoreEl, bestEl, statusBanner); },
      left:  function () { move('left',  cellEls, scoreEl, bestEl, statusBanner); },
      right: function () { move('right', cellEls, scoreEl, bestEl, statusBanner); }
    });

    restartBtn.addEventListener('click', function () {
      startGame(cellEls, scoreEl, bestEl, statusBanner);
    });
  }

  function unmount() {
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (swipeHandle) { swipeHandle.destroy(); swipeHandle = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    grid = null;
    score = 0;
    won = false;
    gameOver = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames['2048'] = { mount, unmount };
})();
