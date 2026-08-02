export interface SynthNote {
  readonly frequencyHz: number;
  readonly startBeat: number;
  readonly durationBeats: number;
  readonly gain: number;
  readonly waveform: OscillatorType;
  readonly attackSeconds?: number;
  readonly releaseSeconds?: number;
  readonly endFrequencyHz?: number;
}

export interface MusicTrack {
  readonly id: string;
  readonly title: string;
  readonly composer: string;
  readonly tempoBpm: number;
  readonly lengthBeats: number;
  readonly loop: boolean;
  readonly notes: readonly SynthNote[];
}

const NOTE = {
  C2: 65.41,
  D2: 73.42,
  Eb2: 77.78,
  F2: 87.31,
  G2: 98.0,
  Ab2: 103.83,
  Bb2: 116.54,

  C3: 130.81,
  D3: 146.83,
  Eb3: 155.56,
  F3: 174.61,
  G3: 196.0,
  Ab3: 207.65,
  Bb3: 233.08,
  B3: 246.94,

  C4: 261.63,
  D4: 293.66,
  Eb4: 311.13,
  F4: 349.23,
  G4: 392.0,
  Ab4: 415.3,
  Bb4: 466.16,
  B4: 493.88,

  C5: 523.25,
  D5: 587.33,
  Eb5: 622.25,
  F5: 698.46,
  G5: 783.99,
} as const;

interface PhraseNote {
  readonly beat: number;
  readonly duration: number;
  readonly frequency: number;
  readonly gain?: number;
  readonly accent?: boolean;
}

interface ChordEvent {
  readonly beat: number;
  readonly duration: number;
  readonly frequencies: readonly number[];
  readonly gain?: number;
}

/**
 * The short-short-short-long "fate" gesture.
 *
 * The function accepts a starting beat and four pitches so the motif can be
 * reused in transposition throughout the arrangement.
 */
function fateMotif(
  startBeat: number,
  pitches: readonly [number, number, number, number],
  gain = 0.14,
): PhraseNote[] {
  return [
    {
      beat: startBeat,
      duration: 0.5,
      frequency: pitches[0],
      gain,
      accent: true,
    },
    {
      beat: startBeat + 0.5,
      duration: 0.5,
      frequency: pitches[1],
      gain,
      accent: true,
    },
    {
      beat: startBeat + 1,
      duration: 0.5,
      frequency: pitches[2],
      gain,
      accent: true,
    },
    {
      beat: startBeat + 1.5,
      duration: 2.5,
      frequency: pitches[3],
      gain: gain * 1.08,
      accent: true,
    },
  ];
}

