---
document_type: game-design-document
project_name: SPEEDY 9
document_version: 0.1.0
status: draft-for-review
jam_name: Micro Jam 062
jam_theme: Speed
jam_prerequisite: Speed is your weapon
genre:
  - speedrun
  - arcade
  - microgame-collection
platform:
  - desktop-web
engine:
  - HTML
  - CSS
  - TypeScript
  - Vite
rendering:
  primary: SVG
  style: Vectrex-inspired vector graphics
audio:
  implementation: TypeScript Web Audio API synthesis
  prerecorded_audio_required: false
target_run_length:
  first_run_minutes: 4-8
  practiced_run_minutes: 2-5
stage_structure:
  preliminary_stages: 8
  final_stages: 1
  total_stages: 9
---

# SPEEDY 9 — Game Design Document

## 1. High Concept

**SPEEDY 9** is a browser-based arcade speedrunning game built from nine compact microgames.

The player begins a timed run, chooses eight preliminary stages in any order, completes each stage once, and unlocks a ninth final stage. Every stage tests a different form of speed: movement, aiming, reaction, memory, calculation, routing, or execution.

The player is not merely trying to survive. The player is attacking and defeating **The Clock**. Every completed stage converts the player’s speed into a vector strike against the central Clock Core. Faster stage times produce stronger visual attacks. Completing all eight preliminary stages exposes the final lock. Solving the final stage stops the clock and ends the run.

## 2. One-Sentence Pitch

> Nine microgames. One relentless clock. Your speed is the weapon.

## 3. Design Pillars

### 3.1 Speed Is the Primary Skill

Every stage MUST reward fast understanding and fast execution.

The player SHOULD become substantially faster after learning:

- The controls
- The stage layout
- The shortest route
- The timing windows
- The puzzle structure
- The hidden racing shortcut
- The final word

### 3.2 Instant Readability

Each stage MUST communicate its objective within seconds.

Instructions MUST be short enough to read before or during a run without creating a long delay.

### 3.3 Rapid Restarts

Failure MUST waste as little real-world time as possible.

The player MUST be able to restart the current stage immediately while the run timer continues.

### 3.4 Varied Skills, Shared Structure

The stages SHOULD feel mechanically distinct while sharing:

- The same game shell
- The same timer
- The same input conventions where practical
- The same vector presentation
- The same completion flow
- The same restart behavior

### 3.5 Learnable Speedrun

The game MUST support replay and mastery.

A first-time player should be able to finish. A practiced player should be able to improve through knowledge, routing, and execution rather than luck alone.

### 3.6 Deliberate Visual Contrast

The game viewport MUST use a Vectrex-inspired vector style.

The timing HUD MUST use a modern LiveSplit-inspired interface that is intentionally unlike the Vectrex display.

This juxtaposition is a core visual decision.

## 4. Player Experience

The intended emotional arc is:

1. **Curiosity** — the player sees eight mysterious selectable challenges around a locked central stage.
2. **Urgency** — the run begins and the large timer immediately becomes threatening.
3. **Discovery** — each stage introduces a different compact mechanic.
4. **Mastery** — repeated attempts reveal faster routes and cleaner inputs.
5. **Escalation** — every completion visibly damages the Clock Core.
6. **Recognition** — the final word puzzle is solved through the game’s obvious theme.
7. **Relief and pride** — the timer stops and the player sees a complete split report and personal-best result.

## 5. Audience

The game is intended for:

- Game-jam players
- Arcade-game players
- Speedrunning fans
- Players who enjoy short browser games
- Players who enjoy replaying compact challenges for better times

The game is designed for desktop and laptop browsers first.

## 6. Scope Resolution

The initial concept list contained ten possible games while the core structure requires eight preliminary stages plus one final stage.

For the MVP, the stage roster is fixed at nine total stages:

1. Reverse Circuit
2. Deadeye
3. Pong Blitz
4. Pit Sprint
5. Tower Climb
6. Vector Maze
7. Memory Burst
8. Times Rush
9. Speed Lock

