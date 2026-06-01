const menu = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const backButton = document.getElementById('back-button');

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('.menu-btn');
  if (!btn) return;
  const gameName = btn.dataset.game;
  console.log('Selected game:', gameName);
});

backButton.addEventListener('click', () => {
  console.log('Back clicked');
});
