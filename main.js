const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backButton = document.getElementById('back-button');

let currentGame = null;

const gameModules = {
  snake: () => import('./games/snake.js'),
  pong: () => import('./games/pong.js'),
  tictactoe: () => import('./games/tictactoe.js'),
  memory: () => import('./games/memory.js'),
  flappy: () => import('./games/flappy.js'),
};

async function launchGame(name) {
  const loader = gameModules[name];
  if (!loader) return;
  const module = await loader();
  currentGame = module;
  menu.style.display = 'none';
  gameContainer.classList.add('active');
  backButton.hidden = false;
  module.mount(gameContainer);
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
