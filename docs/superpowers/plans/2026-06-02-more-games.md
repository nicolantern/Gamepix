# Additional Games (Batch 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eight full-faithful games (Breakout, 2048, Whack-a-Mole, Tetris, Space Invaders, Dino, Pac-Man, Asteroids) to the existing vanilla-JS arcade, each playable with keyboard and on-screen touch controls.

**Architecture:** Each game is a self-contained IIFE in `games/` registering `window.MiniGames.<name> = { mount, unmount }`, wired into `index.html` via a `<script>` tag + menu button. A new shared `games/controls.js` provides on-screen touch controls (d-pad / action buttons / swipe) that dispatch the same logical actions as the keyboard, so each game has one input path. No build step, no dependencies, runs from `file://`.

**Tech Stack:** Plain HTML/CSS/JavaScript. Canvas 2D for action games, DOM for grid games (2048, Whack-a-Mole). `requestAnimationFrame` loops.

**Verification note (deliberate deviation from strict TDD):** This repo has no test runner and the v1 spec forbids dependencies/build steps. Each game is verified by opening `index.html` in a browser and confirming an explicit behavior checklist. Pure logic with non-obvious correctness (2048 line-merge, Tetris collision/rotation, Pac-Man ghost targeting, asteroid splitting) is written as standalone pure functions guarded by inline `console.assert` self-checks that run once on load and log to the console — so a wrong merge/collision surfaces immediately without adding a framework.

---

## File Structure

```
mini-games/
  index.html            ADD: 8 <script> tags + 8 menu buttons
  style.css             ADD: responsive-canvas rules + .touch-controls styles
  games/
    controls.js         NEW: window.MiniGames.controls (touch overlay helper)
    breakout.js         NEW
    g2048.js            NEW  (filename g2048 — identifiers can't start with a digit; data-game="2048")
    whack.js            NEW
    tetris.js           NEW
    invaders.js         NEW
    dino.js             NEW
    pacman.js           NEW
    asteroids.js        NEW
```

Each game file owns exactly one game. `controls.js` owns all shared touch UI. `index.html` is the only file that knows the full game list.

---

## Conventions every game task MUST follow

Copied from `games/snake.js` (the canonical pattern):