**Tic-tac-toe is excluded from the MVP roster.**

Tic-tac-toe MAY be retained as:

- A fallback replacement if another stage is cut
- A post-jam bonus stage
- A hidden optional mode

It MUST NOT be added in addition to the nine approved stages during the jam unless another stage is removed.

## 7. Core Game Loop

### 7.1 Pre-Run

The player reaches the title screen and may:

- Start a new run
- Read controls
- Toggle audio
- View personal-best information
- View credits

The run timer is not active on the title screen.

### 7.2 Run Start

The player selects **BEGIN RUN**.

At that moment:

- The total timer starts
- The stage-selection hub appears
- All eight preliminary stages are available
- The final stage is locked
- No preliminary stage is marked complete
- Run penalties are zero
- Current-run splits are empty

Time spent choosing a stage counts toward the total run time.

### 7.3 Stage Selection

The player selects any incomplete preliminary stage.

Selecting a stage:

- Highlights the corresponding HUD row
- Starts that stage’s active segment timer
- Loads the stage immediately
- Displays a brief one-line objective and controls
- Begins gameplay with minimal delay

### 7.4 Stage Completion

When a stage is completed:

- The stage segment timer stops
- The segment time is recorded
- Any stage penalties are included
- The corresponding HUD row is completed
- The stage becomes locked for the current run
- A vector speed strike damages one section of the Clock Core
- The player returns quickly to the hub
- The total timer continues

### 7.5 Final Unlock

After all eight preliminary stages are complete:

- The central Clock Core opens
- The ninth stage becomes selectable
- A brief visual and audio cue announces the unlock
- The total timer continues

### 7.6 Run Completion

Completing the final stage:

- Stops the total timer
- Records the final stage segment
- Ends the run
- Displays the run result
- Compares the run against the stored personal best
- Shows all nine segment times
- Shows favorable or unfavorable deltas where comparison data exists
- Offers immediate replay

## 8. Run Timing Rules

### 8.1 Authoritative Time

The total run time begins when **BEGIN RUN** is activated.

The total run time ends at the exact moment the final stage completion condition is satisfied.

The timer MUST be based on a monotonic high-resolution clock.

### 8.2 What Counts Toward Total Time

The following count toward the total run time:

- Stage-selection time
- Stage loading and transition time
- Instruction display time after the run begins
- Gameplay time
- Failure recovery
- Current-stage restarts
- Pause-menu time
- Time spent while the browser tab is hidden
- Added penalties

### 8.3 Pause Behavior

Opening the pause menu pauses stage simulation but does not pause the run timer.

This prevents pausing from becoming a speedrun exploit.

The pause menu provides:

- Resume
- Restart current stage
- Abandon run
- Audio controls
- Controls reference

### 8.4 Browser Visibility Behavior

When the browser tab becomes hidden:

- Active stage simulation pauses
- The total timer continues using real elapsed time
- Audio is suspended or silenced
- The stage resumes when the tab becomes visible

The player may abandon the damaged run and begin a new one.

### 8.5 Restart Behavior

Pressing `R` during an active stage immediately resets that stage.

The following do not reset:

- Total run time
- Penalty time already incurred
- Completion status of other stages
- The stage order already completed
- The current run seed

### 8.6 Segment Time

Each HUD stage row shows that stage’s active segment duration, including penalties assigned inside that stage.

Hub-selection time counts toward the total run but is not assigned to a stage segment.

This allows stages to be completed in any order while preserving meaningful stage-specific comparisons.

## 9. Speed as the Weapon

The prerequisite **Speed is your weapon** is represented literally and mechanically through the Clock Core.

### 9.1 Clock Core

The hub contains a central Clock Core surrounded by eight armor sections.

Each preliminary stage completion destroys one armor section.

### 9.2 Speed Strike

Completing a stage emits a vector beam or projectile from the completed stage icon into the Clock Core.

