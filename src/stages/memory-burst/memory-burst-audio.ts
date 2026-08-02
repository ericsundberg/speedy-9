import {
  PongAudio,
} from "../pong-blitz/pong-audio";

interface MemoryBurstBuzzStep {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const CARD_FLIP_BUZZ: readonly MemoryBurstBuzzStep[] = [
  {
    frequencyHz: 240,
    durationSeconds: 0.045,
    gain: 0.055,
  },
  {
    frequencyHz: 120,
    durationSeconds: 0.045,
    gain: 0.02,
  },
];

const MATCH_BUZZ: readonly MemoryBurstBuzzStep[] = [
  {
    frequencyHz: 320,
    durationSeconds: 0.085,
    gain: 0.065,
  },
  {
    frequencyHz: 480,
    durationSeconds: 0.12,
    gain: 0.06,
    delaySeconds: 0.075,
  },
];

const MISMATCH_BUZZ: readonly MemoryBurstBuzzStep[] = [
  {
    frequencyHz: 170,
    durationSeconds: 0.12,
    gain: 0.06,
  },
  {
    frequencyHz: 95,
    durationSeconds: 0.15,
    gain: 0.052,
    delaySeconds: 0.09,
  },
];

const ATTACK_SECONDS = 0.003;
const RELEASE_SECONDS = 0.008;
const SILENT_GAIN = 0.0001;

export class MemoryBurstAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private victoryAudio: PongAudio | null =
    new PongAudio();

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playCardFlip(): void {
    this.playRecipe(CARD_FLIP_BUZZ);
  }

  public playMatch(): void {
    this.playRecipe(MATCH_BUZZ);
  }

  public playMismatch(): void {
    this.playRecipe(MISMATCH_BUZZ);
  }

  public playVictory(): void {
    const victoryAudio = this.victoryAudio;

    /*
     * Completion destroys the stage immediately.
     * Relinquish this short victory sound so that
     * destruction does not cut it off.
     */
    this.victoryAudio = null;
    victoryAudio?.playWinBuzz();
  }

  public destroy(): void {
    const context = this.context;

    this.context = null;

    for (const oscillator of this.activeOscillators) {
      oscillator.onended = null;

      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have stopped.
      }

      oscillator.disconnect();
    }

    this.activeOscillators.clear();

    this.masterGain?.disconnect();
    this.masterGain = null;

    if (
      context !== null
      && context.state !== "closed"
    ) {
      void context.close();
    }

    this.victoryAudio?.destroy();
    this.victoryAudio = null;
  }

  private playRecipe(
    recipe: readonly MemoryBurstBuzzStep[],
  ): void {
    const context = this.getContext();

    if (context === null) {
      return;
    }

    const schedule = (): void => {
      if (
        this.context !== context
        || context.state !== "running"
      ) {
        return;
      }

      this.scheduleRecipe(context, recipe);
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(schedule)
        .catch(() => {
          // Audio remains optional if playback is rejected.
        });

      return;
    }

    schedule();
  }

  private getContext(): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    try {
      const context = new AudioContext();
      const masterGain = context.createGain();

      masterGain.gain.value = 0.55;
      masterGain.connect(context.destination);

      this.context = context;
      this.masterGain = masterGain;

      return context;
    } catch {
      return null;
    }
  }

  private scheduleRecipe(
    context: AudioContext,
    recipe: readonly MemoryBurstBuzzStep[],
  ): void {
    const masterGain = this.masterGain;

    if (masterGain === null) {
      return;
    }

    const recipeStart =
      context.currentTime + 0.004;

    for (const step of recipe) {
      const startAt =
        recipeStart + (step.delaySeconds ?? 0);

      const endAt =
        startAt + step.durationSeconds;

      const attackEnd = Math.min(
        startAt + ATTACK_SECONDS,
        endAt,
      );

      const releaseStart = Math.max(
        attackEnd,
        endAt - RELEASE_SECONDS,
      );

      const oscillator =
        context.createOscillator();

      const gain = context.createGain();

      oscillator.type = "square";

      oscillator.frequency.setValueAtTime(
        step.frequencyHz,
        startAt,
      );

      gain.gain.setValueAtTime(
        SILENT_GAIN,
        startAt,
      );

      gain.gain.exponentialRampToValueAtTime(
        step.gain,
        attackEnd,
      );

      gain.gain.setValueAtTime(
        step.gain,
        releaseStart,
      );

      gain.gain.exponentialRampToValueAtTime(
        SILENT_GAIN,
        endAt,
      );

      oscillator.connect(gain);
      gain.connect(masterGain);

      this.activeOscillators.add(oscillator);

      oscillator.onended = (): void => {
        this.activeOscillators.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };

      oscillator.start(startAt);
      oscillator.stop(endAt + 0.01);
    }
  }
}
