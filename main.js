const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backButton = document.getElementById('back-button');

let currentGame = null;

function launchGame(name) {
  const game = window.MiniGames && window.MiniGames[name];
  if (!game) {
    console.warn('No game registered for', name);
    return;
  }
  currentGame = game;
  menu.style.display = 'none';
  gameContainer.classList.add('active');
  backButton.hidden = false;
  game.mount(gameContainer);
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
}

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-btn');
  if (!btn) return;
  launchGame(btn.dataset.game);
});

backButton.addEventListener('click', returnToMenu);
