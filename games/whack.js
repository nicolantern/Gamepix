(function () {
  // ── state ──────────────────────────────────────────────────────────────────
  let rootEl      = null;
  let score       = 0;
  let timeLeft    = 30;
  let gameActive  = false;

  // Every timer id we create gets pushed here so unmount() can clear all of them.
  let timerIds    = [];

  // Per-hole auto-retract timeout ids, indexed 0–8 (null when no mole present).
  let retractIds  = [null,null,null,null,null,null,null,null,null];

  // Which holes currently have a raised mole.
  let moleBits    = [false,false,false,false,false,false,false,false,false];

  // Ref to the recurring spawn scheduler's *current* timeout id (also pushed to timerIds).
  let spawnId     = null;

  // Ref to the countdown interval id.
  let countdownId = null;

  // DOM refs set during mount.
  let holeEls     = [];
  let statusEl    = null;
  let hintEl      = null;

  // ── helpers ────────────────────────────────────────────────────────────────

  function trackTimer(id) {
    timerIds.push(id);
    return id;
  }

  /** Clear every timer we have ever scheduled, including retract timers. */
  function clearAllTimers() {
    timerIds.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    timerIds = [];
    retractIds.forEach(function (id) { if (id !== null) { clearTimeout(id); } });
    retractIds = [null,null,null,null,null,null,null,null,null];
    spawnId     = null;
    countdownId = null;
  }

  /** Current spawn interval in ms, linearly interpolated from 800 → 350 ms. */
  function spawnInterval() {
    // timeLeft goes 30 → 0; as it shrinks, interval shrinks.
    var t = timeLeft / 30; // 1 at start, 0 at end
    return Math.round(350 + t * (800 - 350)); // 800 ms at t=1, 350 ms at t=0
  }

  /** Pick a random hole that currently has no mole. Returns -1 if all full. */
  function randomEmptyHole() {
    var empty = [];
    for (var i = 0; i < 9; i++) { if (!moleBits[i]) empty.push(i); }
    if (empty.length === 0) return -1;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function raiseMole(idx) {
    moleBits[idx] = true;
    holeEls[idx].classList.add('wam-hole--active');

    // Auto-retract after 600–1100 ms.
    var stayMs = 600 + Math.floor(Math.random() * 500);
    var rid = setTimeout(function () {
      // Remove from timerIds list (keeps it from growing unbounded on long games).
      var pos = timerIds.indexOf(rid);
      if (pos !== -1) timerIds.splice(pos, 1);
      retractIds[idx] = null;
      retractMole(idx, false);
    }, stayMs);
    trackTimer(rid);
    retractIds[idx] = rid;
  }

  /** Retract mole at idx. If `scored` is true, record a hit. */
  function retractMole(idx, scored) {
    moleBits[idx] = false;
    holeEls[idx].classList.remove('wam-hole--active');
    if (scored) {
      score += 1;
      updateStatus();
    }
  }

  function updateStatus() {
    if (!statusEl) return;
    statusEl.textContent = 'Score: ' + score + '    Time: ' + timeLeft + 's';
  }

  // ── spawn scheduler ────────────────────────────────────────────────────────
  // Uses self-rescheduling setTimeout so the interval can adapt each cycle.

  function scheduleNextSpawn() {
    if (!gameActive) return;
    var delay = spawnInterval();
    spawnId = setTimeout(function () {
      // Remove from timerIds since it fired.
      var pos = timerIds.indexOf(spawnId);
      if (pos !== -1) timerIds.splice(pos, 1);
      spawnId = null;
      if (!gameActive) return;
      var idx = randomEmptyHole();
      if (idx !== -1) raiseMole(idx);
      scheduleNextSpawn(); // reschedule with possibly updated interval
    }, delay);
    trackTimer(spawnId);
  }

  // ── countdown ──────────────────────────────────────────────────────────────

  function startCountdown() {
    countdownId = setInterval(function () {
      timeLeft -= 1;
      updateStatus();
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
    trackTimer(countdownId);
  }

  // ── game lifecycle ─────────────────────────────────────────────────────────

  function startGame() {
    // Clear any timers from a previous game before starting fresh.
    clearAllTimers();

    score      = 0;
    timeLeft   = 30;
    gameActive = true;
    moleBits   = [false,false,false,false,false,false,false,false,false];

    // Clear all hole visual states.
    holeEls.forEach(function (el) { el.classList.remove('wam-hole--active'); });

    // Hide restart button if visible.
    var restartBtn = rootEl.querySelector('.wam-restart');
    if (restartBtn) restartBtn.hidden = true;

    updateStatus();
    if (hintEl) hintEl.textContent = 'Click the moles!';

    startCountdown();
    scheduleNextSpawn();
  }

  function endGame() {
    gameActive = false;
    clearAllTimers();

    // Retract all visible moles without scoring.
    for (var i = 0; i < 9; i++) {
      if (moleBits[i]) {
        moleBits[i] = false;
        holeEls[i].classList.remove('wam-hole--active');
      }
    }

    if (window.MiniGames.scores) window.MiniGames.scores.submit('whack', score);
    if (statusEl) statusEl.textContent = "Time's up!  Score: " + score;
    if (hintEl) hintEl.textContent = '';

    var restartBtn = rootEl.querySelector('.wam-restart');
    if (restartBtn) restartBtn.hidden = false;
  }

  // ── mount / unmount ────────────────────────────────────────────────────────

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = [
      '<style>',
      '  .wam-wrap { text-align: center; user-select: none; }',
      '  .wam-status { font-size: 18px; margin-bottom: 12px; min-height: 24px; }',
      '  .wam-grid {',
      '    display: inline-grid;',
      '    grid-template-columns: repeat(3, 90px);',
      '    gap: 10px;',
      '    background: #0f0f1e;',
      '    border: 2px solid #4a4a6a;',
      '    border-radius: 8px;',
      '    padding: 12px;',
      '  }',
      '  .wam-hole {',
      '    width: 90px; height: 90px;',
      '    background: #1a1a2e;',
      '    border: 2px solid #2e2e4e;',
      '    border-radius: 50%;',
      '    display: flex; align-items: center; justify-content: center;',
      '    cursor: pointer;',
      '    transition: background 0.1s;',
      '    box-sizing: border-box;',
      '  }',
      '  .wam-hole:hover { background: #222240; }',
      '  /* mole — a colored circle inside the hole */',
      '  .wam-hole::after {',
      '    content: "";',
      '    width: 56px; height: 56px;',
      '    border-radius: 50%;',
      '    background: #4caf50;',
      '    box-shadow: 0 0 8px #4caf5088;',
      '    transform: scale(0);',
      '    transition: transform 0.12s ease-out;',
      '    display: block;',
      '  }',
      '  .wam-hole--active::after { transform: scale(1); }',
      '  .wam-hint { font-size: 12px; color: #888; margin-top: 8px; min-height: 16px; }',
      '  .wam-restart {',
      '    margin-top: 14px;',
      '    padding: 8px 20px;',
      '    font-size: 16px;',
      '    background: #e94560;',
      '    color: #fff;',
      '    border: none;',
      '    border-radius: 4px;',
      '    cursor: pointer;',
      '  }',
      '  .wam-restart:hover { background: #c73652; }',
      '</style>',
      '<div class="wam-wrap">',
      '  <div class="wam-status"></div>',
      '  <div class="wam-grid">',
      '    <div class="wam-hole" data-idx="0"></div>',
      '    <div class="wam-hole" data-idx="1"></div>',
      '    <div class="wam-hole" data-idx="2"></div>',
      '    <div class="wam-hole" data-idx="3"></div>',
      '    <div class="wam-hole" data-idx="4"></div>',
      '    <div class="wam-hole" data-idx="5"></div>',
      '    <div class="wam-hole" data-idx="6"></div>',
      '    <div class="wam-hole" data-idx="7"></div>',
      '    <div class="wam-hole" data-idx="8"></div>',
      '  </div>',
      '  <div class="wam-hint">Click the moles!</div>',
      '  <button class="wam-restart" hidden>Restart</button>',
      '</div>'
    ].join('\n');

    container.appendChild(rootEl);

    statusEl = rootEl.querySelector('.wam-status');
    hintEl   = rootEl.querySelector('.wam-hint');
    holeEls  = Array.from(rootEl.querySelectorAll('.wam-hole'));

    // Click handler on the grid (event delegation).
    rootEl.querySelector('.wam-grid').addEventListener('click', function (e) {
      if (!gameActive) return;
      var hole = e.target.closest('.wam-hole');
      if (!hole) return;
      var idx = Number(hole.dataset.idx);
      if (!moleBits[idx]) return; // empty hole — no action
      // Cancel the auto-retract timer for this hole.
      if (retractIds[idx] !== null) {
        clearTimeout(retractIds[idx]);
        var pos = timerIds.indexOf(retractIds[idx]);
        if (pos !== -1) timerIds.splice(pos, 1);
        retractIds[idx] = null;
      }
      retractMole(idx, true);
    });

    rootEl.querySelector('.wam-restart').addEventListener('click', function () {
      startGame();
    });

    startGame();
  }

  function unmount() {
    clearAllTimers();
    gameActive = false;
    if (rootEl) { rootEl.remove(); rootEl = null; }
    holeEls  = [];
    statusEl = null;
    hintEl   = null;
    score    = 0;
    timeLeft = 30;
    moleBits = [false,false,false,false,false,false,false,false,false];
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.whack = { mount, unmount };
})();
