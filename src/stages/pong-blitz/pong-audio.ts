interface PongBuzzStep {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const START_AND_SCORE_BUZZ: readonly PongBuzzStep[] = [
  {
    frequencyHz: 110,
    durationSeconds: 0.34,
    gain: 0.13,
  },
  {
    frequencyHz: 55,
    durationSeconds: 0.34,
    gain: 0.045,
    delaySeconds: 0.006,
  },
];

const PADDLE_BUZZ: readonly PongBuzzStep[] = [
  {
    frequencyHz: 459,
    durationSeconds: 0.096,
    gain: 0.09,
  },
];

const WALL_BUZZ: readonly PongBuzzStep[] = [
  {
    frequencyHz: 226,
    durationSeconds: 0.036,
    gain: 0.075,
  },
];

const WIN_BUZZ: readonly PongBuzzStep[] = [
  {
    frequencyHz: 330,
    durationSeconds: 0.22,
    gain: 0.1,
  },
  {
    frequencyHz: 495,
    durationSeconds: 0.28,
    gain: 0.085,
    delaySeconds: 0.12,
  },
];

const ATTACK_SECONDS = 0.003;
const RELEASE_SECONDS = 0.008;
const SILENT_GAIN = 0.0001;

export class PongAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private releaseWhenSilent = false;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playBuzz(): void {
    this.playRecipe(START_AND_SCORE_BUZZ);
  }

  public playPlop(): void {
    this.playRecipe(PADDLE_BUZZ);
  }

  public playPing(): void {
    this.playRecipe(WALL_BUZZ);
  }

  public playWinBuzz(): void {
    this.playRecipe(WIN_BUZZ, true);
  }

  public destroy(): void {
    const context = this.context;

    this.context = null;
    this.releaseWhenSilent = false;

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
    recipe: readonly PongBuzzStep[],
    releaseAfterPlayback = false,
  ): void {
    if (this.releaseWhenSilent) {
      return;
    }

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

      if (releaseAfterPlayback) {
        this.releaseWhenSilent = true;
        this.closeIfReleasedAndSilent();
      }
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(schedule)
        .catch(() => {
          if (releaseAfterPlayback) {
            this.releaseWhenSilent = true;
            this.closeIfReleasedAndSilent();
          }
        });

      return;
    }

    schedule();
  }

  private getContext(): AudioContext | null {
    if (this.releaseWhenSilent) {
      return null;
    }

    if (this.context !== null) {
      return this.context;
    }

    try {
      const context = new AudioContext();
      const masterGain = context.createGain();

      masterGain.gain.value = 0.65;
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
    recipe: readonly PongBuzzStep[],
  ): void {
    const masterGain = this.masterGain;

    if (masterGain === null) {
      return;
    }

    const recipeStart = context.currentTime + 0.004;

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

      const oscillator = context.createOscillator();
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
        this.closeIfReleasedAndSilent();
      };

      oscillator.start(startAt);
      oscillator.stop(endAt + 0.01);
    }
  }

  private closeIfReleasedAndSilent(): void {
    if (
      !this.releaseWhenSilent
      || this.activeOscillators.size > 0
    ) {
      return;
    }

    const context = this.context;

    this.context = null;

    this.masterGain?.disconnect();
    this.masterGain = null;

    if (
      context !== null
      && context.state !== "closed"
    ) {
      void context.close();
    }
  }
}
