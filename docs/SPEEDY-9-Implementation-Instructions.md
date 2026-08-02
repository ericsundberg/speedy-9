---
document_type: implementation-instruction-document
project_name: SPEEDY 9
document_version: 0.1.0
status: draft-for-review
instruction_strength: mandatory
intended_reader:
  - llm-coding-agent
  - human-developer
technology:
  language:
    - HTML
    - CSS
    - TypeScript
  bundler: Vite
  tests: Vitest
  rendering: SVG
  audio: Web Audio API
  version_control: Git
  remote: GitHub
platform:
  primary: desktop-browser
  deployment: itch.io-html5
game_structure:
  total_stages: 9
  preliminary_stages: 8
  final_stages: 1
primary_priorities:
  - complete-playable-run
  - accurate-timing
  - simple-stage-logic
  - deterministic-tests
  - rapid-restarts
  - scope-control
---

# SPEEDY 9 — Implementation Instruction Document

# 1. Purpose

This document defines the implementation rules, architecture, limits, shared systems, stage mechanics, testing requirements, and build sequence for **SPEEDY 9**.

This document is normative.

The coding agent MUST follow:

1. The human developer’s latest instruction
2. The Machine Development Prompt
3. The approved Game Design Document
4. This implementation document
5. Existing repository conventions
6. General best practices

When this document conflicts with a newer explicit human instruction, follow the newer instruction and report the conflict.

# 2. Required Outcome

The finished jam build MUST allow a player to:

1. Open the title screen
2. Begin a run
3. See the LiveSplit-inspired HUD
4. Select any of eight preliminary stages
5. Complete each preliminary stage once
6. See completed stages become locked
7. Unlock the ninth final stage
8. Complete the final stage
9. Stop the total timer
10. View the completed run result
11. Begin another run without reloading the page

The finished build MUST be deployable as a static itch.io HTML5 game.

# 3. Hard Limits

## 3.1 Project limits

The implementation MUST NOT include:

- React
- Vue
- Svelte
- Angular
- Phaser
- PixiJS
- Three.js
- A physics engine
- A backend
- Online accounts
- Online leaderboards
- Cloud saves
- Remote analytics
- Remote fonts
- Remote audio
- Required network requests after load
- More than nine required stages
- Procedural campaign generation
- Multiplayer
- Large narrative systems
- Complex character animation rigs
- Unapproved dependencies

## 3.2 Stage limits

Each stage MUST:

- Have one clear objective
- Fit within one compact implementation module
- Have one completion condition
- Have one restart path
- Use simple collision primitives
- Avoid complex AI
- Avoid elaborate menus
- Avoid long transitions
- Be playable independently through a test harness or stage launcher when practical

Each stage SHOULD take less than 90 minutes to reach a playable prototype during jam production.

If a stage exceeds that limit, simplify it before adding polish.

## 3.3 File limits

A file SHOULD NOT exceed approximately 300 lines without a clear reason.

A file MUST NOT combine unrelated responsibilities.

A stage file MAY exceed 300 lines temporarily during prototyping, but it SHOULD be split before release if readability suffers.

## 3.4 Runtime limits

The game MUST:

- Avoid unnecessary DOM creation inside the animation loop
- Avoid repeated full-document queries per frame
- Avoid unbounded arrays
- Remove event listeners on teardown
- Cancel animation frames on teardown
- Stop or disconnect audio nodes on teardown
- Avoid per-frame layout thrashing
- Handle hidden-tab suspension safely

# 4. Definitions

- **Application shell**: the persistent page-level layout containing the HUD, game viewport, overlays, and shared services.
- **Run manager**: the authoritative owner of total run state, completed stages, splits, penalties, current stage, and final unlock.
- **Stage registry**: the map from stage IDs to stage factories and metadata.
- **Stage module**: one self-contained minigame implementation.
- **Stage context**: shared services passed into a stage.
- **Stage seed**: deterministic random seed created at run start and used for stage content.
- **Simulation state**: authoritative TypeScript data representing gameplay.
- **Render state**: SVG DOM derived from simulation state.
- **Logical coordinates**: numeric gameplay coordinates independent of CSS pixels.
- **Run time**: wall-clock elapsed time since BEGIN RUN, plus explicit penalties if penalties are not already incorporated into elapsed time.
- **Segment time**: active time spent inside one stage, plus stage-specific penalties.
- **Hub time**: time spent selecting stages; included in total time but not in segment time.
- **Completion lock**: the state preventing a completed preliminary stage from being replayed during the same run.
- **Clock Core**: the central visual object representing the run’s antagonist and final-stage lock.
- **Speed strike**: the visual attack triggered when a stage is completed.
- **MVP**: the smallest complete jam build satisfying all required progression and stage completion paths.

# 5. Repository and Toolchain

## 5.1 Initial repository structure

Use a structure similar to:

