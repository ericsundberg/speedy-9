interface SpeedLockedBuzzStep {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

type SpeedLockedCue =
  | "position"
  | "letter"
  | "incomplete"
  | "submitted"
  | "failure";

const POSITION_TICK: readonly SpeedLockedBuzzStep[] = [
  {
    frequencyHz: 520,
    durationSeconds: 0.025,
    gain: 0.035,
  },
];

const LETTER_TICK: readonly SpeedLockedBuzzStep[] = [
  {
    frequencyHz: 760,
    durationSeconds: 0.03,
    gain: 0.04,
  },
];

const INCOMPLETE_BUZZ:
readonly SpeedLockedBuzzStep[] = [
  {
    frequencyHz: 115,
    durationSeconds: 0.11,
    gain: 0.055,
  },
  {
    frequencyHz: 75,
    durationSeconds: 0.12,
    gain: 0.04,
    delaySeconds: 0.07,
  },
];

const SUBMITTED_BUZZ:
readonly SpeedLockedBuzzStep[] = [
  {
    frequencyHz: 220,
    durationSeconds: 0.05,
    gain: 0.055,
  },
  {
    frequencyHz: 330,
    durationSeconds: 0.07,
    gain: 0.05,
    delaySeconds: 0.045,
  },
];

const FAILURE_BUZZ:
readonly SpeedLockedBuzzStep[] = [
  {
    frequencyHz: 220,
    durationSeconds: 0.12,
    gain: 0.06,
  },
  {
    frequencyHz: 165,
    durationSeconds: 0.14,
    gain: 0.055,
    delaySeconds: 0.1,
  },
  {
    frequencyHz: 110,
    durationSeconds: 0.18,
    gain: 0.05,
    delaySeconds: 0.22,
  },
];

const CUE_INTERVAL_MS: Readonly<
  Record<SpeedLockedCue, number>
> = {
  position: 20,
  letter: 20,
  incomplete: 100,
  submitted: 100,
  failure: 250,
};

const ATTACK_SECONDS = 0.003;
const RELEASE_SECONDS = 0.008;
const SILENT_GAIN = 0.0001;

export class SpeedLockedAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  private readonly lastPlayedAtMs =
    new Map<SpeedLockedCue, number>();

  public playPositionTick(): void {
    this.playCue(
      "position",
      POSITION_TICK,
    );
  }

  public playLetterTick(): void {
    this.playCue(
      "letter",
      LETTER_TICK,
    );
  }

  public playIncomplete(): void {
    this.playCue(
      "incomplete",
      INCOMPLETE_BUZZ,
    );
  }

  public playSubmitted(): void {
    this.playCue(
      "submitted",
      SUBMITTED_BUZZ,
    );
  }

  public playFailure(): void {
    this.playCue(
      "failure",
      FAILURE_BUZZ,
    );
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
    this.lastPlayedAtMs.clear();

    this.masterGain?.disconnect();
    this.masterGain = null;

    if (
      context !== null
      && context.state !== "closed"
    ) {
      void context.close();
    }
  }

  private playCue(
    cue: SpeedLockedCue,
    recipe: readonly SpeedLockedBuzzStep[],
  ): void {
    const playedAtMs = performance.now();
    const previousPlayedAtMs =
      this.lastPlayedAtMs.get(cue)
      ?? Number.NEGATIVE_INFINITY;

    if (
      playedAtMs - previousPlayedAtMs
      < CUE_INTERVAL_MS[cue]
    ) {
      return;
    }

    this.lastPlayedAtMs.set(
      cue,
      playedAtMs,
    );

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

      this.scheduleRecipe(
        context,
        recipe,
      );
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(schedule)
        .catch(() => {
          // Audio is optional if playback is rejected.
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

      masterGain.gain.value = 0.5;
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
    recipe: readonly SpeedLockedBuzzStep[],
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

      this.activeOscillators.add(
        oscillator,
      );

      oscillator.onended = (): void => {
        this.activeOscillators.delete(
          oscillator,
        );

        oscillator.disconnect();
        gain.disconnect();
      };

      oscillator.start(startAt);
      oscillator.stop(endAt + 0.01);
    }
  }
}