The strike’s visual intensity is based on the player’s speed relative to a target par time.

Faster completion MAY produce:

- A brighter beam
- A larger impact
- More screen vibration
- A higher-pitched success arpeggio
- A stronger Clock Core distortion
- A more favorable rank label

Strike strength is presentational and MUST NOT prevent progression.

### 9.3 Final Attack

The final word puzzle represents the exposed Clock Core’s security lock.

Solving it stops the clock and defeats the run’s antagonist.

## 10. Stage-Selection Hub

### 10.1 Layout

The hub uses a Mega Man-inspired arrangement without copying protected characters or artwork.

The preferred layout is a 3-by-3 grid:

| Position | Stage |
|---|---|
| Top-left | Reverse Circuit |
| Top-center | Deadeye |
| Top-right | Pong Blitz |
| Middle-left | Pit Sprint |
| Center | Speed Lock / Clock Core |
| Middle-right | Tower Climb |
| Bottom-left | Vector Maze |
| Bottom-center | Memory Burst |
| Bottom-right | Times Rush |

### 10.2 Stage States

Every stage tile has one of four states:

- **Available**
- **Focused**
- **Active**
- **Completed/locked**

The final stage additionally has:

- **Locked**
- **Unlocked**

### 10.3 Hub Controls

The hub supports:

- Arrow keys or WASD to move focus
- Enter or Space to select
- Pointer hover and click
- Escape to open the pause menu

### 10.4 Completed Stages

Completed stages MUST remain visible but cannot be selected again during the same run.

A completed tile SHOULD show:

- A broken or crossed vector icon
- Its recorded segment time
- A distinct locked state
- A visible path or damage mark leading toward the Clock Core

## 11. Stage Specifications

# 11.1 Reverse Circuit

**Category:** Top-down racing  
**Primary skill:** Routing and movement control  
**Target first-run duration:** 25–45 seconds  
**Target practiced duration:** 12–25 seconds

### Objective

Complete one lap and cross the finish line.

### Controls

- WASD or arrow keys: steer and accelerate/reverse
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Arcade acceleration
- Limited maximum speed
- Simple turning based on movement speed
- Collision against track boundaries
- Checkpoint validation to prevent invalid laps
- One complete lap

### Secret Speedrun Route

The player may reverse immediately from the starting line and discover a hidden drop or rear passage.

This route leads to a smaller alternate track or shortcut that allows a faster valid completion.

The shortcut MUST be:

- Discoverable through experimentation
- Deliberate rather than accidental
- Validated by its own checkpoints
- Faster but not mandatory
- Possible without advanced physics

### Failure and Penalties

- Leaving valid space collides or resets the car to the most recent checkpoint
- The timer continues
- No long crash animation

### Scope Limit

No realistic tire simulation, drifting model, opponent cars, multiple laps, or complex vehicle damage.

---

# 11.2 Deadeye

**Category:** Aim trainer / carnival shooter  
**Primary skill:** Pointer speed and accuracy  
**Target first-run duration:** 15–30 seconds  
**Target practiced duration:** 7–15 seconds

### Objective

Hit all required targets as quickly as possible.

### Controls

- Pointer movement: aim
- Primary pointer button: fire
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Targets appear at validated positions
- One or more targets may be active at once
- A hit removes the target
- The stage completes after the required number of hits
- Preferred target count: 10 to 12

### Spawn Rules

Target positions MUST:

- Remain fully inside the playable area
- Avoid the HUD
- Avoid overlapping critical UI
- Be reachable by pointer
- Use bounded randomization or a validated sequence

The stage sequence remains stable when restarting the current stage.

### Failure and Penalties

A shot that does not hit an active target adds a small visible time penalty.

Recommended penalty: **+0.50 seconds**.

### Scope Limit

No ammunition system, weapon inventory, reload simulation, moving 3D perspective, or enemy combat AI.

---

# 11.3 Pong Blitz

