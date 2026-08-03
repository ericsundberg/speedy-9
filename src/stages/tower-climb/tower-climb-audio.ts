interface ToneStep {
  readonly frequencyHz: number;
  readonly durationSeconds: number;
  readonly delaySeconds?: number;
  readonly gain?: number;
  readonly waveform?: OscillatorType;
}

const SILENT_GAIN = 0.0001;

export class TicTacToeAudio {
  private context: AudioContext | null = null;

  private masterGain: GainNode | null = null;

  private readonly oscillators =
    new Set<OscillatorNode>();

  public unlock(): void {
    const context = this.getContext();

    if (
      context !== null
      && context.state === "suspended"
    ) {
      void context.resume().catch(() => {
        // Audio remains optional.
      });
    }
  }

  public playPlayerMove(): void {
    this.play([
      {
        frequencyHz: 392,
        durationSeconds: 0.055,
        gain: 0.035,
        waveform: "square",
      },
      {
        frequencyHz: 523.25,
        durationSeconds: 0.06,
        delaySeconds: 0.035,
        gain: 0.03,
        waveform: "triangle",
      },
    ]);
  }

  public playCpuMove(): void {
    this.play([
      {
        frequencyHz: 196,
        durationSeconds: 0.07,
        gain: 0.035,
        waveform: "square",
      },
      {
        frequencyHz: 164.81,
        durationSeconds: 0.08,
        delaySeconds: 0.035,
        gain: 0.03,
        waveform: "triangle",
      },
    ]);
  }

  public playWin(): void {
    this.play([
      {
        frequencyHz: 392,
        durationSeconds: 0.08,
        gain: 0.04,
      },
      {
        frequencyHz: 523.25,
        durationSeconds: 0.09,
        delaySeconds: 0.07,
        gain: 0.04,
      },
      {
        frequencyHz: 659.25,
        durationSeconds: 0.15,
        delaySeconds: 0.15,
        gain: 0.045,
      },
    ]);
  }

  public playLoss(): void {
    this.play([
      {
        frequencyHz: 220,
        durationSeconds: 0.1,
        gain: 0.04,
        waveform: "sawtooth",
      },
      {
        frequencyHz: 164.81,
        durationSeconds: 0.13,
        delaySeconds: 0.08,
        gain: 0.038,
        waveform: "sawtooth",
      },
      {
        frequencyHz: 110,
        durationSeconds: 0.18,
        delaySeconds: 0.18,
        gain: 0.035,
        waveform: "square",
      },
    ]);
  }

  public destroy(): void {
    for (const oscillator of this.oscillators) {
      try {
        oscillator.stop();
      } catch {
        // It may already be stopped.
      }
    }

    this.oscillators.clear();

    if (this.context !== null) {
      void this.context.close().catch(() => {
        // Closing audio is best effort.
      });
    }

    this.context = null;
    this.masterGain = null;
  }

  private getContext(): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    try {
      const context = new AudioContext();
      const masterGain = context.createGain();

      masterGain.gain.value = 0.72;
      masterGain.connect(context.destination);

      this.context = context;
      this.masterGain = masterGain;

      return context;
    } catch {
      return null;
    }
  }

  private play(recipe: readonly ToneStep[]): void {
    const context = this.getContext();
    const masterGain = this.masterGain;

    if (
      context === null
      || masterGain === null
    ) {
      return;
    }

    const startTime = context.currentTime;

    for (const step of recipe) {
      const oscillator =
        context.createOscillator();

      const gain = context.createGain();

      const toneStart =
        startTime + (step.delaySeconds ?? 0);

      const toneEnd =
        toneStart + step.durationSeconds;

      oscillator.type =
        step.waveform ?? "triangle";

      oscillator.frequency.setValueAtTime(
        step.frequencyHz,
        toneStart,
      );

      gain.gain.setValueAtTime(
        SILENT_GAIN,
        toneStart,
      );

      gain.gain.exponentialRampToValueAtTime(
        step.gain ?? 0.035,
        toneStart + 0.006,
      );

      gain.gain.exponentialRampToValueAtTime(
        SILENT_GAIN,
        toneEnd,
      );

      oscillator.connect(gain);
      gain.connect(masterGain);

      this.oscillators.add(oscillator);

      oscillator.addEventListener(
        "ended",
        () => {
          this.oscillators.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        },
        {
          once: true,
        },
      );

      oscillator.start(toneStart);
      oscillator.stop(toneEnd + 0.01);
    }
  }
}