```text
speedy-9/
├── public/
│   ├── fonts/
│   │   ├── workbench.ttf
│   │   └── workbench.woff2
│   └── favicon.svg
├── src/
│   ├── app/
│   │   ├── app-controller.ts
│   │   ├── app-state.ts
│   │   ├── scene-router.ts
│   │   └── stage-registry.ts
│   ├── audio/
│   │   ├── audio-engine.ts
│   │   ├── music-sequencer.ts
│   │   ├── music-tracks.ts
│   │   ├── sound-effects.ts
│   │   └── synth-types.ts
│   ├── core/
│   │   ├── clock.ts
│   │   ├── collision.ts
│   │   ├── geometry.ts
│   │   ├── input-manager.ts
│   │   ├── random.ts
│   │   ├── svg-helpers.ts
│   │   └── time-format.ts
│   ├── hud/
│   │   ├── hud-controller.ts
│   │   ├── hud-model.ts
│   │   └── hud-view.ts
│   ├── persistence/
│   │   ├── records-store.ts
│   │   ├── settings-store.ts
│   │   └── storage-schema.ts
│   ├── run/
│   │   ├── run-manager.ts
│   │   ├── run-state.ts
│   │   ├── split-calculator.ts
│   │   └── stage-progress.ts
│   ├── scenes/
│   │   ├── title-scene.ts
│   │   ├── hub-scene.ts
│   │   ├── results-scene.ts
│   │   └── pause-overlay.ts
│   ├── stages/
│   │   ├── shared/
│   │   │   ├── stage-contract.ts
│   │   │   ├── stage-context.ts
│   │   │   └── stage-result.ts
│   │   ├── reverse-circuit/
│   │   ├── deadeye/
│   │   ├── pong-blitz/
│   │   ├── pit-sprint/
│   │   ├── tower-climb/
│   │   ├── vector-maze/
│   │   ├── memory-burst/
│   │   ├── times-rush/
│   │   └── speed-lock/
│   ├── styles/
│   │   ├── base.css
│   │   ├── layout.css
│   │   ├── hud.css
│   │   ├── vector.css
│   │   ├── overlays.css
│   │   └── responsive.css
│   ├── main.ts
│   └── types.ts
├── tests/
│   ├── core/
│   ├── run/
│   ├── persistence/
│   └── stages/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

This structure MAY be simplified during the jam, but responsibilities MUST remain separated.

## 5.2 Required scripts

`package.json` SHOULD define:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

A lint script MAY be added if linting is introduced without threatening schedule.

## 5.3 Vite configuration

The Vite base path MUST support static subdirectory hosting.

Preferred configuration:

```ts
export default defineConfig({
  base: './',
});
```

All required assets MUST resolve from the built `dist/` directory.

# 6. TypeScript Rules

TypeScript MUST use strict mode.

Recommended compiler options:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true
  }
}
```

The code MUST avoid `any`.

Use discriminated unions for application and run states where practical.

Example:

```ts
type AppScene =
  | { kind: 'title' }
  | { kind: 'hub' }
  | { kind: 'stage'; stageId: StageId }
  | { kind: 'results' };
```

# 7. Shared Coordinate Model

## 7.1 Logical viewport

The game viewport MUST use one logical SVG coordinate system across scenes and stages.

Recommended logical size:

```text
width: 960
height: 720
viewBox: 0 0 960 720
```

The exact size MAY change before implementation begins, but it MUST remain consistent after shared systems are built.

## 7.2 Coordinate rules

- Origin is top-left.
- Positive X moves right.
- Positive Y moves down.
- Logical coordinates are independent of browser pixel dimensions.
- CSS scales the SVG while preserving aspect ratio.
- Gameplay constants use logical units only.
- Pointer input MUST be transformed into logical coordinates.

## 7.3 Pointer conversion

Use the SVG screen transformation matrix or the rendered bounding rectangle.

The conversion function MUST be shared and tested.

Representative approach:

```ts
function clientPointToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): Vec2 {
  const rect = svg.getBoundingClientRect();

  return {
    x: ((clientX - rect.left) / rect.width) * 960,
    y: ((clientY - rect.top) / rect.height) * 720,
  };
}
```

If letterboxing is introduced through `preserveAspectRatio`, the conversion MUST account for the actual content rectangle rather than assuming the full CSS rectangle maps directly.

# 8. Geometry and Collision Model

## 8.1 Required primitives

Create reusable types:

```ts
interface Vec2 {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Circle {
  x: number;
  y: number;
  radius: number;
}
```

## 8.2 Required collision helpers

Implement and test:

- `rectsOverlap(a, b)`
- `pointInRect(point, rect)`
- `circlesOverlap(a, b)`
- `circleIntersectsRect(circle, rect)`
- `clamp(value, min, max)`
- `normalizeVector(vector)`
- `distanceSquared(a, b)`
- `moveToward(current, target, maxDelta)`

Line-segment helpers MAY be added where required.

## 8.3 Collision rules

- Simulation geometry is authoritative.
- SVG stroke width and glow do not affect collision.
- Hitboxes SHOULD be slightly smaller or more forgiving than visuals.
- Collision must be deterministic.
- No collision check may depend on browser layout queries per frame.
- Axis-aligned rectangles are the default collision shape.
- Circles are allowed where they simplify target or ball logic.

# 9. Input System

## 9.1 Input manager responsibilities

The shared input manager MUST track:

- Held keys
- Keys pressed this frame
- Keys released this frame
- Pointer position in logical coordinates
- Pointer button held
- Pointer button pressed this frame
- Pointer button released this frame
- Window blur
- Document visibility

## 9.2 Input lifecycle

The input manager MUST:

- Register listeners once
- Avoid duplicate listeners on stage changes
- Clear one-frame states after each update
- Prevent browser scrolling for gameplay keys only while appropriate
- Expose query methods rather than mutable sets directly

Representative API:

```ts
interface InputSnapshot {
  isKeyHeld(code: string): boolean;
  wasKeyPressed(code: string): boolean;
  wasKeyReleased(code: string): boolean;
  pointer: Vec2;
  isPointerHeld(button?: number): boolean;
  wasPointerPressed(button?: number): boolean;
  wasPointerReleased(button?: number): boolean;
}
```

