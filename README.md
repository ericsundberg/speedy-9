# SPEEDY 9

**Nine microgames. One relentless clock. Your speed is the weapon.**

SPEEDY 9 is a browser-based arcade speedrunning game created for Micro Jam 062: SPEED. Inspired by the Vectrex, early vector displays, and the modern speedrunning scene, it challenges players to clear eight microgames, unlock the final stage, and finish the complete run as quickly as possible.

## The Goal

Complete all eight preliminary stages in any order. Each victory records a split and returns you to the stage-select screen. Once every preliminary stage has been cleared, the ninth and final stage unlocks.

Finish the final stage to stop the clock.

## Speedrunning

SPEEDY 9 is designed as a compact speedrunning game rather than a conventional high-score collection.

* The run uses a persistent master timer.
* Time spent selecting a stage is excluded from the run.
* Each completed stage records its own split.
* The LiveSplit-inspired HUD compares the current run against personal-best times.
* Faster segments display favorable deltas; slower segments display lost time.
* Penalties are added directly to the run time.
* Runs use seeded game state so a complete attempt remains internally consistent.
* Some stages reward experimentation, shortcuts, and unconventional routing.

## The Nine Stages

1. **Pitfall Run**
2. **Deadeye**
3. **Pong Blitz**
4. **Space War**
5. **Tic Tac Toe**
6. **Vector Maze**
7. **Memory Burst**
8. **Pace Racer**
9. **Locked** — the final stage

## Controls

Controls vary by stage and are displayed in the game.

Common inputs include:

* **WASD** or **Arrow Keys** — movement and selection
* **Mouse** — aiming and interaction
* **Left Click** — activate, fire, or select
* **Enter** or **Space** — confirm or interact

## Presentation

The game combines a monochrome vector-arcade presentation with a speedrunning broadcast interface.

Features include:

* Vectrex-inspired wireframe graphics
* CRT scan and glow effects
* A LiveSplit-inspired timing panel
* Stage splits, personal-best comparisons, and time deltas
* Procedurally synthesized music and sound effects
* Responsive browser-based play
* Keyboard and mouse controls

All music and sound effects are synthesized at runtime through the Web Audio API. The project does not depend on prerecorded audio files.

## Technology

* HTML
* CSS
* TypeScript
* Vite
* Vitest
* SVG and DOM-based rendering
* Web Audio API synthesis

## Development

Install dependencies:

```text
npm install
```

Start the development server:

```text
npm run dev
```

Run the automated tests:

```text
npm test
```

Run the TypeScript checker:

```text
npm run typecheck
```

Create a production build:

```text
npm run build
```

Preview the production build:

```text
npm run preview
```

The production build is written to `dist/`.

## Release Build

Before packaging a release, run:

```text
git diff --check
npm test
npm run typecheck
npm run build
```

Package the contents of `dist/` so that `index.html` is located at the root of the uploaded archive.

## Project Status

Complete game-jam release.

## Credits

Created by Eric Sundberg for Micro Jam 062: SPEED.
