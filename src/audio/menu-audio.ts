interface MenuBuzzStep {
  readonly frequencyHz: number;
  readonly endFrequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const MENU_MOVE_BUZZ: readonly MenuBuzzStep[] = [
  {
    frequencyHz: 392,
    endFrequencyHz: 320,
    durationSeconds: 0.045,
    gain: 0.055,
  },
  {
    frequencyHz: 523.25,
    endFrequencyHz: 440,
    durationSeconds: 0.055,
    gain: 0.045,
    delaySeconds: 0.032,
  },
];

const MENU_SELECT_BUZZ: readonly MenuBuzzStep[] = [
  {
    frequencyHz: 146.83,
    endFrequencyHz: 98,
    durationSeconds: 0.14,
    gain: 0.09,
  },
  {
    frequencyHz: 73.42,
    endFrequencyHz: 65.41,
    durationSeconds: 0.16,
    gain: 0.03,
    delaySeconds: 0.006,
  },
];

const SILENT_GAIN = 0.0001;
const ATTACK_SECONDS = 0.003;
const RELEASE_SECONDS = 0.009;

export class MenuAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playMove(
    allowContextResume: boolean,
  ): void {
    this.playRecipe(
      MENU_MOVE_BUZZ,
      allowContextResume,
    );
  }

  public playSelect(): void {
    this.playRecipe(
      MENU_SELECT_BUZZ,
      true,
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
        // The oscillator may already have ended.
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
    recipe: readonly MenuBuzzStep[],
    allowContextResume: boolean,
  ): void {
    const context = this.getContext(
      allowContextResume,
    );

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

    if (context.state === "running") {
      schedule();
      return;
    }

    if (!allowContextResume) {
      return;
    }

    void context
      .resume()
      .then(schedule)
      .catch(() => {
        // Audio remains silent if playback is unavailable.
      });
  }

  private getContext(
    allowCreation: boolean,
  ): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    if (!allowCreation) {
      return null;
    }

    try {
      const context = new AudioContext();
      const masterGain = context.createGain();

      masterGain.gain.value = 0.6;
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
    recipe: readonly MenuBuzzStep[],
  ): void {
    const masterGain = this.masterGain;

    if (masterGain === null) {
      return;
    }

    const recipeStart =
      context.currentTime + 0.003;

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

      oscillator.frequency
        .exponentialRampToValueAtTime(
          step.endFrequencyHz,
          endAt,
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
