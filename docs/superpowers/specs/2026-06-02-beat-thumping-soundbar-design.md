# Beat-thumping soundbar — design

**Date:** 2026-06-02
**Project:** Gamepix (mini-games)
**Status:** Approved

## Goal

Add a row of tiny speaker cabinets above the game-grid menu that bounce ("thump")
on every kick drum of the background music. Pure visual flourish for the menu.

## Context

The synthesized audio engine (`games/audio.js`) already exposes a beat-sync hook:

```js
window.MiniGames.audio.onBeat(cb) // cb fires the moment each kick sounds, only when unmuted
```

It is currently unused (single-callback slot, persists across track changes). The
soundbar claims it. No changes to the audio engine are required.

The project is no-build / `file://`-friendly: plain `<script>` tags, IIFE modules,
shared `window.MiniGames` registry. (See memory: avoid ES modules.)

## Pieces

1. **`index.html`**
   - Inside `<main>`, wrap the existing `#menu` and a new `#speaker-bar` in a
     `#menu-area` column container.
   - Add `<script src="games/speakers.js"></script>` before `main.js`
     (after `audio.js`, which it depends on).

2. **`games/speakers.js`** (new, IIFE)
   - Build 5 speaker units into `#speaker-bar`.
   - Register an `onBeat` callback that retriggers a `thump` animation on all units
     simultaneously (restart via class-toggle + forced reflow).
   - Self-contained; exposes nothing.

3. **`style.css`**
   - `#menu-area` (column, centered), `#speaker-bar` (flex row, gap), speaker
     cabinet + cone styling in the existing palette
     (`#0f0f1e` cabinet, `#2a2a3e` ring, `#e94560` accent).
   - `@keyframes thump` — quick scale-bounce ~1.0 → 1.18 → 1.0, plus an accent glow
     pulse on the cone.

4. **`main.js`**
   - `launchGame` / `returnToMenu` toggle `#menu-area` instead of `#menu`, so the
     soundbar hides with the menu during gameplay.

## Behavior notes

- During the menu anthem's intro bars there are no kicks, so the bar sits still
  until the beat enters — expected.
- Kicks fire `onBeat` during gameplay too, but the bar is hidden then, so the
  thump animation is a harmless no-op on a hidden element.
- When muted, `onBeat` does not fire — the bar naturally rests.

## Out of scope

- Per-speaker stagger / wave (they bounce as a unit).
- Audio-engine changes (multi-callback support, amplitude analysis).
- Speakers during gameplay.