**Category:** Sports / arcade  
**Primary skill:** Reaction and paddle positioning  
**Target first-run duration:** 20–45 seconds  
**Target practiced duration:** 12–30 seconds

### Objective

Score two points before the computer scores two points.

### Controls

- W/S or Up/Down: move paddle
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Player paddle on the left
- Computer paddle on the right
- One ball
- Ball reflects from top and bottom boundaries
- Paddle impact angle depends partly on contact position
- Ball speed increases slightly after paddle hits
- Round resets rapidly after a point

### Computer Behavior

The computer uses simple predictable tracking.

The computer MUST be beatable and SHOULD make occasional positioning errors.

### Failure

If the computer reaches two points first:

- A brief failure cue appears
- The stage immediately restarts
- The run timer continues

### Scope Limit

No advanced opponent AI, spin simulation, power-ups, multiple balls, or elaborate menus.

---

# 11.4 Pit Sprint

**Category:** Horizontal platformer  
**Primary skill:** Movement timing and route execution  
**Target first-run duration:** 25–50 seconds  
**Target practiced duration:** 12–30 seconds

### Objective

Reach the exit at the far end of the course.

### Controls

- A/D or Left/Right: move
- Space, W, or Up: jump
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Horizontal movement
- Gravity
- Jumping
- Platforms
- Gaps
- Simple moving or repeating hazards
- Exit trigger

### Level Structure

The level SHOULD be:

- One compact scrolling course or one extended logical screen
- Short enough to learn quickly
- Built around two or three recognizable timing challenges
- Free from blind jumps

### Failure

Touching a lethal hazard or falling out of bounds returns the player to the stage start or a single approved midpoint checkpoint.

The timer continues.

### Scope Limit

No combat, inventory, complex animation system, wall jumping, procedural level generation, or multiple levels.

---

# 11.5 Tower Climb

**Category:** Vertical platformer  
**Primary skill:** Ladder routing, jumping, and hazard timing  
**Target first-run duration:** 30–55 seconds  
**Target practiced duration:** 15–35 seconds

### Objective

Reach the goal at the top of the tower.

### Controls

- A/D or Left/Right: move
- W/S or Up/Down: climb ladders
- Space: jump
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Multiple horizontal tiers
- Ladders connecting tiers
- Jumping over hazards
- Repeating rolling or moving obstacles
- Goal at the top

### Hazard Rules

Hazards follow simple deterministic or strongly predictable paths.

The stage MUST be readable enough for the player to anticipate danger.

### Failure

Contact with a hazard resets the player to the base or a single approved checkpoint.

The timer continues.

### Scope Limit

No copied Donkey Kong characters, layouts, names, sprites, or audio. No advanced enemy AI or complex barrel physics.

---

# 11.6 Vector Maze

**Category:** Maze / precision movement  
**Primary skill:** Route recognition and steering  
**Target first-run duration:** 15–35 seconds  
**Target practiced duration:** 7–20 seconds

### Objective

Move the player dot from the entrance to the exit.

### Controls

- WASD or arrow keys: move
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Fixed maze
- Player represented by a dot or small vector shape
- Axis-aligned wall collision
- Smooth normalized diagonal movement
- Clearly marked exit

### Maze Rules

The maze MUST:

- Have one clearly valid route
- Avoid extremely narrow passages
- Fit within one logical screen
- Be readable at supported resolutions
- Reward route memorization

### Failure

Walls block movement.

The player is not automatically reset by ordinary wall contact.

Optional hazardous walls MUST NOT be added unless specifically approved.

### Scope Limit

No procedural maze generation for the MVP.

---

# 11.7 Memory Burst

**Category:** Matching memory puzzle  
**Primary skill:** Short-term memory and pointer execution  
**Target first-run duration:** 20–45 seconds  
**Target practiced duration:** 10–25 seconds

### Objective

Match all card pairs.

### Controls

