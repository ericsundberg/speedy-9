interface BuzzStep {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const SHOT_BUZZ: readonly BuzzStep[] = [
  {
    frequencyHz: 140,
    durationSeconds: 0.05,
    gain: 0.075,
  },
  {
    frequencyHz: 70,
    durationSeconds: 0.05,
    gain: 0.026,
  },
];

const BULLSEYE_BUZZ: readonly BuzzStep[] = [
  {
    frequencyHz: 420,
    durationSeconds: 0.08,
    gain: 0.07,
    delaySeconds: 0.035,
  },
  {
    frequencyHz: 630,
    durationSeconds: 0.11,
    gain: 0.06,
    delaySeconds: 0.085,
  },
];

const TARGET_HIT_BUZZ: readonly BuzzStep[] = [
  {
    frequencyHz: 165,
    durationSeconds: 0.13,
    gain: 0.07,
    delaySeconds: 0.04,
  },
  {
    frequencyHz: 82.5,
    durationSeconds: 0.13,
    gain: 0.032,
    delaySeconds: 0.04,
  },
];

const MISS_BUZZ: readonly BuzzStep[] = [
  {
    frequencyHz: 105,
    durationSeconds: 0.13,
    gain: 0.052,
    delaySeconds: 0.04,
  },
  {
    frequencyHz: 70,
    durationSeconds: 0.1,
    gain: 0.038,
    delaySeconds: 0.12,
  },
];

const ATTACK_SECONDS = 0.003;
const RELEASE_SECONDS = 0.008;
const SILENT_GAIN = 0.0001;

export class DeadeyeAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playShot(): void {
    this.playRecipe(SHOT_BUZZ);
  }

  public playBullseye(): void {
    this.playRecipe(BULLSEYE_BUZZ);
  }

  public playTargetHit(): void {
    this.playRecipe(TARGET_HIT_BUZZ);
  }

  public playMiss(): void {
    this.playRecipe(MISS_BUZZ);
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
  }

  private playRecipe(
    recipe: readonly BuzzStep[],
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
          // Audio is optional if the browser rejects playback.
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
    recipe: readonly BuzzStep[],
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