interface VectorMazeScuffleVoice {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const SCUFFLE_RECIPES: readonly [
  readonly VectorMazeScuffleVoice[],
  readonly VectorMazeScuffleVoice[],
] = [
  [
    {
      frequencyHz: 138,
      durationSeconds: 0.034,
      gain: 0.028,
    },
    {
      frequencyHz: 69,
      durationSeconds: 0.029,
      gain: 0.012,
      delaySeconds: 0.005,
    },
  ],
  [
    {
      frequencyHz: 164,
      durationSeconds: 0.031,
      gain: 0.024,
    },
    {
      frequencyHz: 82,
      durationSeconds: 0.027,
      gain: 0.011,
      delaySeconds: 0.004,
    },
  ],
];

const ATTACK_SECONDS = 0.002;
const RELEASE_SECONDS = 0.009;
const SILENT_GAIN = 0.0001;

export class VectorMazeScuffleAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playStep(frame: 0 | 1): void {
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
        SCUFFLE_RECIPES[frame],
      );
    };

    if (context.state === "suspended") {
      void context
        .resume()
        .then(schedule)
        .catch(() => {
          // Audio may be unavailable or blocked.
        });

      return;
    }

    schedule();
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
    recipe: readonly VectorMazeScuffleVoice[],
  ): void {
    const masterGain = this.masterGain;

    if (masterGain === null) {
      return;
    }

    const recipeStart = context.currentTime + 0.003;

    for (const voice of recipe) {
      const startAt =
        recipeStart + (voice.delaySeconds ?? 0);

      const endAt =
        startAt + voice.durationSeconds;

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
        voice.frequencyHz,
        startAt,
      );

      gain.gain.setValueAtTime(
        SILENT_GAIN,
        startAt,
      );

      gain.gain.exponentialRampToValueAtTime(
        voice.gain,
        attackEnd,
      );

      gain.gain.setValueAtTime(
        voice.gain,
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