- Pointer: select tiles
- Keyboard focus and Enter/Space SHOULD also be supported
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- Eight tiles
- Four matching pairs
- Two tiles may be revealed at once
- Matching pairs remain visible
- Mismatches flip back after a short delay
- The stage completes when all four pairs are matched

### Board Rules

The board is shuffled once when a new run begins.

Restarting the stage within that run uses the same board order.

This preserves fairness and prevents restart-based rerolling.

### Timing Rule

The mismatch delay SHOULD be approximately 250–400 milliseconds.

The player cannot reveal another tile during the mismatch resolution.

### Scope Limit

No large board, multiple rounds, elaborate card art, or extended flip animations.

---

# 11.8 Times Rush

**Category:** Math / educational reaction challenge  
**Primary skill:** Mental calculation and typing  
**Target first-run duration:** 20–45 seconds  
**Target practiced duration:** 10–25 seconds

### Objective

Correctly answer five multiplication questions.

### Controls

- Number keys: enter answer
- Backspace: delete
- Enter: submit
- `R`: restart stage
- Escape: pause menu

### Core Mechanics

- One multiplication problem at a time
- Five correct answers required
- Operands generally range from 2 through 12
- Input is displayed clearly
- Correct submission immediately advances
- Question sequence is generated once per run
- Restarting uses the same sequence

### Failure and Penalties

An incorrect submitted answer:

- Adds **+1.00 second**
- Plays a short error sound
- Clears the entered answer
- Leaves the current question active

### Scope Limit

No division, fractions, negative values, adaptive difficulty, or large educational progression system.

---

# 11.9 Speed Lock

**Category:** Five-letter word deduction puzzle  
**Role:** Final stage  
**Primary skill:** Recognition, typing, and acquired knowledge  
**Target first-run duration:** 10–40 seconds  
**Target practiced duration:** 2–8 seconds

### Objective

Enter the five-letter solution and unlock the Clock Core.

### Solution

The answer is:

`SPEED`

The known answer is intentional. Players who learn or infer the answer are rewarded with an extremely fast final segment on later runs.

### Controls

- Letter keys: enter letters
- Backspace: delete
- Enter: submit
- `R`: restart final stage
- Escape: pause menu

### Core Mechanics

- Five character slots per attempt
- Up to six attempts
- Submitted letters receive three feedback states:
  - Correct letter and position
  - Correct letter, wrong position
  - Letter not used
- Feedback MUST use shape, pattern, icon, or labeling in addition to color
- Valid English-word enforcement MAY be omitted for scope
- `SPEED` always completes the stage

### Failure

If six incorrect attempts are used:

- The board clears rapidly
- The final stage restarts
- The total run timer continues

### Legal and Presentation Rule

The stage is an original five-letter color-feedback word puzzle.

The project MUST NOT use protected logos, names, fonts, or copied interface assets from Wordle.

## 12. Controls Summary

| Context | Controls |
|---|---|
| Menus and hub | WASD, arrows, Enter, Space, pointer |
| Movement stages | WASD or arrows |
| Jump | Space, W, or Up where appropriate |
| Ladders | W/S or Up/Down |
| Aim and selection | Pointer and primary click |
| Text entry | Letter or number keys, Backspace, Enter |
| Restart current stage | R |
| Pause menu | Escape |

Controls MUST be shown before or at the beginning of each stage in a brief, unobtrusive format.

## 13. HUD Design

### 13.1 Layout

The preferred desktop layout is:

- A fixed-width LiveSplit-inspired HUD on the left
- The Vectrex-style game viewport on the right
- A shared outer application frame
- No overlap between HUD and gameplay

Preferred reference size:

- Total shell: approximately 1280 × 720 logical presentation
- HUD: approximately 240–280 pixels wide
- Game viewport: remaining width
- SVG game coordinate system independent of physical pixels

### 13.2 HUD Contents

The HUD includes:

