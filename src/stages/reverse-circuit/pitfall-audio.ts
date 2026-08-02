interface PitfallBuzzStep {
  readonly frequencyHz: number;
  readonly endFrequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

const START_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 110,
    endFrequencyHz: 82,
    durationSeconds: 0.16,
    gain: 0.075,
  },
];

const JUMP_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 294,
    endFrequencyHz: 440,
    durationSeconds: 0.075,
    gain: 0.06,
  },
];

const LAND_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 150,
    endFrequencyHz: 105,
    durationSeconds: 0.045,
    gain: 0.052,
  },
];

const VINE_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 392,
    endFrequencyHz: 330,
    durationSeconds: 0.07,
    gain: 0.058,
  },
  {
    frequencyHz: 523.25,
    endFrequencyHz: 440,
    durationSeconds: 0.07,
    gain: 0.048,
    delaySeconds: 0.045,
  },
];

const ROOM_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 240,
    endFrequencyHz: 190,
    durationSeconds: 0.07,
    gain: 0.05,
  },
];

const TREASURE_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 440,
    endFrequencyHz: 440,
    durationSeconds: 0.075,
    gain: 0.06,
  },
  {
    frequencyHz: 659.25,
    endFrequencyHz: 659.25,
    durationSeconds: 0.075,
    gain: 0.06,
    delaySeconds: 0.07,
  },
  {
    frequencyHz: 880,
    endFrequencyHz: 880,
    durationSeconds: 0.1,
    gain: 0.055,
    delaySeconds: 0.14,
  },
];

const DEATH_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 190,
    endFrequencyHz: 62,
    durationSeconds: 0.24,
    gain: 0.095,
  },
];

const WIN_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 330,
    endFrequencyHz: 330,
    durationSeconds: 0.15,
    gain: 0.075,
  },
  {
    frequencyHz: 495,
    endFrequencyHz: 495,
    durationSeconds: 0.18,
    gain: 0.07,
    delaySeconds: 0.12,
  },
  {
    frequencyHz: 660,
    endFrequencyHz: 660,
    durationSeconds: 0.25,
    gain: 0.065,
    delaySeconds: 0.26,
  },
];

const LOSE_BUZZ: readonly PitfallBuzzStep[] = [
  {
    frequencyHz: 130,
    endFrequencyHz: 58,
    durationSeconds: 0.42,
    gain: 0.1,
  },
];

const SILENT_GAIN = 0.0001;

export class PitfallAudio {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private readonly activeOscillators =
    new Set<OscillatorNode>();

  public playStart(): void {
    this.playRecipe(START_BUZZ);
  }

  public playJump(): void {
    this.playRecipe(JUMP_BUZZ);
  }

  public playLand(): void {
    this.playRecipe(LAND_BUZZ);
  }

  public playVine(): void {
    this.playRecipe(VINE_BUZZ);
  }

  public playRoom(): void {
    this.playRecipe(ROOM_BUZZ);
  }

  public playTreasure(): void {
    this.playRecipe(TREASURE_BUZZ);
  }

  public playDeath(): void {
    this.playRecipe(DEATH_BUZZ);
  }

  public playWin(): void {
    this.playRecipe(WIN_BUZZ);
  }

  public playLose(): void {
    this.playRecipe(LOSE_BUZZ);
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
    recipe: readonly PitfallBuzzStep[],
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
          Math.min(startAt + 0.004, endAt),
        );

        gain.gain.setValueAtTime(
          step.gain,
          Math.max(startAt + 0.004, endAt - 0.01),
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
    };

    if (context.state === "running") {
      schedule();
      return;
    }

    void context.resume().then(schedule).catch(() => {
      // Audio remains silent when unavailable.
    });
  }

  private getContext(): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    const AudioContextConstructor =
      globalThis.AudioContext;

    if (
      typeof AudioContextConstructor
      === "undefined"
    ) {
      return null;
    }

    try {
      const context =
        new AudioContextConstructor();

      const masterGain =
        context.createGain();

      masterGain.gain.value = 0.58;
      masterGain.connect(context.destination);

      this.context = context;
      this.masterGain = masterGain;

      return context;
    } catch {
      return null;
    }
  }
}