## 9.3 Movement input

For stages using directional movement:

```ts
const movement = normalizeVector({
  x: horizontalInput,
  y: verticalInput,
});
```

Diagonal movement MUST be normalized.

# 10. Clock and Timing Architecture

## 10.1 Clock abstraction

Use an injectable clock:

```ts
interface Clock {
  nowMs(): number;
}
```

Production implementation:

```ts
class PerformanceClock implements Clock {
  nowMs(): number {
    return performance.now();
  }
}
```

Tests use a fake clock.

## 10.2 Run time

The run manager stores:

```ts
interface ActiveRunTiming {
  runStartedAtMs: number;
  runEndedAtMs: number | null;
  totalPenaltyMs: number;
}
```

Total displayed time:

```ts
elapsed = effectiveNow - runStartedAtMs + totalPenaltyMs;
```

If penalties are added directly to stage segment results but not total time, that MUST be documented and applied consistently. Preferred behavior is to add penalties to both segment and total run penalty.

## 10.3 Segment time

On stage entry:

```ts
segmentStartedAtMs = clock.nowMs();
segmentPenaltyMs = 0;
```

On completion:

```ts
segmentDurationMs =
  clock.nowMs() - segmentStartedAtMs + segmentPenaltyMs;
```

## 10.4 Frame delta

Use `requestAnimationFrame()`.

Simulation delta MUST be clamped.

Recommended:

```ts
const MAX_FRAME_DELTA_MS = 100;
```

The timer remains based on direct clock subtraction, not accumulated clamped delta.

# 11. Run State Machine

## 11.1 Run states

Use a discriminated union:

```ts
type RunState =
  | { kind: 'idle' }
  | { kind: 'hub'; run: ActiveRun }
  | {
      kind: 'stage';
      run: ActiveRun;
      stageId: PreliminaryStageId | FinalStageId;
      segmentStartedAtMs: number;
      segmentPenaltyMs: number;
    }
  | { kind: 'complete'; result: CompletedRun };
```

## 11.2 Active run data

```ts
interface ActiveRun {
  seed: number;
  runStartedAtMs: number;
  totalPenaltyMs: number;
  completedStageIds: PreliminaryStageId[];
  completionOrder: PreliminaryStageId[];
  splits: Partial<Record<StageId, SplitResult>>;
}
```

## 11.3 Preliminary stage availability

A preliminary stage is selectable only when:

```ts
!completedStageIds.includes(stageId)
```

## 11.4 Final stage unlock

The final stage unlocks only when:

```ts
completedStageIds.length === 8
```

## 11.5 Run completion

Completing `speed-lock` transitions directly to `complete`.

The completion timestamp MUST be captured before running presentation animations.

# 12. Stage Contract

Use one required stage interface.

Recommended:

```ts
export interface Stage {
  readonly id: StageId;

  mount(context: StageContext): void;
  start(): void;
  update(deltaSeconds: number): void;
  render(): void;
  restart(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

## 12.1 Stage context

```ts
export interface StageContext {
  readonly svg: SVGSVGElement;
  readonly input: InputManager;
  readonly audio: AudioEngine;
  readonly clock: Clock;
  readonly random: RandomSource;
  readonly runSeed: number;
  readonly stageSeed: number;

  complete(result?: StageCompletionData): void;
  fail(reason?: StageFailureReason): void;
  addPenalty(milliseconds: number, reason: string): void;
  requestPause(): void;
}
```

## 12.2 Stage rules

A stage MUST NOT:

- Directly modify run state
- Directly change HUD split data
- Write persistent records
- Navigate scenes by itself
- Import mutable singleton run state
- Depend on another stage module

A stage MUST communicate through `StageContext`.

# 13. Stage Registry

Define all stage metadata centrally.

```ts
interface StageDefinition {
  id: StageId;
  shortName: string;
  displayName: string;
  kind: 'preliminary' | 'final';
  order: number;
  iconId: string;
  create(): Stage;
}
```

The HUD, hub, results screen, and router MUST consume this registry rather than duplicating stage names and order.

# 14. Randomness

## 14.1 Seed rules

A new run creates one random integer seed.

Each stage derives a deterministic stage seed from:

```text
run seed + stage ID
```

## 14.2 Restart rules

Restarting a stage MUST reuse the same stage seed.

This applies to:

- Deadeye target order
- Memory Burst card order
- Times Rush question sequence
- Any future randomized stage content

## 14.3 Random source

Use an injectable deterministic PRNG.

The implementation MAY use a small local algorithm such as Mulberry32.

No external dependency is required.

# 15. SVG Rendering System

## 15.1 Shared SVG shell

The game viewport contains one persistent `<svg>`.

Each scene or stage mounts into a dedicated `<g>` root.

Suggested structure:

```html
<svg id="game-svg" viewBox="0 0 960 720" aria-label="Game area">
  <defs id="shared-svg-defs"></defs>
  <g id="scene-root"></g>
  <g id="effects-root"></g>
  <g id="overlay-root"></g>