- `SPEEDY 9` title
- Nine fixed stage rows
- Current stage highlight
- Completed segment times
- Favorable or unfavorable deltas
- Large total run timer
- Previous segment delta
- Personal-best indicator
- Optional small penalty indicator
- Audio status control

### 13.3 Stage Row Behavior

Each row shows:

- Stage icon
- Short stage name
- Segment time when completed
- Delta against best known segment when available
- Completion state

The list remains in a fixed order even when the player completes stages in another order.

### 13.4 Color

Suggested HUD color behavior:

- Blue: current stage
- Green: favorable delta or personal best
- Red: unfavorable delta or penalty
- White: neutral values
- Gray: unplayed or unavailable
- Gold or bright white: final unlock and run completion

Color MUST NOT be the only communication method.

## 14. Visual Direction

### 14.1 Vectrex-Inspired Game View

The game view uses:

- Black background
- Thin white or lightly tinted lines
- Sparse geometric forms
- Restrained glow
- Minimal fills
- High contrast
- Occasional line flicker or instability
- Simple vector explosion and impact effects
- Locally shipped Workbench font where legible

### 14.2 Line Behavior

Vector lines SHOULD appear luminous without becoming blurry.

Glow MUST NOT hide collision boundaries or reduce legibility.

### 14.3 Stage Identity

Each stage MAY receive one restrained accent color or line treatment.

The visual system MUST remain coherent across all stages.

### 14.4 Font

`workbench.ttf` is the intended game-display font.

It MAY be converted to WOFF2 if licensing permits.

The LiveSplit-style HUD SHOULD use a compact system sans-serif or monospaced font rather than the Workbench font.

### 14.5 Animation

Animations SHOULD be:

- Short
- Geometric
- Readable
- Reusable
- Inexpensive to render

Avoid long transition sequences.

## 15. Audio and Music

### 15.1 Audio Method

Music and sound effects are generated in TypeScript through the Web Audio API.

The game does not require prerecorded audio files.

Notes and effects are scripted using values such as:

- Frequency in hertz
- Start time
- Duration
- Gain
- Waveform
- Optional attack
- Optional release
- Optional pitch slide

### 15.2 Music Data

Music SHOULD be represented as data rather than hard-coded scheduling scattered across game logic.

A conceptual note entry is:

```ts
interface SynthNote {
  frequencyHz: number;
  startBeat: number;
  durationBeats: number;
  gain: number;
  waveform: OscillatorType;
}
```

The sequencer converts beats into exact Web Audio timing.

### 15.3 Sound Effects

Sound effects use the same synthesis system.

Expected effects include:

- Menu movement
- Menu confirmation
- Stage start
- Target hit
- Miss or wrong answer
- Jump
- Collision
- Point scored
- Pair matched
- Stage completion
- Clock Core strike
- Final unlock
- Personal best
- Run completion

### 15.4 Music Scope

Minimum audio target:

- One title or hub loop
- One reusable gameplay pulse or loop
- One final-stage variation
- Core sound effects

Preferred stretch target:

- Stage-specific tempo, bass pattern, or lead variation
- Faster musical intensity as the Clock Core weakens

### 15.5 Audio Rules

- Audio begins only after user interaction
- Audio failure must not block gameplay
- A mute control is required if audio is enabled
- Audio timing uses the AudioContext clock
- Repeated stage starts must not leak oscillator or gain nodes
- Music should loop cleanly
- Music and effects should remain simple and rhythmically urgent

## 16. Difficulty and Fairness

### 16.1 First-Run Completion

Every stage MUST be possible for a first-time player without external instructions.

### 16.2 Practice Advantage

Repeated play SHOULD produce meaningful improvement through:

- Memorized layouts
- Better routes
- Faster target acquisition
- Better paddle positioning
- Learned multiplication sequences during a run
- Learned memory-board order during a run
- Knowledge of the final answer
- Discovery of the racing shortcut

### 16.3 Randomness

Randomness MUST be bounded.

Any generated stage content MUST:

- Be valid
- Be completable
- Remain stable during same-stage restarts
- Avoid extreme unfairness
- Be testable through an injected or seeded random source

## 17. Failure Philosophy

Failure should cost time, not eject the player from the full run.

General failure behavior:

- The current stage resets or continues
- The total timer continues
- Other completed stages remain complete
- The player receives immediate feedback
- Recovery occurs in less than one second where practical

The player should never need to reload the webpage to recover.

## 18. Progression and Records

### 18.1 Current Run Data

The game tracks:

- Run start time
- Total elapsed time
- Added penalty time
- Completed stages
- Stage completion order
- Stage segment times
- Current stage
- Current run seed

### 18.2 Persistent Data

The game stores locally:

- Personal-best total run time
- Best segment time for each stage
- Previous run segment times
- Audio preference
- Optional reduced-motion preference

### 18.3 Personal Best

A completed run becomes the personal best if its final total time is lower than the stored best.

The results screen MUST clearly identify a new personal best.

## 19. Results Screen

The results screen shows:

- Final total time
- Personal-best status
- Difference from previous personal best
- All nine segment times
- Best segment indicators
- Stage completion order
- Total penalties
- Replay button
- Return to title button

Suggested victory line:

> THE CLOCK WAS DEFEATED IN [TIME]

## 20. Technical Product Requirements

The game MUST:

- Run as a static browser application
- Use HTML, CSS, and TypeScript
- Use Vite
- Use Vitest
- Render gameplay primarily with SVG
- Use Git and GitHub
- Bundle all required assets locally
- Work without a backend
- Build for itch.io HTML5 hosting
- Avoid requiring network access after initial load
- Avoid unapproved external frameworks
- Use a responsive desktop-first layout

## 21. Minimum Viable Product

The MVP is complete when:

- The title screen works
- A run can begin
- The total timer works
- The hub allows all eight preliminary stages to be selected
- Every preliminary stage has a functional completion path
- Completed stages lock
- The final stage unlocks after eight completions
- The final stage can be completed
- The run timer stops
- The results screen appears
- The production build runs from static files
- Core controls and restart behavior work
- The game uses the vector visual style
- The LiveSplit-style HUD is present
- At least essential synthesized sound effects are present

## 22. Stretch Goals

Stretch goals are considered only after the MVP is stable.

Possible stretch goals:

- Stage-specific music arrangements
- More elaborate Clock Core damage
- Speed ranks per stage
- Ghost or replay data
- Additional racing shortcuts
- Multiple validated maze layouts
- Alternate memory boards
- Controller support
- Post-jam tic-tac-toe bonus stage
- Reduced-motion option
- Full keyboard accessibility for pointer stages
- Additional local statistics

## 23. Explicit Non-Goals

The jam version does not include:

- Multiplayer
- Online leaderboards
- Accounts
- Server-side persistence
- Cloud saves
- Mobile-first controls
- Complex physics
- Full gamepad requirement
- Large narrative sequences
- Detailed character animation
- Multiple campaigns
- Procedural level generation
- More than nine required stages
- Licensed or copied game assets
- Prerecorded music as a requirement

## 24. Open Review Decisions

The following values may be tuned during implementation without changing the core design:

- Exact par time for each stage
- Exact Deadeye target count
- Exact Pong ball acceleration
- Whether Pit Sprint uses a midpoint checkpoint
- Exact mismatch delay in Memory Burst
- Exact penalty duration for misses and wrong answers
- Exact HUD width
- Exact stage accent colors
- Exact music tempo and note patterns
- Exact vector glow strength

The following require explicit design approval to change:

- Nine-stage total
- Eight selectable preliminary stages
- Final stage answer `SPEED`
- Exclusion of tic-tac-toe from the MVP
- Run timer starting at BEGIN RUN
- Run timer continuing during pause
- Completed stages locking during a run
- SVG as the primary gameplay renderer
- TypeScript-generated music and sound effects
- Deliberate visual contrast between game viewport and timing HUD
