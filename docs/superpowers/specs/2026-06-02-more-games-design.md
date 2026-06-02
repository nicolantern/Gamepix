# mini-games — additional games (batch 2) — design

Date: 2026-06-02
Status: Approved, ready for implementation plan

## Goal

Add eight more games to the existing arcade, full-faithful in feel, playable with
both keyboard (desktop) and on-screen touch controls (mobile). Same no-build,
`file://`-friendly architecture as the existing five games.

New games: **Breakout, 2048, Whack-a-Mole, Tetris, Space Invaders, Dino,
Pac-Man, Asteroids**.

## Architecture (unchanged from existing games)

Each game is a self-contained IIFE in `games/` that registers itself on a global
registry:

```js
(function () {
  // ...game code...
  window.MiniGames = window.MiniGames || {};
  window.MiniGames.<name> = { mount, unmount };
})();
```

- `mount(container)` builds UI into the container, starts the loop, binds input.
- `unmount()` cancels any `requestAnimationFrame`, removes all listeners, clears DOM.
- Each game added to `index.html` as a `<script>` tag and a menu button
  (`data-game="<name>"`).
- No ES modules (breaks under `file://`). No build step, no dependencies.
- Theme colors: background `#1a1a2e`, panels `#0f0f1e`, accent pink `#e94560`.

This matches the actual implementation pattern of `games/snake.js`, not the ES-module
description in the original `2026-06-01-mini-games-design.md` (that doc predates the
switch to the global-registry pattern).

## Shared touch-control helper: `games/controls.js`

A new helper file loaded **before** the game scripts, exposing
`window.MiniGames.controls`. It provides an on-screen control overlay so games work
on phones without each game reimplementing touch handling.

Responsibilities:

- `createDpad(container, handlers)` — renders a directional pad (up/down/left/right).
- `createButtons(container, [{label, action}])` — renders one or more action buttons
  (rotate, fire, jump, thrust, drop).
- Each control dispatches the **same logical action** the keyboard triggers, so each
  game has a single input path (no duplicated touch vs. key logic).
- Supports tap and press-and-hold (hold matters for thrust/soft-drop/fire).
- Overlay auto-shows on touch-capable devices (`'ontouchstart' in window` or
  `navigator.maxTouchPoints > 0`) and stays hidden on desktop. A game may force-show.
- Returns a handle with a `destroy()` method; each game's `unmount` calls it.

Swipe-based games (2048, optionally Dino/Pac-Man) use a small `onSwipe(el, handlers)`
helper from the same module instead of a d-pad.

## Responsive canvas

Shared CSS additions so canvas games fit small screens: canvases get
`max-width: 100%; height: auto;` and the game container becomes a vertical flow: the
canvas on top, the touch overlay below. Internal canvas resolution stays fixed; CSS
scales the displayed size. Pointer/touch coordinates are mapped back through the
canvas scale factor where games read pointer position (Breakout paddle drag,
Whack-a-Mole is DOM so unaffected).

## Per-game specs

### Breakout (canvas)
- Rainbow brick grid: each row a different color; color determines points
  (top rows worth more).
- Paddle reflects ball at an angle based on where it hits (classic feel).
- Lives (start 3), ball lost on falling past paddle, level cleared when all bricks gone,
  advance to next level (more rows / faster ball).
- Controls: ←/→ keys or drag paddle; on-screen ←/→ buttons.

### 2048 (DOM grid)
- 4×4 grid, slide to merge equal tiles, new tile (2 or 4) spawns each move.
- Win at 2048 (offer "keep going"), game over when no moves remain. Score shown.
- Tile slide/merge CSS transitions.
- Controls: arrow keys; swipe on touch.

### Whack-a-Mole (DOM grid)
- 3×3 grid of holes; moles pop up on random timers.
- Countdown timer (e.g. 30s); pop frequency increases as time runs down.
- Click/tap a mole to score; missed moles retract. Final score on timeout, restart button.
- Controls: click/tap (works natively on both desktop and touch).

### Tetris (canvas)
- Standard 7 tetrominoes, SRS-style rotation, wall kicks.
- Hold piece, next-queue preview, ghost piece, soft/hard drop.
- Line-clear scoring (single/double/triple/tetris), level/speed ramp with lines cleared.
- Controls: **←/→ move, ↑ rotate, ↓ soft drop, Space hard drop.**
  Touch: d-pad for move/soft-drop + rotate button + hard-drop button.

### Space Invaders (canvas)
- Formation of invaders that march side-to-side and step down, speeding up as ranks thin.
- Player ship fires upward; invaders drop bombs.
- Destructible bunkers/shields; bonus UFO crossing the top.
- Waves (cleared formation → new, faster wave), lives, score.
- Controls: ←/→ + fire (Space). Touch: ←/→ buttons + fire button.

### Dino (canvas)
- Endless side-scroller, ramping speed.
- Jump over cacti, duck under birds. Day/night cycle for flavor. Distance score.
- Controls: Space/↑ jump, ↓ duck. Touch: tap to jump, swipe-down to duck.

### Pac-Man (canvas)
- Full maze with dots and 4 power pellets.
- 4 ghosts — Blinky, Pinky, Inky, Clyde — with their classic targeting personalities
  and scatter↔chase mode cycling.
- Power pellet → ghosts frightened (edible, flee), eyes return to house and respawn.
- Fruit bonus, lives, level advance when all dots eaten (faster ghosts, shorter
  frightened time next level).
- Controls: arrow keys; d-pad or swipe on touch.

### Asteroids (canvas)
- Vector ship: rotate left/right, thrust (momentum + drift), shoot.
- Asteroids split large→medium→small when shot; screen wrap-around for ship,
  bullets, and rocks.
- Occasional UFO that shoots back. Hyperspace (random teleport, small risk). Lives, score.
- Controls: ←/→ rotate, ↑ thrust, Space fire, (Shift or button) hyperspace.
  Touch: rotate buttons + thrust + fire + hyperspace buttons.

## Delivery batches (checkpoints)

- **Batch 0** — `controls.js` helper + responsive-canvas CSS. Foundation for touch.
- **Batch 1 (lighter)** — Breakout, 2048, Whack-a-Mole, Dino. User tests & approves.
- **Batch 2 (heavier)** — Tetris, Space Invaders, Asteroids, Pac-Man. User tests & approves.

Each game added incrementally to `index.html` (script tag + menu button) as it lands.

## Out of scope (consistent with v1)

- Sound effects / music.
- High-score persistence (localStorage).
- Difficulty-selection menus.
- Multiplayer / networking.

## Definition of done

- `index.html` opens in a modern browser with no console errors.
- Menu shows all 13 games; each mounts and is playable end-to-end (start → play →
  lose/win → restart or Back).
- Every game works with keyboard on desktop and with on-screen controls on a touch device.
- "← Back" stops the active game cleanly (no leaked listeners, no frames still firing,
  touch overlay removed).
- Repo committed to git.
