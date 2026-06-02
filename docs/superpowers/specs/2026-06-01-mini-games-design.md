  # mini-games — design

Date: 2026-06-01
Status: Approved, ready for implementation plan

## Goal

A single-page arcade with five small games selectable from a menu. Static HTML — opens directly in a browser, no build step, no server.

## Games

1. **Snake** — canvas, arrow keys, grid-based, grows on eating food, dies on wall/self collision.
2. **Pong** — canvas, single-player vs simple tracking AI, mouse or ↑/↓ arrow keys to move paddle, first to 7 points wins.
3. **Tic-Tac-Toe** — DOM, 2-player hot-seat (X and O alternate on the same keyboard). No AI.
4. **Memory Match** — DOM, 4×4 grid of face-down cards, 8 pairs, click to flip, match removes pair.
5. **Flappy Bird** — canvas, space or click to flap, scrolling pipes, score = pipes passed.

## Stack

- Plain HTML, CSS, JavaScript (ES modules).
- No frameworks, no bundler, no npm.
- Open `index.html` directly; everything works.

## File layout

```
mini-games/
  index.html          menu + game container + back button
  style.css           shared styling
  main.js             menu navigation, mounts/unmounts active game
  games/
    snake.js
    pong.js
    tictactoe.js
    memory.js
    flappy.js
  assets/             (empty for now; sounds/sprites later if added)
```

## Game module contract

Every game in `games/` exports the same two functions:

```js
export function mount(container) { /* build UI into container, start loop, bind input */ }
export function unmount()         { /* stop loop, remove listeners, clear container */ }
```

`main.js` is the only thing that knows about all games. It:

- Renders the menu (five buttons).
- On click: calls `currentGame.unmount()` if one is active, dynamically imports the chosen game module, calls `mount(container)`, shows the "← Back" button.
- On Back: calls `unmount()`, clears container, re-shows the menu.

This keeps games fully isolated — each game can be written and tested independently.

## Rendering choices per game

| Game        | Renderer | Why |
|-------------|----------|-----|
| Snake       | Canvas   | Animation loop, grid redraw each tick |
| Pong        | Canvas   | Continuous paddle/ball motion |
| Flappy Bird | Canvas   | Scrolling background, sprite motion |
| Tic-Tac-Toe | DOM      | Static 3×3 grid, click handlers, no animation |
| Memory      | DOM      | Grid of cards, CSS for flip animation |

## Input

- Snake: ArrowUp/Down/Left/Right.
- Pong: mouse Y over canvas OR ArrowUp/ArrowDown.
- Flappy: Space key OR click on canvas.
- Tic-Tac-Toe: click cells.
- Memory: click cards.

Each game's `mount` binds its own listeners; `unmount` removes them. No global key state.

## Game loop

Canvas games use `requestAnimationFrame`. `unmount` cancels the pending frame via the stored handle so nothing keeps running in the background.

## Styling

Single `style.css`. Dark theme, large readable buttons on the menu, centered game container. Each canvas game gets a fixed-size canvas (e.g. 480×640 for Flappy, 600×400 for Pong, 400×400 for Snake). Memory and Tic-Tac-Toe sized by CSS grid.

## Out of scope (deliberately)

- Sound effects / music (can add later via `<audio>` and the `assets/` folder).
- High-score persistence (`localStorage` is a follow-up).
- Mobile / touch controls (desktop browser only for v1).
- AI opponent for Tic-Tac-Toe (hot-seat only).
- Difficulty settings.
- Multiplayer / networking.

## Definition of done

- `index.html` opens in a modern browser with no errors in the console.
- Menu shows five buttons; clicking any one mounts that game.
- Each game is playable end-to-end (start → play → lose/win → restart or back to menu).
- "← Back" returns to the menu and the previous game stops cleanly (no leaked listeners, no frames still firing).
- Repo committed to git.
