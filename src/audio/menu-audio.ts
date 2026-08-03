export interface MenuBuzzStep {
  readonly frequencyHz: number;
  readonly endFrequencyHz: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly delaySeconds?: number;
}

export interface MenuMusicNote {
  readonly frequencyHz: number;
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly waveform: OscillatorType;
}

const STAGE_SELECT_STEP_SECONDS = 0.2;

const STAGE_SELECT_MELODY = [
  261.63,
  392,
  523.25,
  622.25,
  523.25,
  392,
  311.13,
  466.16,
  587.33,
  698.46,
  587.33,
  466.16,
  293.66,
  440,
  587.33,
  659.25,
  587.33,
  440,
  246.94,
  369.99,
  493.88,
  587.33,
  493.88,
  369.99,
] as const;

const STAGE_SELECT_BASS = [
  130.81,
  103.83,
  116.54,
  98,
  130.81,
  103.83,
] as const;

export const STAGE_SELECT_MUSIC_LOOP_SECONDS =
  STAGE_SELECT_MELODY.length
  * STAGE_SELECT_STEP_SECONDS;

export const STAGE_SELECT_MUSIC_NOTES:
readonly MenuMusicNote[] = [
  ...STAGE_SELECT_MELODY.flatMap<MenuMusicNote>(
    (frequencyHz, index) => [
      {
        frequencyHz,
        startSeconds:
          index * STAGE_SELECT_STEP_SECONDS,
        durationSeconds: 0.16,
        gain: 0.016,
        waveform: "triangle",
      },
    ],
  ),
  ...STAGE_SELECT_BASS.flatMap<MenuMusicNote>(
    (frequencyHz, index) => [
      {
        frequencyHz,
        startSeconds:
          index
          * STAGE_SELECT_STEP_SECONDS
          * 4,
        durationSeconds: 0.54,
        gain: 0.018,
        waveform: "square",
      },
    ],
  ),
];

const RUN_COMPLETE_STEP_SECONDS = 0.18;

const RUN_COMPLETE_MELODY = [
  523.25,
  659.25,
  783.99,
  1046.5,
  783.99,
  659.25,
  587.33,
  698.46,
  880,
  1174.66,
  880,
  698.46,
  659.25,
  783.99,
  987.77,
  1318.51,
  987.77,
  783.99,
  698.46,
  880,
  1046.5,
  1396.91,
  1046.5,
  880,
  783.99,
  987.77,
  1174.66,
  1567.98,
  1174.66,
  987.77,
  1046.5,
  1046.5,
] as const;

const RUN_COMPLETE_BASS = [
  130.81,
  196,
  220,
  174.61,
  164.81,
  220,
  196,
  130.81,
] as const;

const RUN_COMPLETE_HARMONY = [
  261.63,
  329.63,
  392,
  523.25,
] as const;

export const RUN_COMPLETE_MUSIC_LOOP_SECONDS =
  RUN_COMPLETE_MELODY.length
  * RUN_COMPLETE_STEP_SECONDS;

export const RUN_COMPLETE_MUSIC_NOTES:
readonly MenuMusicNote[] = [
  ...RUN_COMPLETE_MELODY.map<MenuMusicNote>(
    (frequencyHz, index) => ({
      frequencyHz,
      startSeconds:
        index * RUN_COMPLETE_STEP_SECONDS,
      durationSeconds:
        index === RUN_COMPLETE_MELODY.length - 1
          ? 0.32
          : 0.145,
      gain: 0.017,
      waveform: "triangle",
    }),
  ),
  ...RUN_COMPLETE_BASS.map<MenuMusicNote>(
    (frequencyHz, index) => ({
      frequencyHz,
      startSeconds:
        index
        * RUN_COMPLETE_STEP_SECONDS
        * 4,
      durationSeconds: 0.58,
      gain: 0.018,
      waveform: "square",
    }),
  ),
  ...RUN_COMPLETE_HARMONY.map<MenuMusicNote>(
    (frequencyHz, index) => ({
      frequencyHz,
      startSeconds:
        index
        * RUN_COMPLETE_STEP_SECONDS
        * 8,
      durationSeconds: 1.18,
      gain: 0.009,
      waveform: "sine",
    }),
  ),
];

