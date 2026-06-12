###### (This is a simple test of Claude Fable 5, which is already capable of making games better than those I have been working on for months/years)

# Nova Strike 3.0 🚀

A fast, endless 2D space shooter built with HTML5 Canvas + React + TypeScript. No backend — all progress is saved in your browser's localStorage.

## Run locally

```bash
npm install      # or: bun install
npm run dev      # dev server at http://localhost:5173
```

## Build for production / GitHub Pages

```bash
npm run build    # outputs static site to dist/
npm run preview  # test the production build locally
```

The build uses relative asset paths (`base: "./"`), so you can host the `dist/` folder anywhere — GitHub Pages, Netlify, any static file server — including from a subdirectory.

## How to play

| Input | Action |
|---|---|
| `W A S D` | Move ship |
| Mouse | Aim |
| Left click (hold) | Fire |
| `1 / 2 / 3` | Switch weapon — or pick a level-up upgrade when choices are shown |
| `Space` | Ship ability (per ship class) |
| `Esc` / `P` | Pause |

### Core loop
- Destroy enemies → collect XP shards, credits ◈ and materials ⬡.
- **Level-ups don't pause the game** — 3 upgrade choices slide in at the bottom-left. Click one or press `1/2/3` while you keep dodging. Multiple level-ups queue up: pick one and the next three appear.
- Every 5th level guarantees a rare-or-better upgrade.
- Credits and materials you bank are kept after death — spend them in the **Research Lab** on permanent upgrades, new weapons (Plasma Projector, Missile Pods) and three additional ship frames (Interceptor, Heavy Gunship, Explorer), each with its own ability.
- Bosses warp in periodically — four different capital ships (VX Dreadnought, Obsidian Maw, Star Reaper, Void Harbinger), each a 3-phase fight with escalating attack patterns.

### What's new in 3.0
- **Non-pausing level-ups** — compact picker bottom-left, keyboard or click, with a queue indicator.
- **Fixed pickup magnet** — loot now homes straight to your ship; no more endless orbiting with stacked Tractor Array upgrades.
- **Deeper research** — most lab upgrades now go to rank 5–8; new Shield Generator gives a starting energy shield.
- **Detailed ship icons** in the Research Lab and ship select.
- **Four distinct boss sprites**, one per boss name.
- **Realistic starfield** — pre-rendered deep-space layer with thousands of stars, stellar color palette, subtle dust, parallax, and diffraction spikes on the brightest stars.

Have fun! ✨
