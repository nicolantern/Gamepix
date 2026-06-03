(function () {
  // ===========================================================================
  // Doodle Jump — auto-bounce ever upward, steer left/right (wrapping around the
  // screen edges), land on platforms to bounce again. The world scrolls down as
  // you climb; score = height. Fall off the bottom and it's over.
  // Module contract: mount(container) / unmount().
  // ===========================================================================
  var W = 360, H = 560;
  var PW = 64, PH = 14;            // platform size
  var DW = 34, DH = 34;            // doodler size
  var GRAVITY = 1500, JUMP = 680;  // px/s^2, px/s
  var MOVE = 340;                  // horizontal speed (px/s)
  var CAM = H * 0.42;              // keep the doodler around this screen height

  var rootEl = null, canvas = null, ctx = null, statusEl = null;
  var rafId = null, last = 0, keyHandler = null, upHandler = null, touch = null;
  var doodler, platforms, climb, score, best = 0, state;
  var keys = { left: false, right: false };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawnAt(y) {
    var moving = Math.random() < 0.18 && score > 300; // moving platforms once you're higher
    platforms.push({
      x: rand(0, W - PW), y: y, w: PW, h: PH,
      vx: moving ? (Math.random() < 0.5 ? -1 : 1) * rand(40, 90) : 0
    });
  }

  function fillUp() {
    var minY = H;
    for (var i = 0; i < platforms.length; i++) minY = Math.min(minY, platforms[i].y);
    while (minY > -10) { minY -= rand(62, 96); spawnAt(minY); }
  }

  function newGame() {
    platforms = [];
    platforms.push({ x: W / 2 - PW / 2, y: H - 40, w: PW, h: PH, vx: 0 }); // start pad
    var y = H - 40;
    while (y > -10) { y -= rand(62, 96); spawnAt(y); }
    doodler = { x: W / 2 - DW / 2, y: H - 80, vx: 0, vy: -JUMP };
    climb = 0; score = 0; state = 'play';
  }

  function update(dt) {
    if (state !== 'play') return;

    // Horizontal (keyboard tilt; touch nudges handled in the dpad handlers)
    var tilt = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    doodler.x += tilt * MOVE * dt;
    if (doodler.x + DW < 0) doodler.x = W;
    if (doodler.x > W) doodler.x = -DW;

    // Gravity
    doodler.vy += GRAVITY * dt;
    doodler.y += doodler.vy * dt;

    // Moving platforms
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      if (p.vx) {
        p.x += p.vx * dt;
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x + p.w > W) { p.x = W - p.w; p.vx *= -1; }
      }
    }

    // Bounce when falling onto a platform top
    if (doodler.vy > 0) {
      var feet = doodler.y + DH;
      for (var j = 0; j < platforms.length; j++) {
        var pl = platforms[j];
        if (feet >= pl.y && feet <= pl.y + pl.h + 14 &&
            doodler.x + DW > pl.x && doodler.x < pl.x + pl.w) {
          doodler.vy = -JUMP;
          break;
        }
      }
    }

    // Camera: keep doodler near CAM, scroll the world down as it climbs
    if (doodler.y < CAM) {
      var dy = CAM - doodler.y;
      doodler.y = CAM;
      for (var k = 0; k < platforms.length; k++) platforms[k].y += dy;
      climb += dy;
      score = Math.max(score, Math.floor(climb / 10));
    }

    // Recycle platforms that scrolled off the bottom, keep the top filled
    platforms = platforms.filter(function (p) { return p.y < H + 20; });
    fillUp();

    // Fall off the bottom → game over
    if (doodler.y > H + 20) { state = 'over'; best = Math.max(best, score); }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = '#16162a'; ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      ctx.fillStyle = p.vx ? '#5ad1ff' : '#4caf50';
      roundRect(p.x, p.y, p.w, p.h, 5);
    }

    // Doodler (+ wrapped twin near edges so the wrap reads cleanly)
    drawDoodler(doodler.x);
    if (doodler.x > W - DW) drawDoodler(doodler.x - W);
    if (doodler.x < 0) drawDoodler(doodler.x + W);

    if (state === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText('Game Over', W / 2, H / 2 - 8);
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('Score: ' + score + '   Best: ' + best, W / 2, H / 2 + 20);
      ctx.textAlign = 'left';
    }

    statusEl.textContent = state === 'over'
      ? 'Game over — Score: ' + score + '. Press Space / tap to restart.'
      : 'Score: ' + score + '    Best: ' + best;
  }

  function drawDoodler(x) {
    var y = doodler.y;
    ctx.fillStyle = '#ffd23f';
    roundRect(x, y, DW, DH, 8);
    ctx.fillStyle = '#0f0f1e';
    ctx.fillRect(x + 8, y + 10, 4, 4);
    ctx.fillRect(x + DW - 12, y + 10, 4, 4);
  }

  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function nudge(dir) { // touch: discrete sideways hop
    doodler.x += dir * 22;
    if (doodler.x + DW < 0) doodler.x = W;
    if (doodler.x > W) doodler.x = -DW;
  }

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML =
      '<style>' +
      '.dj-wrap { text-align: center; }' +
      '.dj-status { font-size: 16px; margin-bottom: 12px; min-height: 22px; }' +
      '.dj-canvas { background: #16162a; border: 2px solid #4a4a6a; border-radius: 4px; max-width: 100%; height: auto; touch-action: none; }' +
      '.dj-hint { font-size: 12px; color: #888; margin-top: 8px; }' +
      '</style>' +
      '<div class="dj-wrap">' +
      '<div class="dj-status"></div>' +
      '<canvas class="dj-canvas" width="' + W + '" height="' + H + '"></canvas>' +
      '<div class="dj-hint">← → / A D to steer — you bounce automatically</div>' +
      '</div>';
    container.appendChild(rootEl);

    canvas = rootEl.querySelector('.dj-canvas');
    ctx = canvas.getContext('2d');
    statusEl = rootEl.querySelector('.dj-status');

    newGame();
    last = 0;

    keyHandler = function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; e.preventDefault(); }
      else if (k === ' ') { if (state === 'over') newGame(); e.preventDefault(); }
    };
    upHandler = function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
      if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    };
    window.addEventListener('keydown', keyHandler);
    window.addEventListener('keyup', upHandler);

    if (window.MiniGames && window.MiniGames.controls) {
      touch = window.MiniGames.controls.create(container, {
        dpad: { left: function () { nudge(-1); }, right: function () { nudge(1); } },
        hold: true
      });
    }

    rafId = requestAnimationFrame(loop);
  }

  function unmount() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    if (upHandler) { window.removeEventListener('keyup', upHandler); upHandler = null; }
    if (touch) { touch.destroy(); touch = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    canvas = null; ctx = null; statusEl = null;
    keys.left = keys.right = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.doodle = { mount: mount, unmount: unmount };
})();
