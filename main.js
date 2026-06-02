// ---------------------------------------------------------------------------
// Audio: unlock on first user gesture (browsers block autoplay before one)
// ---------------------------------------------------------------------------
(function () {
  var gestureHandler = function () {
    if (window.MiniGames && window.MiniGames.audio) {
      window.MiniGames.audio.unlock();
      window.MiniGames.audio.play('menu');
    }
    document.removeEventListener('pointerdown', gestureHandler);
    document.removeEventListener('click', gestureHandler);
  };
  document.addEventListener('pointerdown', gestureHandler);
  document.addEventListener('click', gestureHandler);
})();

// ---------------------------------------------------------------------------
// Intro overlay
// ---------------------------------------------------------------------------
var introOverlay = document.getElementById('intro-overlay');
if (introOverlay) {
  var dismiss = function () {
    introOverlay.classList.add('dismissed');
    // Clicking the overlay also counts as a gesture — audio is handled by the
    // one-time document listener above, which will fire before this.
  };
  introOverlay.addEventListener('click', dismiss);
  setTimeout(function () { introOverlay.remove(); }, 10000);
}

// ---------------------------------------------------------------------------
// Menu / game lifecycle
// ---------------------------------------------------------------------------
var menu          = document.getElementById('menu');
var gameContainer = document.getElementById('game-container');
var backButton    = document.getElementById('back-button');
var muteButton    = document.getElementById('mute-button');

var currentGame = null;

function launchGame(name) {
  var game = window.MiniGames && window.MiniGames[name];
  if (!game) {
    console.warn('No game registered for', name);
    return;
  }
  currentGame = game;
  menu.style.display = 'none';
  gameContainer.classList.add('active');
  backButton.hidden = false;
  game.mount(gameContainer);
  if (window.MiniGames && window.MiniGames.audio) {
    window.MiniGames.audio.play(name);
  }
}

function returnToMenu() {
  if (currentGame) {
    currentGame.unmount();
    currentGame = null;
  }
  gameContainer.classList.remove('active');
  gameContainer.innerHTML = '';
  backButton.hidden = true;
  menu.style.display = 'grid';
  if (window.MiniGames && window.MiniGames.audio) {
    window.MiniGames.audio.play('menu');
  }
}

menu.addEventListener('click', function (e) {
  var btn = e.target.closest('.menu-btn');
  if (!btn) return;
  launchGame(btn.dataset.game);
});

backButton.addEventListener('click', returnToMenu);

// ---------------------------------------------------------------------------
// Mute button
// ---------------------------------------------------------------------------
if (muteButton) {
  muteButton.addEventListener('click', function () {
    var audio = window.MiniGames && window.MiniGames.audio;
    if (!audio) return;
    audio.unlock(); // clicking mute also counts as a gesture
    var nowMuted = audio.toggleMute();
    muteButton.textContent = nowMuted ? '🔇' : '♪';
    muteButton.setAttribute('aria-label', nowMuted ? 'Unmute music' : 'Mute music');
  });
}
