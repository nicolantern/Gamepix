let rootEl = null;

export function mount(container) {
  rootEl = document.createElement('div');
  rootEl.textContent = 'Tic-Tac-Toe (stub) — Task 2 wiring check';
  rootEl.style.padding = '40px';
  rootEl.style.fontSize = '20px';
  container.appendChild(rootEl);
}

export function unmount() {
  if (rootEl) {
    rootEl.remove();
    rootEl = null;
  }
}
