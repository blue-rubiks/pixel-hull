# 🎮 Pixel Hull - Retro Pixel Space Shooter

> A browser-based retro space shooter inspired by the Nokia classic _Space Impact_ —— your ship is built from pixels, and damage strips them away one by one.

[![Phaser](https://img.shields.io/badge/Phaser-4.1-orange.svg)](https://phaser.io/)
[![Node.js](https://img.shields.io/badge/Node.js-26+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-purple.svg)](https://vite.dev/)
[![PWA](https://img.shields.io/badge/PWA-installable-success.svg)](https://web.dev/progressive-web-apps/)

**[🎮 Play Online](https://blue-rubiks.github.io/pixel-hull/)** | [English](README_EN.md) | [繁體中文](README.md)

---

## 📖 Introduction

**Pixel Hull** is a browser-based retro space shooter inspired by the Nokia classic _Space Impact_.

It is not a faithful clone. It reworks the original around three distinct ideas:

- **A pixel-hull damage model** —— a ship that sheds pixels instead of a conventional health bar.
- **A daily challenge** —— seeded waves + a Wordle-style emoji result share + a streak counter, fully client-side with no accounts and no backend.
- **A Nokia-style phone shell** —— a whole retro handset frame with an LCD-pixel grid, shipped as an installable PWA.

## 📸 Screenshots

|                                               |                                               |
| :-------------------------------------------: | :-------------------------------------------: |
| ![](https://cdn.imgpile.com/f/hLrBVQ7_xl.png) | ![](https://cdn.imgpile.com/f/grEoudl_xl.png) |
|                                               |                                               |
| ![](https://cdn.imgpile.com/f/zXBEDpC_xl.png) | ![](https://cdn.imgpile.com/f/h4P4pdc_xl.png) |

## ✨ Core Features

- 🟢 **Pixel-hull mechanic** —— the ship is made of a dozen-odd pixels; taking damage strips them away, so the ship literally shrinks and its fire rate weakens. Collecting supplies restores them. It's the health bar, visual feedback, and risk/reward loop all in one. **Wounded bonus**: the more pixels you're missing, the higher your score multiplier (×1 at full hull, up to ~×2.9, shown live on the HUD) —— repairing becomes a real decision.
- 📅 **Daily challenge** —— seeded by your local calendar day, so every player gets the exact same run on any given day; keeps a daily best and a streak, with a one-tap emoji result to share.
- 🎮 **Two modes** —— an 8-level Arcade difficulty ramp (levels keep going after clearing it, bosses cycle, HP scales) plus a once-a-day Daily run; Arcade offers EASY/NORMAL/HARD difficulty.
- 👾 **8 enemy types + 8 bosses** —— each with distinct movement; every level ends with a uniquely-styled boss that rotates attack patterns and enrages at low HP. Post-clear loops introduce **elite variants**: shielded elites (periodically immune —— hit the window when the shield drops) and splitters (burst into two swarm on death), worth double points. The **thief** dives for supply drops and flees with them —— kill it first or lose the pickup.
- ⛰️ **Cave-terrain levels** —— on certain levels (Arcade L3/L6, Daily every 3rd level) scrolling terrain grows from the top and bottom edges, squeezing the corridor; scraping it strips hull pixels. Dodging terrain is a different skill from dodging bullets.
- ⬆️ **Upgrade-card system** —— pick 1 of 3 cards after each level (rapid fire / wingman / piercing shots / magnet / hull repair), a Vampire-Survivors-style growth loop.
- 🚀 **Special weapons** —— rocket (straight, high damage), beam (a forward-advancing piercing column ahead of the ship's nose), and wheel (slow, piercing); limited ammo, switchable.
- 📱 **Nokia-style phone shell + LCD grid + PWA** —— installable to your home screen, playable offline.
- 🎨 **Strict two-colour pixel art + a self-made bitmap font** —— no external font file, fully Traditional-Chinese in-game UI.
- 🔊 **Procedural chiptune BGM + 8-bit sound effects** —— each of the 8 levels has its own scenery and music (levels 9+ cycle through them); audio can be muted from the menu (music and SFX together) and the setting is remembered.

## 🎮 Controls

| Action               | Desktop    | Phone shell         |
| -------------------- | ---------- | ------------------- |
| Move                 | Arrow keys | Virtual joystick    |
| Fire                 | Space      | 射擊 (fire) button  |
| Special weapon       | X or 1     | ✦ button            |
| Switch weapon        | Z          | ⇄ button            |
| Share result (Daily) | C          | 分享 (share) button |
| Menu                 | M          | 選單 (menu) button  |

> On-screen taps are only used to pick upgrade cards and to restart after game over. Movement and firing always go through keys or the shell's physical buttons —— there are deliberately no drag/tap gestures over the play area, which would cover the screen and conflict with firing.

## 🚀 Getting Started

### Requirements

| Tool    | Version |
| ------- | ------- |
| Node.js | 26.x    |
| npm     | bundled |

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/twtrubiks/pixel-hull.git
cd pixel-hull

# 2. Install dependencies (also sets up the husky pre-commit hook)
npm install

# 3. Start the dev server
npm run dev

# 4. Open the URL printed in the terminal (defaults to http://localhost:5173)
```

> 💡 To let **other devices on the same network** (e.g. your phone) connect, run `npm run dev -- --host` instead, then open the LAN URL printed in the terminal — remember the `/pixel-hull/` path, e.g. `http://192.168.x.x:5173/pixel-hull/`.

## 📁 Project Structure

```
pixel-hull/
├── src/
│   ├── core/      # Pure game logic, no framework dependency (hull, waves,
│   │              #   upgrades, weapons, daily seeding, storage, PRNG) + tests
│   ├── scenes/    # Phaser scenes (BootScene, MenuScene, GameScene)
│   ├── ui/        # Bitmap font, sprites, sound, phone-shell wiring, joystick, backdrop
│   └── main.ts    # Phaser game setup and PWA registration
├── public/        # PWA manifest, service worker, icons
├── scripts/       # Tooling (icon generation)
└── vite.config.ts # base set to /pixel-hull/ (must match the repo name)
```

## 🎯 Gameplay

### Two Modes

- **Arcade**: an 8-level campaign with a difficulty ramp; after clearing it the levels keep going, bosses cycle, and HP keeps scaling, with regular enemies getting slightly faster and tankier each loop. Pick **EASY/NORMAL/HARD** from the menu to tune enemy speed, spawn density, boss HP, and supply pacing (NORMAL is the original balance, and the choice is remembered); EASY doesn't record the high score, to keep it off the leaderboard.
- **Daily**: one seeded run per local calendar day. Every player gets the same waves, upgrade choices, and item-drop sequence (when and how many drops actually appear varies with your health and pace); keeps a daily best and a streak in `localStorage`. Difficulty is fixed at NORMAL so everyone shares the same run. No accounts, no backend.

### The Pixel-Hull Mechanic

The player's ship is built from a dozen-odd pixels. **Taking damage strips pixels away** —— the ship literally shrinks and its fire rate drops; collecting supplies restores them. It doubles as the health bar and the core risk/reward tension. In the two-colour art style, the scattering pixels look great when the hull breaks apart.

**Wounded bonus**: the more pixels your hull is missing, the higher your kill-score multiplier —— ×1 at full hull, ×2 at half, ~×2.9 with a single pixel left, displayed next to the score (e.g. `X1.4`). Repairs and supplies stop being a no-brainer: patch up to survive, or stay wounded and farm points.

### Cave Terrain

On certain levels the battlefield grows **scrolling terrain** along the top and bottom edges (Arcade L3/L6 and their looped counterparts; Daily every 3rd level). It squeezes the navigable corridor, and **scraping it strips hull pixels** while pushing you back inside (with a short grace period, so a slope won't grind you to death). Terrain is seeded and reproducible: everyone sees the same cave on the same level (or the same day). Enemies and bullets fly in front of the terrain —— only the player collides.

### Enemies & Bosses

Eight enemy types, each with distinct movement: drone, darter, bomber (fires straight bullets), diver (homing dive), zigzag (bouncing), turret (aimed fire), swarm, and thief (see below). Each level ends with a boss —— **eight uniquely-styled bosses**, one per level (chosen by level, fully reproducible), each with rotating attack sequences and movement patterns, enraging and speeding up at low HP.

**The thief**: from L3 on, a supply cross has a 35% chance to attract a thief —— it enters two seconds later on the supply's row, beelines for the nearest pickup, and flees rightward at 1.5× speed once it grabs one. Kill it (or ram it) and the supply drops in place, still collectible; let it escape off the right edge and the supply is gone. "Kill it or grab it first" becomes a real-time dilemma exactly when you're hurt. The thief roll shares the supply's seeded sub-stream, so Daily runs stay reproducible.

**Elite variants** (appear after clearing the first loop, chance scaling 10% → 30% per loop): the variant is fixed per enemy kind —— drone/bomber become **splitters** (a tail marker; burst into two swarm on death), the rest become **shielded elites** (immune while the nose shield-bar is lit; hit them in the down-window). Elite kills score ×2, then the wounded-hull multiplier applies. Elite rolls are baked into the seeded timeline: everyone meets the same elites on the same level (or day).

### Upgrade Cards

After each level, pick 1 of 3 random upgrade cards:

| Upgrade        | Effect                         |
| -------------- | ------------------------------ |
| Rapid fire     | Higher fire rate               |
| Wingman        | An extra wing firing alongside |
| Piercing shots | Bullets pass through enemies   |
| Magnet         | Auto-attracts supplies         |
| Hull repair    | Restores some hull pixels      |

> There's a 300ms lock on entry, and you must release the fire key and press it again to confirm — so a held fire key (or rapid taps) from the previous level can't mis-pick a card.

### Items & Special Weapons

Two kinds of items drift across the screen:

- **Supplies** (cross icon): restore hull pixels.
- **Weapons** (appear at a fixed interval): grant a limited-ammo special weapon
  - 🚀 **Rocket** —— straight, high damage, consumed on hit (3 ammo)
  - ⚡ **Beam** —— a vertical column ahead of the ship's nose that advances forward, piercing the column ahead (1 ammo, damage 2)
  - ⭕ **Wheel** —— slow forward, pierces everything, resolves once per target (1 ammo)

> Picking up the same weapon adds ammo; a different one swaps and resets ammo. The switch key cycles between owned weapons. When ammo runs out the ship reverts to its default, infinite-ammo gun. The HUD shows the weapon icon and remaining ammo to the left of the level counter.

## 🛠️ Tech Stack

| Tool       | Version | Notes                                                |
| ---------- | ------- | ---------------------------------------------------- |
| Node.js    | 26.x    | Dev tooling only                                     |
| Vite       | 8.x     | Rolldown bundler, nearly zero plugins                |
| TypeScript | 6.0.x   | Type checking runs separately via `tsc --noEmit`     |
| Phaser     | 4.1.x   | Game engine: scenes, sprites, integer scaling, input |

Highlights:

- The internal resolution is **126×72**, scaled by an integer factor, and the whole game uses just the Nokia two-colour palette (light-green background `#c7f0d8` + dark-green foreground `#43523d`).
- Game logic in `src/core/` is fully framework-free and unit-tested; rendering and input live in `src/scenes/` and `src/ui/`.
- The in-game UI is in Traditional Chinese, drawn with a self-contained bitmap font (`src/ui/font.ts`): hand-made 3×5 glyphs for Latin/digits plus baked 12×12 glyphs for the handful of Chinese characters used. No external font file is loaded, preserving the strict two-colour look. The `PIXEL HULL` title and single-key hints (X/M/C) stay in English.

## 🧪 Testing

The pure-logic modules in `src/core/` run with Node's built-in test runner:

```bash
npm test            # node --test (core logic)
```

Covers PRNG (seed determinism), hull, waves, upgrades, weapons, daily seeding, and storage. The `src/core/` modules use `.ts` import specifiers so `node --test` can run them directly without a build step.

## 🎨 Code Quality

Two lines of defence: automatic checks on local commit (husky + lint-staged), and a full sweep in CI before deploy.

```bash
npm run lint          # ESLint across the project
npm run typecheck     # tsc --noEmit
npm run format        # Prettier
npm run format:check  # check only, no writes (for CI)
```

> A pre-commit hook runs `eslint --fix` and `prettier --write` on staged files.

## 📝 Development Commands

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `npm install`           | Install deps & set up husky hook         |
| `npm run dev`           | Start the dev server                     |
| `npm run dev -- --host` | Start the dev server, exposed on the LAN |
| `npm run build`         | Production build to `dist/`              |
| `npm run preview`       | Serve the production build               |
| `npm run lint`          | ESLint                                   |
| `npm run typecheck`     | `tsc --noEmit`                           |
| `npm test`              | `node --test` (core logic)               |
| `npm run format`        | Prettier                                 |

## 🚀 Deployment

The project builds to static files and deploys to **GitHub Pages**:

- `vite.config.ts` sets `base: '/pixel-hull/'`, which **must match the repository name** or asset paths will 404.
- `.github/workflows/deploy.yml` runs Lint → Type check → Test → Build, then deploys on push to `main`.
- The repo's **Settings → Pages → Source must be set to "GitHub Actions"** (not branch mode).

## 📄 License & Attribution

Inspired by _Space Impact_. Space Impact and Nokia are trademarks of their respective owners; this project is not affiliated with or endorsed by them. All pixel art is original, and the naming deliberately avoids those trademarks.

## 🙏 Acknowledgments

- Inspired by: the Nokia classic _Space Impact_
- Game Engine: [Phaser.js](https://phaser.io/)
- Pixel editor: [Piskel](https://www.piskelapp.com/)
- Sound effects: [jsfxr](https://sfxr.me/)
