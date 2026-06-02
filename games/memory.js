(function () {
  const SYMBOLS = ['🍎','🍌','🍇','🍒','🥝','🍉','🍓','🥥'];

  let rootEl = null;
  let cards = [];
  let flippedIndices = [];
  let matchedCount = 0;
  let lockTimer = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildCards() {
    const doubled = SYMBOLS.concat(SYMBOLS);
    return shuffle(doubled).map((sym) => ({ symbol: sym, flipped: false, matched: false }));
  }

  function renderCard(cardEl, card) {
    cardEl.textContent = (card.flipped || card.matched) ? card.symbol : '';
    cardEl.classList.toggle('flipped', card.flipped);
    cardEl.classList.toggle('matched', card.matched);
  }

  function renderAll(cardEls, statusEl) {
    cards.forEach((c, i) => renderCard(cardEls[i], c));
    if (matchedCount === SYMBOLS.length) {
      statusEl.textContent = 'You matched them all!';
    } else {
      statusEl.textContent = `Matches: ${matchedCount} / ${SYMBOLS.length}`;
    }
  }

  function reset(cardEls, statusEl) {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
    cards = buildCards();
    flippedIndices = [];
    matchedCount = 0;
    renderAll(cardEls, statusEl);
  }

  function mount(container) {
    rootEl = document.createElement('div');
    rootEl.innerHTML = `
      <style>
        .mem-wrap { text-align: center; }
        .mem-status { font-size: 20px; margin-bottom: 16px; }
        .mem-grid { display: grid; grid-template-columns: repeat(4, 80px); gap: 8px; justify-content: center; }
        .mem-card {
          width: 80px; height: 80px;
          background: #4a4a6a; color: #eaeaea;
          font-size: 36px;
          border: none; border-radius: 6px; cursor: pointer;
          transition: background 0.15s;
        }
        .mem-card:hover:not(.flipped):not(.matched) { background: #5a5a7a; }
        .mem-card.flipped { background: #e94560; cursor: default; }
        .mem-card.matched { background: #2e8b57; cursor: default; }
        .mem-reset { margin-top: 16px; padding: 8px 16px; font-size: 16px; cursor: pointer; }
      </style>
      <div class="mem-wrap">
        <div class="mem-status"></div>
        <div class="mem-grid">
          ${Array.from({length: 16}, (_,i) => `<button class="mem-card" data-i="${i}"></button>`).join('')}
        </div>
        <button class="mem-reset">Reset</button>
      </div>
    `;
    container.appendChild(rootEl);

    const statusEl = rootEl.querySelector('.mem-status');
    const cardEls = Array.from(rootEl.querySelectorAll('.mem-card'));
    const resetBtn = rootEl.querySelector('.mem-reset');

    reset(cardEls, statusEl);

    rootEl.addEventListener('click', (e) => {
      const cardBtn = e.target.closest('.mem-card');
      if (!cardBtn) return;
      if (lockTimer) return;
      const i = Number(cardBtn.dataset.i);
      const card = cards[i];
      if (card.flipped || card.matched) return;

      card.flipped = true;
      flippedIndices.push(i);
      renderCard(cardEls[i], card);

      if (flippedIndices.length === 2) {
        const [a, b] = flippedIndices;
        if (cards[a].symbol === cards[b].symbol) {
          cards[a].matched = true;
          cards[b].matched = true;
          matchedCount += 1;
          flippedIndices = [];
          renderAll(cardEls, statusEl);
        } else {
          lockTimer = setTimeout(() => {
            cards[a].flipped = false;
            cards[b].flipped = false;
            flippedIndices = [];
            lockTimer = null;
            renderAll(cardEls, statusEl);
          }, 800);
        }
      }
    });

    resetBtn.addEventListener('click', () => reset(cardEls, statusEl));
  }

  function unmount() {
    if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
    if (rootEl) { rootEl.remove(); rootEl = null; }
    cards = [];
    flippedIndices = [];
    matchedCount = 0;
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.memory = { mount, unmount };
})();