const lead: readonly PhraseNote[] = [
  // Opening: G G G Eb
  ...fateMotif(0, [NOTE.G4, NOTE.G4, NOTE.G4, NOTE.Eb4]),

  // Answer: F F F D
  ...fateMotif(4, [NOTE.F4, NOTE.F4, NOTE.F4, NOTE.D4]),

  // Rising sequential development
  ...fateMotif(8, [NOTE.G4, NOTE.G4, NOTE.G4, NOTE.Eb4]),
  ...fateMotif(12, [NOTE.Ab4, NOTE.Ab4, NOTE.Ab4, NOTE.F4]),

  // Short dramatic continuation
  { beat: 16, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 16.5, duration: 0.5, frequency: NOTE.Ab4, accent: true },
  { beat: 17, duration: 0.5, frequency: NOTE.Bb4, accent: true },
  { beat: 17.5, duration: 0.5, frequency: NOTE.C5, accent: true },

  { beat: 18, duration: 0.5, frequency: NOTE.Bb4 },
  { beat: 18.5, duration: 0.5, frequency: NOTE.Ab4 },
  { beat: 19, duration: 0.5, frequency: NOTE.G4 },
  { beat: 19.5, duration: 0.5, frequency: NOTE.F4 },

  { beat: 20, duration: 1, frequency: NOTE.Eb4, accent: true },
  { beat: 21, duration: 1, frequency: NOTE.G4 },
  { beat: 22, duration: 1, frequency: NOTE.C5 },
  { beat: 23, duration: 1, frequency: NOTE.Bb4 },

  // More lyrical contrasting phrase
  { beat: 24, duration: 1, frequency: NOTE.Eb4 },
  { beat: 25, duration: 0.5, frequency: NOTE.F4 },
  { beat: 25.5, duration: 0.5, frequency: NOTE.G4 },
  { beat: 26, duration: 1, frequency: NOTE.Ab4 },
  { beat: 27, duration: 1, frequency: NOTE.G4 },

  { beat: 28, duration: 1, frequency: NOTE.F4 },
  { beat: 29, duration: 0.5, frequency: NOTE.G4 },
  { beat: 29.5, duration: 0.5, frequency: NOTE.Ab4 },
  { beat: 30, duration: 1, frequency: NOTE.Bb4 },
  { beat: 31, duration: 1, frequency: NOTE.G4 },

  // Motif returns in a brighter register
  ...fateMotif(32, [NOTE.C5, NOTE.C5, NOTE.C5, NOTE.Ab4]),
  ...fateMotif(36, [NOTE.Bb4, NOTE.Bb4, NOTE.Bb4, NOTE.G4]),

  // Descending development
  ...fateMotif(40, [NOTE.Ab4, NOTE.Ab4, NOTE.Ab4, NOTE.F4]),
  ...fateMotif(44, [NOTE.G4, NOTE.G4, NOTE.G4, NOTE.Eb4]),

  // Accelerating fragment exchange
  { beat: 48, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 48.5, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 49, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 49.5, duration: 0.5, frequency: NOTE.Eb4, accent: true },

  { beat: 50, duration: 0.5, frequency: NOTE.Ab4, accent: true },
  { beat: 50.5, duration: 0.5, frequency: NOTE.Ab4, accent: true },
  { beat: 51, duration: 0.5, frequency: NOTE.Ab4, accent: true },
  { beat: 51.5, duration: 0.5, frequency: NOTE.F4, accent: true },

  { beat: 52, duration: 0.5, frequency: NOTE.Bb4, accent: true },
  { beat: 52.5, duration: 0.5, frequency: NOTE.Bb4, accent: true },
  { beat: 53, duration: 0.5, frequency: NOTE.Bb4, accent: true },
  { beat: 53.5, duration: 0.5, frequency: NOTE.G4, accent: true },

  { beat: 54, duration: 0.5, frequency: NOTE.C5, accent: true },
  { beat: 54.5, duration: 0.5, frequency: NOTE.Bb4 },
  { beat: 55, duration: 0.5, frequency: NOTE.Ab4 },
  { beat: 55.5, duration: 0.5, frequency: NOTE.G4 },

  // Final cadence
  { beat: 56, duration: 0.5, frequency: NOTE.F4, accent: true },
  { beat: 56.5, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 57, duration: 0.5, frequency: NOTE.Ab4, accent: true },
  { beat: 57.5, duration: 0.5, frequency: NOTE.B4, accent: true },

  { beat: 58, duration: 1, frequency: NOTE.C5, accent: true },
  { beat: 59, duration: 1, frequency: NOTE.G4 },
  { beat: 60, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 60.5, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 61, duration: 0.5, frequency: NOTE.G4, accent: true },
  { beat: 61.5, duration: 0.5, frequency: NOTE.Eb4, accent: true },

  { beat: 62, duration: 2, frequency: NOTE.C4, gain: 0.17, accent: true },
];

const bass: readonly PhraseNote[] = [
  // Opening tonic and dominant reinforcement
  { beat: 0, duration: 4, frequency: NOTE.C2, gain: 0.075 },
  { beat: 4, duration: 4, frequency: NOTE.G2, gain: 0.075 },
  { beat: 8, duration: 4, frequency: NOTE.C2, gain: 0.075 },
  { beat: 12, duration: 4, frequency: NOTE.F2, gain: 0.075 },

  // Driving quarter-note bass
  { beat: 16, duration: 1, frequency: NOTE.C2 },
  { beat: 17, duration: 1, frequency: NOTE.G2 },
  { beat: 18, duration: 1, frequency: NOTE.C3 },
  { beat: 19, duration: 1, frequency: NOTE.G2 },

  { beat: 20, duration: 1, frequency: NOTE.C2 },
  { beat: 21, duration: 1, frequency: NOTE.Eb2 },
  { beat: 22, duration: 1, frequency: NOTE.G2 },
  { beat: 23, duration: 1, frequency: NOTE.Bb2 },

  // Contrasting phrase
  { beat: 24, duration: 2, frequency: NOTE.Eb2 },
  { beat: 26, duration: 2, frequency: NOTE.Bb2 },
  { beat: 28, duration: 2, frequency: NOTE.F2 },
  { beat: 30, duration: 2, frequency: NOTE.G2 },

  // Return and development
  { beat: 32, duration: 4, frequency: NOTE.Ab2, gain: 0.075 },
  { beat: 36, duration: 4, frequency: NOTE.G2, gain: 0.075 },
  { beat: 40, duration: 4, frequency: NOTE.F2, gain: 0.075 },
  { beat: 44, duration: 4, frequency: NOTE.C2, gain: 0.08 },

  // Final drive
  { beat: 48, duration: 1, frequency: NOTE.C2 },
  { beat: 49, duration: 1, frequency: NOTE.Eb2 },
  { beat: 50, duration: 1, frequency: NOTE.F2 },
  { beat: 51, duration: 1, frequency: NOTE.Ab2 },

  { beat: 52, duration: 1, frequency: NOTE.G2 },
  { beat: 53, duration: 1, frequency: NOTE.Bb2 },
  { beat: 54, duration: 1, frequency: NOTE.C3 },
  { beat: 55, duration: 1, frequency: NOTE.G2 },

  { beat: 56, duration: 1, frequency: NOTE.F2 },
  { beat: 57, duration: 1, frequency: NOTE.G2 },
  { beat: 58, duration: 1, frequency: NOTE.C3 },
  { beat: 59, duration: 1, frequency: NOTE.G2 },

  { beat: 60, duration: 2, frequency: NOTE.G2, gain: 0.085 },
  { beat: 62, duration: 2, frequency: NOTE.C2, gain: 0.1 },
];

