(function () {
  const WIN_LINES = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6],
  ];

  let rootEl = null;
  let board = [];
  let currentPlayer = 'X';
  let gameOver = false;

  function findWinner() {
    for (const [a,b,c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  function render(statusEl, cellEls) {
    cellEls.forEach((el, i) => {
      el.textContent = board[i] || '';
      el.classList.toggle('taken', !!board[i]);
    });
    const winner = findWinner();
    if (winner) {
      statusEl.textContent = `${winner} wins!`;
      gameOver = true;
    } else if (board.every(c => c)) {
      statusEl.textContent = `Draw.`;
      gameOver = true;
    } else {
      statusEl.textContent = `${currentPlayer}'s turn`;
    }
  }

  function reset(statusEl, cellEls) {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameOver = false;
    render(statusEl, cellEls);
  }

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .ttt-wrap { text-align: center; }
        .ttt-status { font-size: 24px; margin-bottom: 16px; }
        .ttt-grid { display: grid; grid-template-columns: repeat(3, 96px); gap: 8px; justify-content: center; }
        .ttt-cell {
          width: 96px; height: 96px;
          background: #2a2a3e; color: #eaeaea;
          font-size: 48px; font-weight: bold;
          border: none; border-radius: 4px; cursor: pointer;
        }
        .ttt-cell:hover:not(.taken) { background: #3a3a4e; }
        .ttt-cell.taken { cursor: default; }
        .ttt-reset { margin-top: 16px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
      </style>
      <div class="ttt-wrap">
        <div class="ttt-status">X's turn</div>
        <div class="ttt-grid">
          ${Array.from({length:9}, (_,i) => `<button class="ttt-cell" data-i="${i}"></button>`).join('')}
        </div>
        <button class="ttt-reset">Reset</button>
      </div>
    `;
    container.appendChild(rootEl);

    const statusEl = rootEl.querySelector('.ttt-status');
    const cellEls = Array.from(rootEl.querySelectorAll('.ttt-cell'));
    const resetBtn = rootEl.querySelector('.ttt-reset');

    board = Array(9).fill(null);
    currentPlayer = 'X';
    gameOver = false;

    rootEl.addEventListener('click', (e) => {
      const cell = e.target.closest('.ttt-cell');
      if (!cell || gameOver) return;
      const i = Number(cell.dataset.i);
      if (board[i]) return;
      board[i] = currentPlayer;
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      render(statusEl, cellEls);
    });

    resetBtn.addEventListener('click', () => reset(statusEl, cellEls));
  }

  function unmount() {
    if (rootEl) {
      rootEl.remove();
      rootEl = null;
    }
    board = [];
    gameOver = false;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.tictactoe = { mount, unmount };
})();
