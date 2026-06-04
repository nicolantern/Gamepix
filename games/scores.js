(function () {
  // ===========================================================================
  // Gamepix scores — LOCAL high scores now, designed to swap to a CLOUD backend
  // (accounts + leaderboard) later WITHOUT touching any game.
  //
  // Games call:  MiniGames.scores.submit(id, score)  once at game over.
  // The UI reads via allBests() / best(id). Everything is async (Promise) so a
  // future networked backend is a true drop-in — only the `backend` object below
  // changes (swap LocalBackend → a CloudBackend with the same load/save shape).
  // ===========================================================================
  var PROFILE_KEY = 'gamepix.profile.v1';
  var SCORES_KEY  = 'gamepix.scores.v1';

  // Scored games (higher = better). fmt optionally formats the displayed value.
  var SCORED = [
    { id: 'snake',     title: 'Snake' },
    { id: 'flappy',    title: 'Flappy Bird' },
    { id: 'breakout',  title: 'Breakout' },
    { id: '2048',      title: '2048' },
    { id: 'whack',     title: 'Whack-a-Mole' },
    { id: 'dino',      title: 'Dino Run' },
    { id: 'tetris',    title: 'Tetris' },
    { id: 'invaders',  title: 'Space Invaders' },
    { id: 'asteroids', title: 'Asteroids' },
    { id: 'pacman',    title: 'Pac-Man' },
    { id: 'frogger',   title: 'Frogger' },
    { id: 'doodle',    title: 'Doodle Jump' },
    { id: 'towerdef',  title: 'Tower Defense', fmt: function (v) { return 'Wave ' + v; } }
  ];
  var SCORED_IDS = {}; SCORED.forEach(function (s) { SCORED_IDS[s.id] = s; });

  // --- Local backend: the ONLY piece a cloud version would replace ----------
  var LocalBackend = {
    load: function () {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(SCORES_KEY)) || {}); }
      catch (e) { return Promise.resolve({}); }
    },
    save: function (obj) {
      try { localStorage.setItem(SCORES_KEY, JSON.stringify(obj)); } catch (e) {}
      return Promise.resolve();
    }
  };
  var backend = LocalBackend;

  function getName() {
    try { return (JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}).name || 'Player'; }
    catch (e) { return 'Player'; }
  }
  function setName(n) {
    n = String(n || '').trim().slice(0, 20) || 'Player';
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: n })); } catch (e) {}
    return n;
  }

  function allBests() { return backend.load(); }
  function best(id) { return backend.load().then(function (s) { return (id in s) ? s[id] : null; }); }

  // Serialize writes through a queue so concurrent submits can't clobber each
  // other's load→modify→save (matters most once the backend is networked/async).
  var queue = Promise.resolve();
  function submit(id, score) {
    if (!SCORED_IDS[id]) return Promise.resolve({ best: null, isNewBest: false });
    score = Math.floor(score) || 0;
    var run = queue.then(function () {
      return backend.load().then(function (s) {
        var prev = (id in s) ? s[id] : -Infinity;
        if (score > prev) {
          s[id] = score;
          return backend.save(s).then(function () { return { best: score, isNewBest: true }; });
        }
        return { best: prev, isNewBest: false };
      });
    });
    queue = run.catch(function () {}); // keep the chain alive even if one write fails
    return run;
  }

  // --- High Scores modal -----------------------------------------------------
  var modal, listEl, nameInput;
  function buildModal() {
    modal = document.createElement('div');
    modal.id = 'scores-modal';
    modal.className = 'info-modal'; // reuse the overlay/card styling
    modal.hidden = true;
    modal.innerHTML =
      '<div class="info-backdrop"></div>' +
      '<div class="info-card" role="dialog" aria-modal="true" aria-label="High scores">' +
        '<button class="info-close" aria-label="Close">×</button>' +
        '<h2>🏆 High Scores</h2>' +
        '<label class="sc-name">Player&nbsp; <input id="sc-name-input" maxlength="20" /></label>' +
        '<dl class="sc-list"></dl>' +
      '</div>';
    document.body.appendChild(modal);
    listEl = modal.querySelector('.sc-list');
    nameInput = modal.querySelector('#sc-name-input');
    modal.querySelector('.info-close').addEventListener('click', close);
    modal.querySelector('.info-backdrop').addEventListener('click', close);
    nameInput.addEventListener('change', function () { nameInput.value = setName(nameInput.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });
  }
  function open() {
    nameInput.value = getName();
    allBests().then(function (s) {
      listEl.innerHTML = SCORED.map(function (g) {
        var v = (g.id in s) ? (g.fmt ? g.fmt(s[g.id]) : s[g.id]) : '—';
        return '<dt>' + g.title + '</dt><dd>' + v + '</dd>';
      }).join('');
    });
    modal.hidden = false;
  }
  function close() { modal.hidden = true; }

  function init() {
    buildModal();
    var btn = document.getElementById('scores-button');
    if (btn) btn.addEventListener('click', open);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.scores = {
    getName: getName, setName: setName,
    best: best, submit: submit, allBests: allBests,
    openHighScores: open,
    setBackend: function (b) { backend = b; } // cloud swap-in point
  };
})();