</svg>
```

## 15.2 Rendering rules

- Create SVG elements with `document.createElementNS`.
- Reuse elements where practical.
- Update attributes rather than recreating the full stage each frame.
- Use classes for common stroke and glow styling.
- Keep gameplay state in TypeScript objects.
- Use `<text>` sparingly for game-display labels.
- Use the Workbench font only where legible.

## 15.3 Shared visual classes

Define reusable classes such as:

```css
.vector-line
.vector-line--dim
.vector-line--bright
.vector-fill
.vector-danger
.vector-success
.vector-flicker
```

## 15.4 Glow

Use restrained SVG or CSS filters.

Glow MUST NOT:

- Hide shape boundaries
- Cause unreadable text
- Produce excessive full-screen blur
- Become required to understand collision

# 16. LiveSplit-Inspired HUD

## 16.1 HUD ownership

The HUD MUST be controlled by a dedicated controller or view model.

The run manager supplies state.

The HUD does not own game state.

## 16.2 HUD data model

```ts
interface HudModel {
  title: string;
  currentStageId: StageId | null;
  rows: HudStageRow[];
  totalTimeMs: number;
  previousSegmentDeltaMs: number | null;
  personalBestTimeMs: number | null;
  totalPenaltyMs: number;
  runStatus: 'idle' | 'active' | 'complete';
}
```

## 16.3 Fixed row order

Rows remain in registry order regardless of completion order.

## 16.4 Delta rules

For each completed stage:

```text
current segment - stored best segment
```

For total time:

```text
current total - stored personal-best total
```

When no comparison exists, display a neutral placeholder.

## 16.5 HUD rendering frequency

The large timer MAY update every animation frame.

Static rows SHOULD update only when state changes.

# 17. Persistence

## 17.1 Storage keys

Use versioned keys.

Example:

```text
speedy9.records.v1
speedy9.settings.v1
```

## 17.2 Records schema

```ts
interface RecordsV1 {
  schemaVersion: 1;
  personalBestRunMs: number | null;
  bestSegmentsMs: Partial<Record<StageId, number>>;
  previousRun: CompletedRunSummary | null;
}
```

## 17.3 Validation

Local storage MUST be parsed through runtime validation.

At minimum:

- Confirm object shape
- Confirm schema version
- Confirm numeric values are finite and non-negative
- Ignore unknown stage IDs
- Fall back safely on failure

No external validation library is required.

# 18. Audio Architecture

## 18.1 Audio method

All music and sound effects MUST be synthesized in TypeScript using the Web Audio API.

No prerecorded audio files are required.

## 18.2 Audio engine

The audio engine owns:

- `AudioContext`
- Master gain
- Music gain
- Sound-effect gain
- Initialization after user gesture
- Mute state
- Active scheduled nodes
- Cleanup and suspension behavior

Representative API:

```ts
interface AudioEngine {
  initialize(): Promise<void>;
  setMuted(muted: boolean): void;
  setMusicVolume(value: number): void;
  setSfxVolume(value: number): void;
  playSfx(id: SoundEffectId): void;
  playMusic(id: MusicTrackId): void;
  stopMusic(fadeSeconds?: number): void;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  destroy(): void;
}
```

## 18.3 Synth note format

```ts
interface SynthNote {
  frequencyHz: number;
  startBeat: number;
  durationBeats: number;
  gain: number;
  waveform: OscillatorType;
  attackSeconds?: number;
  releaseSeconds?: number;
  endFrequencyHz?: number;
}
```

## 18.4 Music track format

```ts
interface MusicTrack {
  id: MusicTrackId;
  tempoBpm: number;
  lengthBeats: number;
  loop: boolean;
  notes: readonly SynthNote[];
}
```

## 18.5 Sequencing rules

- Convert beats to AudioContext seconds.
- Schedule notes slightly ahead of playback.
- Do not use `setInterval()` as the authoritative audio clock.
- Use the AudioContext clock.
- Rebuild or reschedule cleanly when music changes.
- Avoid orphaned oscillators.
- Use short attack and release ramps to reduce clicks.

## 18.6 Sound effects

Sound effects are short synth recipes.

Representative type:

```ts
interface SoundEffectStep {
  frequencyHz: number;
  durationSeconds: number;
  gain: number;
  waveform: OscillatorType;
  frequencySlideToHz?: number;
  delaySeconds?: number;
}
```

Required sound-effect IDs SHOULD include:

- `menu-move`
- `menu-confirm`
- `stage-start`
- `jump`
- `target-hit`
- `error`
- `point-score`
- `match`
- `stage-complete`
- `clock-strike`
- `final-unlock`
- `personal-best`
- `run-complete`

## 18.7 Music scope

MVP:

- One title/hub loop
- One gameplay loop
- One final-stage variation
- Core SFX

Stretch:

- Stage-specific arrangements using shared patterns
- Tempo or instrumentation changes as the Clock Core weakens

# 19. Scene Architecture

## 19.1 Required scenes

- Title
- Hub
- Stage
- Results

Pause is an overlay, not a full scene.

## 19.2 Title scene

Must provide:

- Game title
- BEGIN RUN
- Controls
- Audio toggle
- Credits
- Personal-best summary

Starting the run MUST initialize audio only after the initiating user gesture.

## 19.3 Hub scene

Must provide:

- 3-by-3 stage arrangement
- Central final stage / Clock Core
- Stage states
- Keyboard and pointer selection
- Clock Core damage progression
- Immediate stage launch

## 19.4 Results scene

Must provide:

- Final time
- PB result
- Segment table
- Completion order
- Penalties
- Retry
- Return to title

# 20. Pause and Visibility

## 20.1 Pause

Escape opens the pause overlay.

While paused:

- Stage simulation is stopped
- Total run timer continues
- Audio is reduced or suspended
- Resume is available
- Restart stage is available
- Abandon run is available

## 20.2 Hidden tab

When `document.hidden === true`:

- Stop stage simulation updates
- Continue total timer through clock subtraction
- Suspend or silence audio
- Show a brief resume overlay when visible again if needed

# 21. Shared Restart Behavior

Pressing `R` during an active stage MUST:

1. Ignore repeated keydown auto-repeat
2. Call stage restart
3. Clear temporary stage effects
4. Restore stage-local deterministic state
5. Preserve run and stage penalties already incurred
6. Preserve stage seed
7. Resume gameplay immediately

Restart MUST NOT:

- Return to hub
- Reset total time
- Reset other splits
- Generate a new board or question sequence
- Create duplicate listeners
- Leave old audio nodes active

# 22. Stage Implementation Specifications

# 22.1 Reverse Circuit

## 22.1.1 State

```ts
interface ReverseCircuitState {
  car: {
    position: Vec2;
    rotationRadians: number;
    speed: number;
  };
  currentCheckpointIndex: number;
  route: 'main' | 'shortcut' | null;
  finished: boolean;
}
```

## 22.1.2 Mechanics

Use arcade car motion.

Recommended update logic:

1. Read forward/reverse input.
2. Apply acceleration.
3. Apply drag.
4. Clamp speed.
5. Apply steering scaled by current speed.
6. Calculate proposed position.
7. Resolve collision against track boundaries.
8. Update checkpoints.
9. Detect finish.

## 22.1.3 Simplified car model

Recommended constants:

```text
max forward speed: 260 logical units/second
max reverse speed: 120 logical units/second
acceleration: 300 units/second²
drag: 220 units/second²
turn speed: 2.4 radians/second
```

These values are tuning starting points only.

## 22.1.4 Track representation

Preferred approach:

- Build the track as a series of allowed rectangular or polygonal regions.
- Build walls as rectangles or line segments.
- Use explicit checkpoint rectangles.
- Use one finish rectangle.
- Use a separate shortcut checkpoint sequence.

Do not use path geometry queries every frame.

## 22.1.5 Collision

Preferred collision approximation:

- Car hitbox: axis-aligned rectangle centered on the car
- Track walls: rectangles or segments
- On collision: cancel proposed movement and reduce speed

Rotated rectangle collision is not required.

## 22.1.6 Shortcut logic

At run start, both routes are valid.

Route validation:

- Crossing first main checkpoint sets route to `main`.
- Entering rear shortcut gate sets route to `shortcut`.
- Once set, route cannot change.
- Finish is valid only after all checkpoints for the selected route are passed.

## 22.1.7 Tests

Test:

- Speed clamps
- Drag approaches zero
- Checkpoint order
- Shortcut route validity
- Finish cannot trigger early
- Restart restores initial state

---

# 22.2 Deadeye

## 22.2.1 State

```ts
interface DeadeyeState {
  targets: TargetState[];
  activeTargetIndex: number;
  hits: number;
  misses: number;
  complete: boolean;
}
```

## 22.2.2 Target model

```ts
interface TargetState {
  id: number;
  position: Vec2;
  radius: number;
  active: boolean;
  hit: boolean;
}
```

## 22.2.3 Mechanics

Preferred implementation:

- Precompute 10–12 target positions from the stage seed.
- Show one target at a time for MVP.
- Pointer click checks circle hit.
- Hit advances immediately.
- Miss adds 500 ms penalty.
- Complete after final hit.

## 22.2.4 Position generation

Each target must:

- Stay inside a safe margin
- Avoid instruction overlay
- Avoid overlapping the previous target excessively
- Use a minimum distance from the previous target
- Be deterministic

## 22.2.5 Hit detection

Use:

```ts
distanceSquared(pointer, target.position) <= target.radius ** 2
```

## 22.2.6 Tests

Test:

- Generated targets stay in bounds
- Same seed creates same positions
- Different seed can create different positions
- Hit advances
- Miss adds penalty
- Final hit completes stage

---

# 22.3 Pong Blitz

## 22.3.1 State

```ts
interface PongState {
  playerY: number;
  computerY: number;
  ball: {
    position: Vec2;
    velocity: Vec2;
  };
  playerScore: number;
  computerScore: number;
  roundDelayMs: number;
  complete: boolean;
}
```

## 22.3.2 Mechanics

- Player paddle moves vertically.
- Computer paddle tracks ball with bounded speed.
- Ball reflects from top/bottom.
- Ball reflects from paddles.
- Contact offset changes vertical velocity.
- Ball speed increases modestly after paddle contact.
- First to two wins.

## 22.3.3 Computer behavior

The AI MUST be simple and fallible.

Recommended:

- Track ball target Y.
- Add deterministic reaction delay or target offset.
- Limit paddle movement speed.
- Use a lower speed than perfect tracking requires.

## 22.3.4 Ball reset

After a point:

- Update score.
- Delay no more than 500 ms.
- Reset ball in center.
- Serve toward the player who lost the previous point or alternate deterministically.

## 22.3.5 Stage failure

If computer reaches two:

- Play error cue.
- Restart stage after a very short delay.
- Total timer continues.

## 22.3.6 Tests

Test:

- Top/bottom bounce
- Paddle bounce
- Score increment
- First-to-two completion
- Computer victory triggers reset
- Ball reset direction

---

# 22.4 Pit Sprint

## 22.4.1 State

```ts
interface PitSprintState {
  player: {
    position: Vec2;
    velocity: Vec2;
    grounded: boolean;
  };
  cameraX: number;
  checkpointId: string | null;
  complete: boolean;
}
```

## 22.4.2 Physics

Use simple platformer physics:

- Horizontal acceleration or direct speed
- Gravity
- Jump impulse
- Axis-separated rectangle collision
- Terminal fall speed

Recommended update order:

1. Apply horizontal input.
2. Apply gravity.
3. Move X and resolve.
4. Move Y and resolve.
5. Update grounded state.
6. Check hazards.
7. Check checkpoint.
8. Check exit.

## 22.4.3 Collision

Player: AABB  
Platforms: AABB  
Hazards: AABB  
Exit: AABB

Use axis-separated collision resolution.

## 22.4.4 Camera

Preferred MVP:

- Single wide logical level
- Camera tracks player X
- Stage root `<g>` translates horizontally

The HUD and overlays remain stationary.

## 22.4.5 Failure

On hazard or fall:

- Restore player to start or approved checkpoint
- Reset velocity
- Preserve total timer

## 22.4.6 Tests

Test:

- Gravity
- Landing
- Horizontal wall collision
- Jump only while grounded
- Hazard reset
- Exit completion

---

# 22.5 Tower Climb

## 22.5.1 State

```ts
interface TowerClimbState {
  player: {
    position: Vec2;
    velocity: Vec2;
    mode: 'platform' | 'ladder';
    grounded: boolean;
  };
  hazards: HazardState[];
  complete: boolean;
}
```

## 22.5.2 Ladder rules

Enter ladder mode when:

- Player overlaps a ladder region
- Up or down input is active

In ladder mode:

- Gravity is disabled or reduced
- Vertical input controls climbing
- Horizontal movement is limited
- Jump or horizontal exit leaves ladder mode

## 22.5.3 Hazard rules

Hazards follow deterministic paths.

Recommended hazard model:

- A small number of rolling circles or vector objects
- Move along predefined platform segments
- Reverse or wrap at segment ends
- Reset on player contact

## 22.5.4 Goal

A top-platform goal rectangle completes the stage.

## 22.5.5 Tests

Test:

- Ladder entry
- Ladder climb
- Ladder exit
- Hazard path movement
- Hazard reset
- Goal completion

---

# 22.6 Vector Maze

## 22.6.1 State

```ts
interface VectorMazeState {
  player: {
    position: Vec2;
    radius: number;
  };
  complete: boolean;
}
```

## 22.6.2 Movement

Use normalized directional movement.

Recommended speed:

```text
180–240 logical units/second
```

## 22.6.3 Maze representation

Use a fixed array of wall rectangles.

```ts
const walls: readonly Rect[] = [...]
```

## 22.6.4 Collision

Preferred resolution:

1. Calculate proposed X movement.
2. Reject or clamp if circle intersects a wall.
3. Calculate proposed Y movement.
4. Reject or clamp if circle intersects a wall.

AABB player collision MAY replace circle collision if simpler.

## 22.6.5 Exit

Use a visible exit rectangle.

Complete on overlap.

## 22.6.6 Tests

Test:

- Diagonal normalization
- Wall blocking
- Corner behavior
- Exit completion
- Restart position

---

# 22.7 Memory Burst

## 22.7.1 State

```ts
interface MemoryBurstState {
  tiles: MemoryTile[];
  firstSelection: number | null;
  secondSelection: number | null;
  resolutionEndsAtMs: number | null;
  matchedPairCount: number;
  complete: boolean;
}
```

## 22.7.2 Tile model

```ts
interface MemoryTile {
  id: number;
  pairId: number;
  state: 'hidden' | 'revealed' | 'matched';
}
```

## 22.7.3 Board creation

- Create pair IDs `[0, 0, 1, 1, 2, 2, 3, 3]`.
- Shuffle with seeded PRNG.
- Store order for stage restarts.

## 22.7.4 Selection rules

- Ignore matched tiles.
- Ignore already revealed tile.
- Ignore input while mismatch resolution is active.
- Reveal first tile.
- Reveal second tile.
- If match, mark both matched immediately or after a very brief cue.
- If mismatch, hide both after 250–400 ms.
- Complete at four matched pairs.

## 22.7.5 Tests

Test:

- Seeded shuffle
- Same seed same board
- Selection state
- Match resolution
- Mismatch delay
- Input blocked during resolution
- Completion after four pairs

---

# 22.8 Times Rush

## 22.8.1 State

```ts
interface TimesRushState {
  questions: MultiplicationQuestion[];
  currentQuestionIndex: number;
  input: string;
  correctCount: number;
  complete: boolean;
}
```

## 22.8.2 Question model

```ts
interface MultiplicationQuestion {
  left: number;
  right: number;
  answer: number;
}
```

## 22.8.3 Generation

- Generate five questions at run start.
- Operands are integers from 2 through 12.
- Prevent invalid values.
- Optionally avoid exact duplicate question pairs.
- Use seeded random source.
- Restart uses the same sequence.

## 22.8.4 Input

- Accept digits.
- Accept Backspace.
- Enter submits.
- Ignore other printable keys.
- Limit input length.
- Prevent negative signs and decimal points.

## 22.8.5 Submission

If correct:

- Play confirmation.
- Advance immediately.
- Complete after fifth answer.

If wrong:

- Add 1000 ms penalty.
- Clear input.
- Keep current question.

## 22.8.6 Tests

Test:

- Question bounds
- Deterministic sequence
- Input filtering
- Correct advancement
- Wrong-answer penalty
- Completion after five

---

# 22.9 Speed Lock

## 22.9.1 State

```ts
interface SpeedLockState {
  rows: GuessRow[];
  currentRowIndex: number;
  currentInput: string;
  complete: boolean;
}
```

## 22.9.2 Constants

```ts
const ANSWER = 'SPEED';
const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
```

## 22.9.3 Guess evaluation

Use duplicate-letter-safe evaluation.

Required algorithm:

1. Mark exact-position matches.
2. Count remaining unmatched answer letters.
3. For each remaining guessed letter:
   - Mark present if remaining count is positive.
   - Decrement count.
   - Otherwise mark absent.

Feedback states:

```ts
type LetterFeedback = 'correct' | 'present' | 'absent';
```

## 22.9.4 Input

- Accept A–Z.
- Normalize to uppercase.
- Backspace deletes.
- Enter submits only at five letters.
- Word dictionary validation is optional and omitted for MVP.

## 22.9.5 Completion

Submitting `SPEED`:

- Captures completion immediately
- Stops run timer through run manager callback
- Triggers final attack presentation after timing capture

## 22.9.6 Failure

After six wrong attempts:

- Play failure cue
- Clear board after a short delay
- Restart final stage
- Keep total timer running

## 22.9.7 Tests

Test:

- Exact matches
- Present letters
- Absent letters
- Duplicate letter handling
- Input normalization
- Incomplete submission ignored
- Correct answer completion
- Six failed attempts reset

# 23. Clock Core and Speed Strike

## 23.1 Core state

The hub derives Clock Core damage from completed stage count.

```ts
damageLevel = completedStageIds.length;
```

## 23.2 Armor sections

Render eight armor segments around the core.

Each completed preliminary stage breaks one segment.

The mapping SHOULD follow fixed stage registry order, not completion order.

## 23.3 Strike strength

Define optional presentation rank from stage time and par:

```ts
ratio = segmentTimeMs / parTimeMs;
```

Suggested categories:

- `S`: ratio <= 0.70
- `A`: ratio <= 0.90
- `B`: ratio <= 1.10
- `C`: ratio > 1.10

This ranking is presentational only.

## 23.4 Strike sequence

Required sequence:

1. Stage completes.
2. Segment timestamp captured.
3. Split stored.
4. Brief vector beam travels to the Clock Core.
5. One armor segment breaks.
6. Return to hub.

The timer MUST continue throughout.

The sequence SHOULD take no more than approximately 500 ms.

# 24. CSS and Layout

## 24.1 Root layout

Use CSS grid.

Suggested:

```css
.game-shell {
  display: grid;
  grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
  width: min(100vw, 1280px);
  aspect-ratio: 16 / 9;
  max-height: 100vh;
}
```

## 24.2 Game viewport

The viewport MUST:

- Preserve aspect ratio
- Avoid internal scrolling
- Scale SVG cleanly
- Keep the HUD separate
- Maintain black background

## 24.3 Minimum viewport

Recommended supported minimum:

```text
960 × 540 CSS pixels
```

Below that size, the game MAY scale down but MUST remain legible enough to show a warning if necessary.

## 24.4 Responsive fallback

For narrow screens:

- HUD MAY reduce width
- Row font size MAY reduce slightly
- Nonessential labels MAY collapse
- The game MUST NOT place the HUD over the game area

A vertical layout is optional and not required for the jam build.

# 25. Font Handling

## 25.1 Local font

Use:

```css
@font-face {
  font-family: 'Workbench';
  src:
    url('/fonts/workbench.woff2') format('woff2'),
    url('/fonts/workbench.ttf') format('truetype');
  font-display: swap;
}
```

With Vite `base: './'`, asset URLs SHOULD be verified in the built output.

A relative URL from CSS MAY be safer depending on final file location.

## 25.2 Font conversion

Convert TTF to WOFF2 only if:

- License permits
- Conversion succeeds
- Browser rendering is verified
- Original TTF remains available during development

Do not share font files outside the project package.

# 26. Testing Plan

## 26.1 Highest-priority tests

Implement first:

- Run state transitions
- Stage locking
- Final unlock
- Timer calculations
- Split calculations
- Penalty calculations
- Time formatting
- Seeded randomness
- Local storage validation
- Speed Lock evaluation

## 26.2 Stage logic tests

Each stage MUST have tests for:

- Initial state
- Completion condition
- Restart
- Failure or penalty behavior
- Deterministic content if randomized

## 26.3 DOM tests

Use minimal DOM tests.

Prefer testing pure functions and state transitions.

Do not spend excessive time snapshot-testing SVG markup.

## 26.4 Manual browser checks

For each stage verify:

- Controls
- Scaling
- Visual readability
- Audio cue
- Restart
- Completion
- No duplicate listeners
- No console errors

# 27. Implementation Sequence

Work in the following order.

## Phase 0 — Repository Setup

Deliver:

- Git repository
- Vite TypeScript project
- Vitest
- Base scripts
- Static build
- Initial README
- No gameplay

Verification:

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Phase 1 — Application Shell

Deliver:

- Root HTML
- CSS grid layout
- HUD placeholder
- SVG viewport
- Scene router
- Title scene
- Workbench font loading
- Responsive baseline

Do not implement full stages yet.

## Phase 2 — Core Services

Deliver:

- Clock abstraction
- Input manager
- Random source
- Geometry helpers
- Collision helpers
- SVG helpers
- Time formatting
- Unit tests

## Phase 3 — Run Manager

Deliver:

- Run state machine
- Begin run
- Hub state
- Enter stage
- Complete stage
- Lock stage
- Final unlock
- Complete run
- Restart run
- Unit tests

## Phase 4 — HUD

Deliver:

- Nine stage rows
- Current row highlight
- Total timer
- Completed split times
- Deltas
- PB placeholder
- Penalty display
- Responsive styling

## Phase 5 — Hub and Clock Core

Deliver:

- 3-by-3 stage grid
- Keyboard navigation
- Pointer navigation
- Stage availability
- Completed locks
- Central Clock Core
- Eight damage segments
- Final unlock presentation

## Phase 6 — Stage Placeholders

Create all nine stage modules with:

- Stage contract
- Mount
- Start
- Restart
- Destroy
- Temporary complete button or debug completion path

The entire run MUST be completable using placeholders before full stage mechanics are developed.

## Phase 7 — Fastest Stages First

Implement:

1. Vector Maze
2. Times Rush
3. Memory Burst
4. Deadeye
5. Speed Lock

These establish movement, pointer, seeded randomness, text input, and final completion.

## Phase 8 — Remaining Arcade Stages

Implement:

6. Pong Blitz
7. Pit Sprint
8. Tower Climb
9. Reverse Circuit

Reverse Circuit is last because it has the highest implementation risk.

## Phase 9 — Audio

Deliver:

- Audio engine
- User-gesture initialization
- Master mute
- Core SFX
- Title/hub loop
- Gameplay loop
- Final-stage variation

Audio MUST not block release if unavailable.

## Phase 10 — Persistence

Deliver:

- Versioned records store
- PB run
- Best segments
- Previous run
- Audio settings
- Validation and fallback tests

## Phase 11 — Polish

Deliver only after complete run works:

- Speed strikes
- Clock Core break effects
- Stage intro cards
- Stage completion effects
- Music variation
- Reduced-motion refinements
- Results screen polish

## Phase 12 — Release

Verify:

- Production build
- Static preview
- itch.io-compatible asset paths
- Full run
- Restart full run
- Hidden-tab behavior
- Audio initialization
- Supported viewport
- No console errors
- Credits and licenses

# 28. Debug Tools

Development-only tools MAY include:

- Stage launcher
- Complete-stage button
- Reset records button
- Seed display
- Collision hitbox toggle
- FPS display
- Audio test panel

Debug tools MUST be disabled or removed from the release build.

Use a development guard:

```ts
if (import.meta.env.DEV) {
  // debug-only behavior
}
```

# 29. Git Workflow

## 29.1 Human control

The coding agent MUST NOT:

- Commit
- Push
- Merge
- Rebase
- Amend
- Reset
- Delete branches

without explicit human instruction.

## 29.2 Checkpoint workflow

For each checkpoint:

1. Inspect status.
2. Inspect relevant files.
3. Make only scoped changes.
4. Run applicable tests.
5. Run typecheck.
6. Run build when integration changed.
7. Report changed files.
8. Stop for review.

## 29.3 Pre-commit verification

Before a human-requested commit, run or provide:

```fish
git diff --check
git diff --stat
git diff --cached --check
git diff --cached --stat
git status -sb
```

# 30. Required Release Checklist

The build is not release-ready until all are true:

- [ ] Title screen loads
- [ ] BEGIN RUN starts timer
- [ ] Hub appears
- [ ] All eight preliminary stages are selectable
- [ ] Each preliminary stage can be completed
- [ ] Each completed stage locks
- [ ] Hub time counts toward total
- [ ] Segment times record
- [ ] Penalties work
- [ ] Final stage unlocks after eight completions
- [ ] Speed Lock accepts `SPEED`
- [ ] Final completion stops timer
- [ ] Results screen appears
- [ ] New run works without reload
- [ ] Personal best stores safely
- [ ] Synthesized audio initializes after user input
- [ ] Mute works
- [ ] Hidden-tab behavior is consistent
- [ ] `R` restarts every active stage
- [ ] Escape opens pause
- [ ] SVG scales correctly
- [ ] HUD remains separate from game viewport
- [ ] Workbench font loads locally
- [ ] `npm run test` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Built game works from `dist/`
- [ ] Built game works from a subdirectory
- [ ] No release-blocking console errors
- [ ] Credits and licenses are included

# 31. Scope-Cut Order

If time becomes critical, cut in this order:

1. Stage-specific music variations
2. Elaborate Clock Core animation
3. Rank labels
4. Advanced HUD deltas
5. Optional reduced-motion polish
6. Midpoint checkpoint in Pit Sprint
7. Multiple target motion patterns
8. Complex shortcut presentation
9. Nonessential menu screens

Do not cut:

- Any of the nine required stage completion paths
- The total timer
- Stage locking
- Final unlock
- Final completion
- Restart behavior
- Static production build
- Core input
- Basic HUD
- Basic vector presentation

# 32. LLM Execution Contract

For every coding response, the coding agent MUST use:

```text
CHECKPOINT: [short name]
OBJECTIVE: [one concrete outcome]
SCOPE: [included work and excluded work]
```

Then provide:

1. Files inspected
2. Files changed
3. Exact code or patch
4. Fish-compatible commands
5. Expected result
6. Verification steps
7. Known limitations
8. Stop point

The coding agent MUST NOT continue into the next implementation phase unless explicitly instructed.

# 33. Final Architectural Principle

The project MUST remain understandable under deadline pressure.

Prefer:

- Small pure functions
- Explicit state
- Simple stage modules
- Deterministic data
- Shared services
- Direct SVG updates
- Testable logic
- Fast iteration

Reject:

- Hidden mutable globals
- Complex abstractions without immediate value
- Large framework migrations
- Overgeneralized engines
- Deep inheritance
- Unnecessary dependencies
- Visual polish that delays a complete run
