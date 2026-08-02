import type {
  SpaceWarSide,
} from "./space-war-model";

interface BuzzStep {
  readonly frequencyHz: number;
  readonly endFrequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

interface ActiveThrust {
  readonly oscillator: OscillatorNode;
  readonly gain: GainNode;
}

const AudioContextConstructor = globalThis.AudioContext;

export class SpaceWarBuzzAudio {
  private context: AudioContext | null = null;
  private readonly activeOscillators = new Set<OscillatorNode>();
  private readonly thrust = new Map<SpaceWarSide, ActiveThrust>();

  public playStart(): void {
    this.playRecipe([
      {
        frequencyHz: 94,
        endFrequencyHz: 72,
        durationSeconds: 0.18,
        gain: 0.08,
      },
      {
        frequencyHz: 188,
        endFrequencyHz: 142,
        durationSeconds: 0.11,
        gain: 0.045,
        delaySeconds: 0.035,
      },
    ]);
  }

  public playFire(side: SpaceWarSide): void {
    const offset = side === "player" ? 0 : -70;

    this.playRecipe([
      {
        frequencyHz: 570 + offset,
        endFrequencyHz: 220 + offset * 0.35,
        durationSeconds: 0.085,
        gain: 0.09,
      },
    ]);
  }

  public playExplosion(side: SpaceWarSide): void {
    const offset = side === "player" ? 0 : 18;

    this.playRecipe([
      {
        frequencyHz: 128 + offset,
        endFrequencyHz: 46,
        durationSeconds: 0.34,
        gain: 0.12,
      },
      {
        frequencyHz: 72 + offset * 0.5,
        endFrequencyHz: 34,
        durationSeconds: 0.43,
        gain: 0.08,
        delaySeconds: 0.025,
      },
    ]);
  }

  public playPoint(): void {
    this.playRecipe([
      {
        frequencyHz: 206,
        endFrequencyHz: 154,
        durationSeconds: 0.095,
        gain: 0.075,
      },
      {
        frequencyHz: 322,
        endFrequencyHz: 246,
        durationSeconds: 0.09,
        gain: 0.05,
        delaySeconds: 0.055,
      },
    ]);
  }

  public playWin(): void {
    this.playRecipe([
      {
        frequencyHz: 196,
        endFrequencyHz: 214,
        durationSeconds: 0.18,
        gain: 0.075,
      },
      {
        frequencyHz: 294,
        endFrequencyHz: 326,
        durationSeconds: 0.22,
        gain: 0.075,
        delaySeconds: 0.13,
      },
      {
        frequencyHz: 392,
        endFrequencyHz: 466,
        durationSeconds: 0.32,
        gain: 0.09,
        delaySeconds: 0.28,
      },
    ]);
  }

  public playLose(): void {
    this.playRecipe([
      {
        frequencyHz: 118,
        endFrequencyHz: 69,
        durationSeconds: 0.31,
        gain: 0.09,
      },
      {
        frequencyHz: 59,
        endFrequencyHz: 38,
        durationSeconds: 0.46,
        gain: 0.085,
        delaySeconds: 0.14,
      },
    ]);
  }

  public setThrusting(
    side: SpaceWarSide,
    active: boolean,
  ): void {
    if (!active) {
      this.stopThrust(side);
      return;
    }

    if (this.thrust.has(side)) {
      return;
    }

    const context = this.getContext();

    if (context === null) {
      return;
    }

    void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(
      side === "player" ? 72 : 88,
      now,
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      side === "player" ? 0.052 : 0.037,
      now + 0.035,
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);

    this.thrust.set(side, {
      oscillator,
      gain,
    });
  }

  public stopAllThrust(): void {
    this.stopThrust("player");
    this.stopThrust("opponent");
  }

  public destroy(): void {
    this.stopAllThrust();

    for (const oscillator of this.activeOscillators) {
      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have stopped naturally.
      }

      oscillator.disconnect();
    }

    this.activeOscillators.clear();
    this.context = null;
  }

  private stopThrust(side: SpaceWarSide): void {
    const active = this.thrust.get(side);

    if (active === undefined || this.context === null) {
      return;
    }

    this.thrust.delete(side);

    const now = this.context.currentTime;
    active.gain.gain.cancelScheduledValues(now);
    active.gain.gain.setValueAtTime(
      Math.max(0.0001, active.gain.gain.value),
      now,
    );
    active.gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.035,
    );
    active.oscillator.stop(now + 0.04);
    active.oscillator.addEventListener(
      "ended",
      () => {
        active.oscillator.disconnect();
        active.gain.disconnect();
      },
      { once: true },
    );
  }

  private getContext(): AudioContext | null {
    if (this.context !== null) {
      return this.context;
    }

    if (AudioContextConstructor === undefined) {
      return null;
    }

    this.context = new AudioContextConstructor();
    return this.context;
  }

  private playRecipe(steps: readonly BuzzStep[]): void {
    const context = this.getContext();

    if (context === null) {
      return;
    }

    void context.resume();

    for (const step of steps) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt =
        context.currentTime + (step.delaySeconds ?? 0);
      const endAt = startAt + step.durationSeconds;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(
        Math.max(1, step.frequencyHz),
        startAt,
      );
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, step.endFrequencyHz),
        endAt,
      );

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, step.gain),
        startAt + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        endAt,
      );

      oscillator.connect(gain);
      gain.connect(context.destination);
      this.activeOscillators.add(oscillator);

      oscillator.start(startAt);
      oscillator.stop(endAt + 0.01);
      oscillator.addEventListener(
        "ended",
        () => {
          oscillator.disconnect();
          gain.disconnect();
          this.activeOscillators.delete(oscillator);
        },
        { once: true },
      );
    }
  }
}
