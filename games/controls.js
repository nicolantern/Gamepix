(function () {
  function isTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  // Create an on-screen control bar inside `container`.
  // spec = { dpad: {up,down,left,right} (handler fns, optional),
  //          buttons: [{label, action}],   // action = fn called on press
  //          hold: bool }                   // if true, action fires repeatedly while held
  // Returns { el, destroy() }.
  function create(container, spec) {
    const bar = document.createElement('div');
    bar.className = 'touch-controls';
    if (!isTouch() && !spec.forceShow) bar.classList.add('hidden');

    const timers = [];
    function wire(btn, handler, hold) {
      const start = (e) => {
        e.preventDefault();
        handler();
        if (hold) {
          const id = setInterval(handler, 90);
          timers.push(id);
          btn._id = id;
        }
      };
      const stop = () => { if (btn._id) { clearInterval(btn._id); btn._id = null; } };
      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('touchend', stop);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
    }

    if (spec.dpad) {
      const pad = document.createElement('div');
      pad.className = 'tc-dpad';
      [['up','▲'],['left','◀'],['right','▶'],['down','▼']].forEach(([dir, glyph]) => {
        if (!spec.dpad[dir]) return;
        const b = document.createElement('button');
        b.className = 'tc-btn tc-' + dir;
        b.textContent = glyph;
        wire(b, spec.dpad[dir], spec.hold);
        pad.appendChild(b);
      });
      bar.appendChild(pad);
    }
    (spec.buttons || []).forEach(({ label, action, hold }) => {
      const b = document.createElement('button');
      b.className = 'tc-btn tc-action';
      b.textContent = label;
      wire(b, action, hold);
      bar.appendChild(b);
    });

    container.appendChild(bar);
    return {
      el: bar,
      destroy() { timers.forEach(clearInterval); bar.remove(); }
    };
  }

  // Swipe helper for grid games. handlers = {up,down,left,right}.
  function onSwipe(el, handlers) {
    let sx = 0, sy = 0;
    const start = (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; };
    const end = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) (dx > 0 ? handlers.right : handlers.left)();
      else (dy > 0 ? handlers.down : handlers.up)();
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end);
    return { destroy() { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); } };
  }

  window.MiniGames = window.MiniGames || {};
  window.MiniGames.controls = { create, onSwipe, isTouch };
})();