const harmony: readonly ChordEvent[] = [
  {
    beat: 0,
    duration: 0.45,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
    gain: 0.045,
  },
  {
    beat: 1.5,
    duration: 2.35,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
    gain: 0.04,
  },

  {
    beat: 4,
    duration: 0.45,
    frequencies: [NOTE.G2, NOTE.B3, NOTE.D4],
    gain: 0.04,
  },
  {
    beat: 5.5,
    duration: 2.35,
    frequencies: [NOTE.G2, NOTE.B3, NOTE.D4],
    gain: 0.04,
  },

  {
    beat: 8,
    duration: 0.45,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },
  {
    beat: 12,
    duration: 0.45,
    frequencies: [NOTE.F3, NOTE.Ab3, NOTE.C4],
  },

  {
    beat: 16,
    duration: 0.8,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },
  {
    beat: 18,
    duration: 0.8,
    frequencies: [NOTE.Bb2, NOTE.D3, NOTE.F3],
  },
  {
    beat: 20,
    duration: 0.8,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },
  {
    beat: 22,
    duration: 0.8,
    frequencies: [NOTE.G2, NOTE.B3, NOTE.D4],
  },

  {
    beat: 24,
    duration: 1.8,
    frequencies: [NOTE.Eb3, NOTE.G3, NOTE.Bb3],
    gain: 0.032,
  },
  {
    beat: 28,
    duration: 1.8,
    frequencies: [NOTE.F3, NOTE.Ab3, NOTE.C4],
    gain: 0.032,
  },

  {
    beat: 32,
    duration: 0.45,
    frequencies: [NOTE.Ab3, NOTE.C4, NOTE.Eb4],
  },
  {
    beat: 36,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },
  {
    beat: 40,
    duration: 0.45,
    frequencies: [NOTE.F3, NOTE.Ab3, NOTE.C4],
  },
  {
    beat: 44,
    duration: 0.45,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },

  {
    beat: 48,
    duration: 0.38,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },
  {
    beat: 50,
    duration: 0.38,
    frequencies: [NOTE.F3, NOTE.Ab3, NOTE.C4],
  },
  {
    beat: 52,
    duration: 0.38,
    frequencies: [NOTE.G3, NOTE.Bb3, NOTE.D4],
  },
  {
    beat: 54,
    duration: 0.38,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
  },

  {
    beat: 58,
    duration: 0.9,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3],
    gain: 0.05,
  },
  {
    beat: 60,
    duration: 0.45,
    frequencies: [NOTE.G2, NOTE.B3, NOTE.D4],
    gain: 0.05,
  },
  {
    beat: 62,
    duration: 1.9,
    frequencies: [NOTE.C3, NOTE.Eb3, NOTE.G3, NOTE.C4],
    gain: 0.065,
  },
];

function buildLeadNotes(): SynthNote[] {
  return lead.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration * 0.92,
    gain: event.gain ?? (event.accent ? 0.145 : 0.115),
    waveform: "sawtooth",
    attackSeconds: event.accent ? 0.003 : 0.008,
    releaseSeconds: event.accent ? 0.035 : 0.055,
  }));
}

function buildBassNotes(): SynthNote[] {
  return bass.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration * 0.94,
    gain: event.gain ?? 0.065,
    waveform: "triangle",
    attackSeconds: 0.006,
    releaseSeconds: 0.055,
  }));
}

function buildHarmonyNotes(): SynthNote[] {
  return harmony.flatMap((event) =>
    event.frequencies.map((frequency) => ({
      frequencyHz: frequency,
      startBeat: event.beat,
      durationBeats: event.duration,
      gain: event.gain ?? 0.034,
      waveform: "square" as const,
      attackSeconds: 0.004,
      releaseSeconds: 0.035,
    })),
  );
}

/**
 * Ludwig van Beethoven:
 * Symphony No. 5 in C minor, Op. 67
 * I. Allegro con brio
 *
 * Condensed synth arrangement:
 * - Sawtooth lead for the principal orchestral gesture
 * - Triangle bass for weight and forward motion
 * - Quiet square-wave harmony stabs
 *
 * This is a short game-loop adaptation of the opening thematic material,
 * not a complete transcription of the movement.
 */
export const BEETHOVEN_FIFTH_TRACK: MusicTrack = {
  id: "beethoven-fifth",
  title: "Symphony No. 5 — I. Allegro con brio",
  composer: "Ludwig van Beethoven",
  tempoBpm: 108,
  lengthBeats: 64,
  loop: true,
  notes: [
    ...buildLeadNotes(),
    ...buildBassNotes(),
    ...buildHarmonyNotes(),
  ],
};