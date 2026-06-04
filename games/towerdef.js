(function () {
  // ===========================================================================
  // Tower Defense — place towers along a fixed S-path to stop 10 waves of
  // enemies before they leak out the far end. Three tower types, an economy,
  // 20 lives. Build during prep with the Start Wave button. Click/tap a buildable
  // tile to place the selected tower. Module contract: mount / unmount.
  // ===========================================================================
  var COLS = 16, ROWS = 12, CELL = 40;
  var W = COLS * CELL, H = ROWS * CELL;

  // Path waypoints in cell coords (some off-grid for clean enter/exit).
  var WP_CELL = [[-1,1],[14,1],[14,4],[1,4],[1,7],[14,7],[14,10],[-1,10]];
  var WP = WP_CELL.map(function (c) { return { x: c[0] * CELL + CELL / 2, y: c[1] * CELL + CELL / 2 }; });

  var TOWERS = {
    rapid:  { name: 'Rapid',  cost: 20, range: 95,  dmg: 6,  rate: 4.0, pspeed: 340, color: '#5ad1ff' },
    sniper: { name: 'Sniper', cost: 60, range: 210, dmg: 32, rate: 0.8, pspeed: 520, color: '#b07bff' },
    frost:  { name: 'Frost',  cost: 45, range: 105, dmg: 3,  rate: 1.6, pspeed: 320, color: '#4caf50', slow: 1.2 }
  };

  var rootEl = null, canvas = null, ctx = null, statusEl = null, startBtn = null;
  var towerBtns = {}, rafId = null, last = 0, pointerHandler = null;
  var pathSet, enemies, towers, shots, money, lives, waveNum, phase, selected;
  var spawnLeft, spawnTimer, waveCfg;

  function buildPathSet() {
    pathSet = {};
    for (var i = 0; i < WP_CELL.length - 1; i++) {
      var a = WP_CELL[i], b = WP_CELL[i + 1];
      if (a[1] === b[1]) {
        var lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
        for (var c = lo; c <= hi; c++) if (c >= 0 && c < COLS) pathSet[c + ',' + a[1]] = true;
      } else {
        var lo2 = Math.min(a[1], b[1]), hi2 = Math.max(a[1], b[1]);
        for (var r = lo2; r <= hi2; r++) if (r >= 0 && r < ROWS) pathSet[a[0] + ',' + r] = true;
      }
    }
  }

  function waveConfig(n) {
    return {
      count: 6 + n * 2,
      hp: 18 + n * 14,
      speed: 42 + n * 3,
      reward: 4 + n,
      gap: Math.max(0.35, 0.9 - n * 0.05)
    };
  }

  function resetGame() {
    buildPathSet();
    enemies = []; towers = []; shots = [];
    money = 100; lives = 20; waveNum = 1; phase = 'prep';
    selected = 'rapid';
    spawnLeft = 0; spawnTimer = 0; waveCfg = null;
  }

  function startWave() {
    if (phase !== 'prep') return;
    waveCfg = waveConfig(waveNum);
    spawnLeft = waveCfg.count;
    spawnTimer = 0;
    phase = 'wave';
  }

  function spawnEnemy() {
    enemies.push({
      x: WP[0].x, y: WP[0].y, wp: 0,
      hp: waveCfg.hp, maxhp: waveCfg.hp,
      speed: waveCfg.speed, reward: waveCfg.reward, slow: 0
    });
  }

  function cellOf(px, py) { return { col: Math.floor(px / CELL), row: Math.floor(py / CELL) }; }
  function isBuildable(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
    if (pathSet[col + ',' + row]) return false;
    for (var i = 0; i < towers.length; i++) if (towers[i].col === col && towers[i].row === row) return false;
    return true;
  }

  function placeTower(col, row) {
    var t = TOWERS[selected];
    if (!isBuildable(col, row) || money < t.cost) return;
    money -= t.cost;
    towers.push({
      col: col, row: row, x: col * CELL + CELL / 2, y: row * CELL + CELL / 2,
      type: selected, range: t.range, dmg: t.dmg, rate: t.rate,
      pspeed: t.pspeed, color: t.color, slow: t.slow || 0, cool: 0
    });
  }

  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  function update(dt) {
    if (phase === 'over' || phase === 'win') return;

    // Spawning
    if (phase === 'wave' && spawnLeft > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnEnemy(); spawnLeft--; spawnTimer = waveCfg.gap; }
    }

    // Enemies along the path
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      var sp = e.speed * (e.slow > 0 ? 0.5 : 1);
      if (e.slow > 0) e.slow -= dt;
      var tgt = WP[e.wp + 1];
      var d = dist(e.x, e.y, tgt.x, tgt.y);
      var step = sp * dt;
      if (step >= d) {
        e.x = tgt.x; e.y = tgt.y; e.wp++;
        if (e.wp >= WP.length - 1) { e.leaked = true; lives--; }
      } else {
        e.x += (tgt.x - e.x) / d * step;
        e.y += (tgt.y - e.y) / d * step;
      }
    }
    enemies = enemies.filter(function (e) { return !e.leaked && e.hp > 0; });
    if (lives <= 0) { phase = 'over'; if (window.MiniGames.scores) window.MiniGames.scores.submit('towerdef', waveNum); return; }

    // Towers fire
    for (var j = 0; j < towers.length; j++) {
      var tw = towers[j];
      tw.cool -= dt;
      if (tw.cool > 0) continue;
      var target = null, bestD = Infinity;
      for (var k = 0; k < enemies.length; k++) {
        var dd = dist(tw.x, tw.y, enemies[k].x, enemies[k].y);
        if (dd <= tw.range && dd < bestD) { bestD = dd; target = enemies[k]; }
      }
      if (target) {
        shots.push({ x: tw.x, y: tw.y, target: target, speed: tw.pspeed, dmg: tw.dmg, slow: tw.slow, color: tw.color });
        tw.cool = 1 / tw.rate;
      }
    }

    // Projectiles home to their target
    for (var s = 0; s < shots.length; s++) {
      var p = shots[s];
      if (!p.target || p.target.hp <= 0 || p.target.leaked) { p.dead = true; continue; }
      var pd = dist(p.x, p.y, p.target.x, p.target.y);
      var pstep = p.speed * dt;
      if (pstep >= pd) {
        p.target.hp -= p.dmg;
        if (p.slow) p.target.slow = p.slow;
        if (p.target.hp <= 0) money += p.target.reward;
        p.dead = true;
      } else {
        p.x += (p.target.x - p.x) / pd * pstep;
        p.y += (p.target.y - p.y) / pd * pstep;
      }
    }
    shots = shots.filter(function (p) { return !p.dead; });
    enemies = enemies.filter(function (e) { return e.hp > 0; });

    // Wave cleared?
    if (phase === 'wave' && spawnLeft === 0 && enemies.length === 0) {
      if (waveNum >= 10) { phase = 'win'; if (window.MiniGames.scores) window.MiniGames.scores.submit('towerdef', 10); }
      else { waveNum++; phase = 'prep'; money += 15; }
    }
  }

  function draw() {
    ctx.fillStyle = '#0f1f17'; ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = '#16302a'; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = 0; x <= COLS; x++) { ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); }
    for (var y = 0; y <= ROWS; y++) { ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); }
    ctx.stroke();

    // path
    ctx.fillStyle = '#4a3f2a';
    for (var key in pathSet) {
      var cr = key.split(','); ctx.fillRect(cr[0] * CELL, cr[1] * CELL, CELL, CELL);
    }

    // towers + range of selected-type tiles
    for (var i = 0; i < towers.length; i++) {
      var tw = towers[i];
      ctx.fillStyle = tw.color;
      ctx.fillRect(tw.x - 14, tw.y - 14, 28, 28);
      ctx.fillStyle = '#0f0f1e';
      ctx.beginPath(); ctx.arc(tw.x, tw.y, 6, 0, Math.PI * 2); ctx.fill();
    }

    // projectiles
    for (var s = 0; s < shots.length; s++) {
      ctx.fillStyle = shots[s].color;
      ctx.beginPath(); ctx.arc(shots[s].x, shots[s].y, 4, 0, Math.PI * 2); ctx.fill();
    }

    // enemies + hp bars
    for (var e = 0; e < enemies.length; e++) {
      var en = enemies[e];
      ctx.fillStyle = en.slow > 0 ? '#7fd4ff' : '#ff5773';
      ctx.beginPath(); ctx.arc(en.x, en.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.fillRect(en.x - 13, en.y - 19, 26, 4);
      ctx.fillStyle = '#4caf50'; ctx.fillRect(en.x - 13, en.y - 19, 26 * Math.max(0, en.hp / en.maxhp), 4);
    }

    if (phase === 'over' || phase === 'win') {
      ctx.fillStyle = 'rgba(0,0,0,0.66)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = phase === 'win' ? '#4caf50' : '#ff5773';
      ctx.font = 'bold 34px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(phase === 'win' ? 'Victory!' : 'Defenses Overrun', W / 2, H / 2 - 6);
      ctx.fillStyle = '#fff'; ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Reached wave ' + waveNum + ' — tap Restart', W / 2, H / 2 + 24);
      ctx.textAlign = 'left';
    }

    statusEl.textContent = '❤ ' + Math.max(0, lives) + '    💰 ' + money + '    Wave ' + Math.min(waveNum, 10) + '/10';

    // start/restart button state
    if (phase === 'prep') { startBtn.textContent = '▶ Start Wave ' + waveNum; startBtn.disabled = false; }
    else if (phase === 'wave') { startBtn.textContent = 'Wave ' + waveNum + ' incoming…'; startBtn.disabled = true; }
    else { startBtn.textContent = '↻ Restart'; startBtn.disabled = false; }

    for (var t in towerBtns) {
      towerBtns[t].classList.toggle('td-sel', t === selected);
      towerBtns[t].disabled = money < TOWERS[t].cost && phase !== 'over' && phase !== 'win';
    }
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
      '.td-wrap { text-align: center; }' +
      '.td-status { font-size: 16px; margin-bottom: 10px; min-height: 22px; }' +
      '.td-canvas { background: #0f1f17; border: 2px solid #4a4a6a; border-radius: 4px; max-width: 100%; height: auto; touch-action: none; cursor: crosshair; }' +
      '.td-bar { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }' +
      '.td-btn { padding: 8px 12px; font-size: 14px; color: #fff; background: #2a2a3e; border: 2px solid #3a3a5a; border-radius: 8px; cursor: pointer; }' +
      '.td-btn.td-sel { border-color: #fff; }' +
      '.td-btn:disabled { opacity: 0.45; cursor: default; }' +
      '.td-start { padding: 8px 14px; font-size: 14px; color: #fff; background: #e94560; border: none; border-radius: 8px; cursor: pointer; }' +
      '.td-start:disabled { opacity: 0.55; cursor: default; }' +
      '.td-hint { font-size: 12px; color: #888; margin-top: 8px; }' +
      '</style>' +
      '<div class="td-wrap">' +
      '<div class="td-status"></div>' +
      '<canvas class="td-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<div class="td-bar">' +
        '<button class="td-btn" data-tw="rapid">Rapid $20</button>' +
        '<button class="td-btn" data-tw="sniper">Sniper $60</button>' +
        '<button class="td-btn" data-tw="frost">Frost $45</button>' +
        '<button class="td-start"></button>' +
      '</div>' +
      '<div class="td-hint">Pick a tower, then click a tile to build. Stop the enemies before they leak!</div>' +
      '</div>';
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.td-canvas');
    ctx = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.td-status');
    startBtn = rootEl.querySelector('.td-start');

    resetGame();
    last = 0;

    rootEl.querySelectorAll('.td-btn').forEach(function (b) {
      towerBtns[b.dataset.tw] = b;
      b.addEventListener('click', function () { selected = b.dataset.tw; });
    });
    startBtn.addEventListener('click', function () {
      if (phase === 'over' || phase === 'win') resetGame();
      else startWave();
    });

    pointerHandler = function (ev) {
      if (phase === 'over' || phase === 'win') { resetGame(); return; }
      var rect = canvas.getBoundingClientRect();
      var sx = canvas.width / rect.width, sy = canvas.height / rect.height;
      var px = (ev.clientX - rect.left) * sx, py = (ev.clientY - rect.top) * sy;
      var c = cellOf(px, py);
      placeTower(c.col, c.row);
      ev.preventDefault();
    };
    canvas.addEventListener('pointerdown', pointerHandler);

    rafId = requestAnimationFrame(loop);
  }

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (canvas && pointerHandler) canvas.removeEventListener('pointerdown', pointerHandler);
    pointerHandler = null; towerBtns = {};
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null; statusEl = null; startBtn = null;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.towerdef = { mount: mount, unmount: unmount };
})();