- Wrap everything in `(function () { ... })();`.
- `mount(container)`: create a root `<div>`, inject scoped `<style>` + markup, append to `container`, grab canvas/ctx, bind listeners on `window` (keys) / canvas (pointer), start the loop with `requestAnimationFrame`, and create touch controls (see Task 1).
- `unmount()`: `cancelAnimationFrame(rafId)`; `removeEventListener` for every listener added; `controlsHandle.destroy()`; `rootEl.remove()`; null out refs.
- Register at the end: `window.MiniGames = window.MiniGames || {}; window.MiniGames.<name> = { mount, unmount };`
- Theme colors: bg `#1a1a2e`, panel `#0f0f1e`, accent `#e94560`. Status text `font-size:18px`, hint text `font-size:12px;color:#888`.
- Restart on game-over via a key (match snake's Space-to-restart feel) AND a touch button.

---

## Task 1: Shared touch-controls helper

**Files:**
- Create: `games/controls.js`
- Modify: `index.html` (add `<script src="games/controls.js"></script>` BEFORE the game scripts), `style.css` (add `.touch-controls` styles)

- [ ] **Step 1: Create `games/controls.js`**

Expose `window.MiniGames.controls` with this exact API:

```js
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
```

- [ ] **Step 2: Add styles to `style.css`**

```css
/* Responsive canvas for game screens */
#game-container canvas { max-width: 100%; height: auto; touch-action: none; }
#game-container { flex-direction: column; }

/* On-screen touch controls */
.touch-controls { display: flex; gap: 24px; justify-content: center; align-items: center; margin-top: 16px; flex-wrap: wrap; }
.touch-controls.hidden { display: none; }
.tc-dpad { display: grid; grid-template-columns: repeat(3, 48px); grid-template-rows: repeat(3, 48px); gap: 4px; }
.tc-up { grid-column: 2; grid-row: 1; } .tc-left { grid-column: 1; grid-row: 2; }
.tc-right { grid-column: 3; grid-row: 2; } .tc-down { grid-column: 2; grid-row: 3; }
.tc-btn { background: #4a4a6a; color: #fff; border: none; border-radius: 8px; font-size: 20px; min-width: 56px; min-height: 48px; cursor: pointer; user-select: none; }
.tc-btn:active { background: #e94560; }
.tc-action { padding: 0 20px; }
```

- [ ] **Step 3: Wire `controls.js` into `index.html`**

Add this line immediately BEFORE `<script src="games/snake.js">`:

```html
<script src="games/controls.js"></script>
```

- [ ] **Step 4: Verify in browser**

Open `index.html`. Open DevTools console: type `window.MiniGames.controls` → should show `{create, onSwipe, isTouch}`. No errors. (Existing games still work.)

- [ ] **Step 5: Commit**

```bash
git add games/controls.js style.css index.html
git commit -m "Add shared touch-controls helper + responsive canvas CSS"
```

---

## BATCH 1 — lighter games

## Task 2: Breakout

**Files:** Create `games/breakout.js`; Modify `index.html` (script tag + menu button).

- [ ] **Step 1: Implement `games/breakout.js`** following the conventions above. Required behavior:
  - Canvas 480×560. Brick grid: 6 rows × 9 cols, gap between bricks. Row colors top→bottom: `#e94560,#ff8c42,#ffd23f,#4caf50,#37c6e9,#9b5de5`. Points per row top→bottom: 60,50,40,30,20,10.
  - Paddle near bottom; ball starts on paddle, launches up on key/tap. Ball reflects off walls/ceiling/paddle/bricks. Paddle-hit angle depends on offset from paddle center (edge = steeper).
  - Lives = 3 (drawn as text). Ball below paddle → lose a life + re-serve; 0 lives → game over.
  - All bricks cleared → next level: +1 row capped at 8, ball speed ×1.1.
  - Status line shows `Score / Lives / Level`. Game over → "Press Space / tap Restart".
  - Keyboard: ←/→ move paddle, Space launch/restart. Pointer: drag on canvas moves paddle (map clientX through canvas scale). Touch controls via `controls.create(root, {dpad:{left,right}, buttons:[{label:'⏶ Launch', action:launch}]})`.
- [ ] **Step 2: Wire into `index.html`** — add `<script src="games/breakout.js"></script>` with the others, and `<button class="menu-btn" data-game="breakout">Breakout</button>` in `#menu`.
- [ ] **Step 3: Verify in browser** — From menu click Breakout. Confirm: colorful rows render; ball launches; bricks break and score increases by row value; paddle angle varies by hit position; losing all balls ends game; Space restarts; Back returns to menu and the loop stops (console: no errors, no runaway rAF). On a touch device / mobile emulation, the ←/▶/Launch buttons appear and work.
- [ ] **Step 4: Commit**

```bash
git add games/breakout.js index.html
git commit -m "Add Breakout game with colorful brick grid + touch controls"
```

---

## Task 3: 2048

**Files:** Create `games/g2048.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/g2048.js`.** Put the board logic in pure functions and self-check them:
  - `slideRow(row)` → returns `{row: newRow, gained: points}` collapsing one row to the LEFT (merge equal pairs once, left-to-right, e.g. `[2,2,2,2] → [4,4]` gaining 8). Board moves implemented by rotating the 4×4 grid so all four directions reuse `slideRow`.
  - Inline self-check at load: `console.assert(JSON.stringify(slideRow([2,2,2,2]).row)===JSON.stringify([4,4,0,0]), '2048 merge')` plus `console.assert(slideRow([2,2,2,2]).gained===8)` and a no-merge case `[2,0,2,0]→[4,0,0,0]`.
  - DOM 4×4 grid, tiles colored by value, score + best-in-session. New tile (90% 2 / 10% 4) after each move that changed the board. Win at 2048 (banner, "keep going"); game over when no move changes the board and grid is full.
  - Keyboard arrows; `controls.onSwipe(boardEl, {...})` for touch. Restart button always visible.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="2048">2048</button>` (note: `data-game="2048"`, `main.js` looks up `window.MiniGames['2048']`, so register as `window.MiniGames['2048']`).
- [ ] **Step 3: Verify in browser** — Console shows no failed asserts. Play: arrows merge tiles, score climbs, new tiles spawn, reaching 2048 shows win, full-no-moves shows game over, restart works, swipe works in mobile emulation, Back stops cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/g2048.js index.html
git commit -m "Add 2048 with swipe support and merge self-checks"
```

---

## Task 4: Whack-a-Mole

**Files:** Create `games/whack.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/whack.js`.** DOM 3×3 grid of holes. 30s countdown. A `setInterval`/timeout scheduler pops a random empty hole; mole stays up a random 600–1100ms then retracts. Pop interval starts ~800ms and shortens toward ~350ms as the clock runs down. Click/tap a raised mole → +1 score, mole retracts immediately. On timeout: freeze board, show final score + Restart button. `unmount` clears ALL timers (track them in an array). Touch needs no overlay (tap === click).
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="whack">Whack-a-Mole</button>`.
- [ ] **Step 3: Verify in browser** — Moles pop, clicking scores, frequency increases near the end, timer hits 0 and shows final score, Restart resets timer+score, Back stops cleanly (no timers left firing — check by returning to menu and watching console/no stray DOM updates).
- [ ] **Step 4: Commit**

```bash
git add games/whack.js index.html
git commit -m "Add Whack-a-Mole with countdown and escalating spawn rate"
```

---

## Task 5: Dino

**Files:** Create `games/dino.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/dino.js`.** Canvas ~600×200. Ground line, dino on the left. Gravity + jump arc; duck shrinks hitbox + lowers it. Obstacles scroll right→left: cacti (ground) and birds (two heights — high birds clear by running, low/mid require duck). Spawn gap randomized, speed ramps with distance. Distance score (increments over time). Collision (AABB) → game over, show score + restart. Day/night: invert palette every ~700 score. Keyboard: Space/↑ jump, ↓ duck (hold). Touch: `controls.create(root,{buttons:[{label:'Jump',action:jump},{label:'Duck',action:duckStart,hold:true}]})` plus tap-canvas to jump.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="dino">Dino Run</button>`.
- [ ] **Step 3: Verify in browser** — Dino jumps and ducks, obstacles approach and must be avoided, speed increases, collision ends game, score shows, restart works, day/night flips, touch buttons work, Back stops cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/dino.js index.html
git commit -m "Add Dino endless runner with jump/duck and day-night cycle"
```

---

### BATCH 1 CHECKPOINT

Stop and let the user test Breakout, 2048, Whack-a-Mole, Dino in the browser before continuing.

---

## BATCH 2 — heavier games

## Task 6: Tetris

**Files:** Create `games/tetris.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/tetris.js`.** Pure logic + self-checks first:
  - Tetromino definitions (I,O,T,S,Z,J,L) as rotation states. `collides(grid, piece, x, y, rot)` pure fn. Inline `console.assert` checks: a piece at spawn doesn't collide; a piece pushed into the floor does.
  - 10×20 grid canvas + side panel (hold + next-queue of 3 + score/level/lines).
  - 7-bag randomizer. SRS rotation with basic wall kicks. Ghost piece (landing shadow). Hold (once per drop). Soft drop (faster fall), hard drop (instant lock + bonus). Lock delay on landing.
  - Line clears: scoring 100/300/500/800 × level for 1/2/3/4 lines. Level up every 10 lines; gravity interval shortens by level. Top-out → game over + restart.
  - **Controls: ←/→ move, ↑ rotate, ↓ soft drop, Space hard drop.** Touch: `controls.create(root,{dpad:{left,right,down}, buttons:[{label:'⟳',action:rotate},{label:'⤓ Drop',action:hardDrop}]})`.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="tetris">Tetris</button>`.
- [ ] **Step 3: Verify in browser** — No failed asserts. Pieces fall/move/rotate (↑), soft drop on ↓, hard drop on Space, hold + next queue work, ghost shows landing, lines clear with correct scoring, levels speed up, top-out ends game, restart works, touch buttons map correctly, Back stops cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/tetris.js index.html
git commit -m "Add Tetris: 7-bag, hold, next-queue, ghost, SRS kicks"
```

---

## Task 7: Space Invaders

**Files:** Create `games/invaders.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/invaders.js`.** Canvas ~520×600. Invader formation 5 rows × 11 cols, marching side-to-side; on hitting an edge the whole formation steps down and reverses; march speed increases as invaders are destroyed. Player ship bottom, fires upward (one shot cooldown). Invaders drop bombs at random from the front row. 4 destructible bunkers above the player (chip away on hit by either side). Bonus UFO crosses the top periodically for bonus points. Wave cleared → next wave, faster + lower start. Lives = 3; ship hit or invaders reach the player line → lose life / game over. Score + lives + wave shown. Controls: ←/→ + Space fire. Touch: `controls.create(root,{dpad:{left,right}, buttons:[{label:'Fire',action:fire}]})`.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="invaders">Space Invaders</button>`.
- [ ] **Step 3: Verify in browser** — Formation marches & speeds up as it thins, player shoots, invaders bomb, bunkers erode, UFO appears for bonus, clearing a wave starts a faster one, lives decrement, game over + restart, touch works, Back stops cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/invaders.js index.html
git commit -m "Add Space Invaders: formation, bunkers, UFO, waves"
```

---

## Task 8: Asteroids

**Files:** Create `games/asteroids.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/asteroids.js`.** Pure helper + self-check: `wrap(v, max)` wraps a coordinate (assert `wrap(-1,100)===99`, `wrap(101,100)===1`). Canvas ~600×600, black space. Vector ship: ←/→ rotate, ↑ thrust (acceleration + momentum/drift, gentle friction), Space fire (bullets live ~1s, capped count). Asteroids drift and wrap; shot large→2 medium, medium→2 small, small→destroyed; points 20/50/100. All rocks cleared → next wave (more/faster rocks). UFO appears occasionally, crosses and shoots toward the ship. Hyperspace (Shift / button): teleport to random spot. Ship–asteroid or ship–UFO-bullet collision → lose life + brief invulnerable respawn; 0 lives → game over. Score + lives shown. Touch: `controls.create(root,{buttons:[{label:'◀',action:rotL,hold:true},{label:'▶',action:rotR,hold:true},{label:'Thrust',action:thrust,hold:true},{label:'Fire',action:fire},{label:'Jump',action:hyperspace}]})`.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="asteroids">Asteroids</button>`.
- [ ] **Step 3: Verify in browser** — No failed asserts. Ship rotates/thrusts with drift and wraps; bullets fire and wrap; asteroids split correctly and award points; clearing spawns a harder wave; UFO appears and shoots; hyperspace teleports; collisions cost lives with respawn invulnerability; game over + restart; touch buttons work; Back stops cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/asteroids.js index.html
git commit -m "Add Asteroids: thrust physics, splitting rocks, UFO, hyperspace"
```

---

## Task 9: Pac-Man

**Files:** Create `games/pacman.js`; Modify `index.html`.

- [ ] **Step 1: Implement `games/pacman.js`.** This is the largest task — implement carefully.
  - Maze as a tile grid (classic 28×31-style layout, or a faithful compact variant) encoded as a string array: walls, dots, 4 power pellets, ghost house, tunnels (left/right wrap). Render walls + dots on canvas; cell size scales canvas to ~448×496.
  - Pac-Man moves tile-to-tile with smooth interpolation; queued next-direction turns when aligned; eats dots/power pellets.
  - 4 ghosts with classic targeting in CHASE mode: **Blinky** targets Pac-Man's tile; **Pinky** targets 4 tiles ahead of Pac-Man; **Inky** uses the vector from Blinky through the tile 2 ahead of Pac-Man, doubled; **Clyde** chases when far but retreats to his scatter corner when within 8 tiles. SCATTER mode: each ghost targets its own corner. Mode cycles scatter↔chase on the classic timer schedule. Ghosts choose, at each intersection, the legal direction (no reversing) minimizing distance to their target tile.
  - Power pellet → ghosts enter FRIGHTENED (blue, slower, semi-random, flee), Pac-Man can eat them for escalating points (200/400/800/1600); eaten ghost becomes EYES that return to the house then respawn. Frightened duration shortens with level.
  - Fruit bonus appears near the house after some dots eaten. Lives = 3. All dots eaten → next level (faster ghosts, shorter frightened). Ghost touches Pac-Man (not frightened) → lose life / game over.
  - Status: score + lives + level. Controls: arrow keys; touch d-pad via `controls.create(root,{dpad:{up,down,left,right}})` and `controls.onSwipe` on the canvas.
- [ ] **Step 2: Wire into `index.html`** — script tag + `<button class="menu-btn" data-game="pacman">Pac-Man</button>`.
- [ ] **Step 3: Verify in browser** — Maze + dots render; Pac-Man turns smoothly and eats dots; all 4 ghosts leave the house and visibly behave differently (Blinky tails you, Pinky cuts ahead, Clyde backs off when near, Inky flanks); scatter↔chase alternation visible (ghosts periodically head to corners); power pellet turns ghosts blue and they flee + are edible for rising points; eaten ghost returns as eyes and respawns; fruit appears; losing all lives ends game; clearing all dots advances level; restart + Back work cleanly.
- [ ] **Step 4: Commit**

```bash
git add games/pacman.js index.html
git commit -m "Add Pac-Man: full maze, 4 ghost AIs, scatter/chase, power pellets"
```

---

### BATCH 2 CHECKPOINT

Let the user test Tetris, Space Invaders, Asteroids, Pac-Man in the browser. Then update `README.md` to list all 13 games and final-commit.

---

## Task 10: Update README

**Files:** Modify `README.md`.

- [ ] **Step 1:** Update the intro line and game list to include all 13 games and mention keyboard + touch controls.
- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Update README for the full 13-game arcade"
```
```

---

## Self-review notes

- **Spec coverage:** controls.js (Task 1) ↔ spec "shared touch-control helper"; responsive canvas (Task 1) ↔ spec "Responsive canvas"; Tasks 2–9 map 1:1 to the eight per-game specs with matching mechanics and the corrected Tetris controls (↑ rotate / ↓ soft / Space hard); batches match the spec's Batch 0/1/2; README (Task 10) ↔ definition-of-done "menu shows all 13 games".
- **2048 naming:** filename `g2048.js` + `data-game="2048"` + registry key `window.MiniGames['2048']` are consistent across Task 3 (identifiers can't start with a digit, but the registry key and data attribute can).
- **Cleanup contract** (cancel rAF, remove listeners, clear timers, `controls.destroy()`) is restated in every game's verification step to match snake's leak-free `unmount`.
