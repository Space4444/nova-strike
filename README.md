# Nova Strike — 2D Space Shooter

Endless single-player survival shooter in deep space. Built with React + TypeScript + HTML5 Canvas. No backend, no accounts — everything runs in the browser.

## Run locally

Requires Node.js 20+ (or Bun).

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Production build

```bash
npm run build      # outputs static files to dist/
npm run preview    # serves the dist/ build locally
```

The `dist/` folder is fully static — you can host it on any static file server.

## Controls

| Input        | Action            |
|--------------|-------------------|
| WASD / Arrows| Fly your ship     |
| Mouse        | Aim turret        |
| Left click   | Fire lasers       |
| Esc / P      | Pause             |

## Gameplay

- Destroy enemies → earn XP & credits
- Level up → choose 1 of 3 random upgrades (they stack)
- 4 enemy types: Scout (fast, weak), Fighter (shoots), Tank (slow, beefy), Elite (rare, spread shot)
- Difficulty scales endlessly — survive as long as you can

## Code layout

```
src/
  main.tsx            entry point
  pages/GamePage.tsx  React wrapper, menus & overlays (start / level-up / pause / game over)
  game/
    game.ts           main Game class: loop, phases, spawning, difficulty, camera
    player.ts         ship movement, regen, engine trail
    enemies.ts        the 4 enemy types & their AI
    projectiles.ts    player lasers & enemy shots
    upgrades.ts       upgrade definitions, weighted rolls, stat computation
    particles.ts      explosions, trails, muzzle flashes
    starfield.ts      infinite parallax star background
    hud.ts            canvas HUD (health, XP, level, credits, upgrades)
    input.ts          keyboard + mouse handling
    types.ts          shared types
```