export const TITLE_BOOT_STING:
readonly MenuBuzzStep[] = [
  {
    frequencyHz: 55,
    endFrequencyHz: 73.42,
    durationSeconds: 0.52,
    gain: 0.026,
  },
  {
    frequencyHz: 110,
    endFrequencyHz: 146.83,
    durationSeconds: 0.16,
    gain: 0.055,
    delaySeconds: 0.02,
  },
  {
    frequencyHz: 220,
    endFrequencyHz: 293.66,
    durationSeconds: 0.14,
    gain: 0.05,
    delaySeconds: 0.14,
  },
  {
    frequencyHz: 440,
    endFrequencyHz: 587.33,
    durationSeconds: 0.14,
    gain: 0.044,
    delaySeconds: 0.26,
  },
  {
    frequencyHz: 880,
    endFrequencyHz: 1174.66,
    durationSeconds: 0.2,
    gain: 0.034,
    delaySeconds: 0.38,
  },
];

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

  private readonly activeMusicOscillators =
    new Set<OscillatorNode>();

  private musicTimerId: number | null = null;
  private musicGeneration = 0;

  public playStageSelectMusic(
    delaySeconds = 0.04,
  ): void {
    this.stopMusic();

    const context = this.getContext(true);

    if (context === null) {
      return;
    }

    const generation = this.musicGeneration;

    const beginMusic = (): void => {
      if (
        this.context !== context
        || context.state !== "running"
        || generation !== this.musicGeneration
      ) {
        return;
      }

      this.scheduleStageSelectLoop(
        context,
        generation,
        Math.max(0, delaySeconds),
      );
    };

    if (context.state === "running") {
      beginMusic();
      return;
    }

    void context
      .resume()
      .then(beginMusic)
      .catch(() => {
        // Music remains silent when audio is unavailable.
      });
  }

  public stopMusic(): void {
    this.musicGeneration += 1;

    if (this.musicTimerId !== null) {
      window.clearTimeout(this.musicTimerId);
      this.musicTimerId = null;
    }

    for (
      const oscillator
      of this.activeMusicOscillators
    ) {
      oscillator.onended = null;

      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have ended.
      }

      oscillator.disconnect();
    }

    this.activeMusicOscillators.clear();
  }

  public playRunCompleteMusic(
    delaySeconds = 0.08,
  ): void {
    this.stopMusic();

    const context = this.getContext(true);

    if (context === null) {
      return;
    }

    const generation = this.musicGeneration;

    const beginMusic = (): void => {
      if (
        this.context !== context
        || context.state !== "running"
        || generation !== this.musicGeneration
      ) {
        return;
      }

      this.scheduleRunCompleteLoop(
        context,
        generation,
        Math.max(0, delaySeconds),
      );
    };

    if (context.state === "running") {
      beginMusic();
      return;
    }

    void context
      .resume()
      .then(beginMusic)
      .catch(() => {
        // Music remains silent when audio is unavailable.
      });
  }

  public playBoot(): void {
    this.playRecipe(
      TITLE_BOOT_STING,
      true,
    );
  }

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
    this.stopMusic();

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

  private scheduleRunCompleteLoop(
    context: AudioContext,
    generation: number,
    delaySeconds: number,
  ): void {
    if (
      this.context !== context
      || context.state !== "running"
      || generation !== this.musicGeneration
    ) {
      return;
    }

    const loopStart =
      context.currentTime + delaySeconds;

    for (const note of RUN_COMPLETE_MUSIC_NOTES) {
      this.scheduleMusicNote(
        context,
        note,
        loopStart,
      );
    }

    const scheduleAheadSeconds = 0.12;

    const timerDelayMs = Math.max(
      1,
      (
        delaySeconds
        + RUN_COMPLETE_MUSIC_LOOP_SECONDS
        - scheduleAheadSeconds
      ) * 1_000,
    );

    this.musicTimerId = window.setTimeout(
      () => {
        this.musicTimerId = null;

        this.scheduleRunCompleteLoop(
          context,
          generation,
          scheduleAheadSeconds,
        );
      },
      timerDelayMs,
    );
  }

  private scheduleStageSelectLoop(
    context: AudioContext,
    generation: number,
    delaySeconds: number,
  ): void {
    if (
      this.context !== context
      || context.state !== "running"
      || generation !== this.musicGeneration
    ) {
      return;
    }

    const loopStart =
      context.currentTime + delaySeconds;

    for (const note of STAGE_SELECT_MUSIC_NOTES) {
      this.scheduleMusicNote(
        context,
        note,
        loopStart,
      );
    }

    const scheduleAheadSeconds = 0.12;

    const timerDelayMs = Math.max(
      1,
      (
        delaySeconds
        + STAGE_SELECT_MUSIC_LOOP_SECONDS
        - scheduleAheadSeconds
      ) * 1_000,
    );

    this.musicTimerId = window.setTimeout(
      () => {
        this.musicTimerId = null;

        this.scheduleStageSelectLoop(
          context,
          generation,
          scheduleAheadSeconds,
        );
      },
      timerDelayMs,
    );
  }

  private scheduleMusicNote(
    context: AudioContext,
    note: MenuMusicNote,
    loopStart: number,
  ): void {
    const masterGain = this.masterGain;

    if (masterGain === null) {
      return;
    }

    const startAt =
      loopStart + note.startSeconds;

    const endAt =
      startAt + note.durationSeconds;

    const attackEnd = Math.min(
      startAt + 0.012,
      endAt,
    );

    const releaseStart = Math.max(
      attackEnd,
      endAt - 0.035,
    );

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = note.waveform;

    oscillator.frequency.setValueAtTime(
      note.frequencyHz,
      startAt,
    );

    gain.gain.setValueAtTime(
      SILENT_GAIN,
      startAt,
    );

    gain.gain.exponentialRampToValueAtTime(
      note.gain,
      attackEnd,
    );

    gain.gain.setValueAtTime(
      note.gain,
      releaseStart,
    );

    gain.gain.exponentialRampToValueAtTime(
      SILENT_GAIN,
      endAt,
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    this.activeMusicOscillators.add(oscillator);

    oscillator.onended = (): void => {
      this.activeMusicOscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };

    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
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
