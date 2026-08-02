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
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  Bb2: 116.54,
  Cs3: 138.59,

  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  Cs4: 277.18,

  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  Cs5: 554.37,

  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  Bb5: 932.33,
  Cs6: 1108.73,
  D6: 1174.66,
} as const;

interface TimedPitch {
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
 * Creates the movement's characteristic repeated-note "shivering" texture.
 */
function repeatedNotes(
  startBeat: number,
  frequency: number,
  count: number,
  stepBeats: number,
  gain = 0.105,
): TimedPitch[] {
  return Array.from({ length: count }, (_, index) => ({
    beat: startBeat + index * stepBeats,
    duration: stepBeats * 0.72,
    frequency,
    gain,
    accent: index % 4 === 0,
  }));
}

/**
 * Converts a pitch sequence into evenly spaced fast notes.
 */
function run(
  startBeat: number,
  frequencies: readonly number[],
  stepBeats = 0.25,
  gain = 0.12,
): TimedPitch[] {
  return frequencies.map((frequency, index) => ({
    beat: startBeat + index * stepBeats,
    duration: stepBeats * 0.84,
    frequency,
    gain,
    accent: index === 0,
  }));
}

const soloViolin: readonly TimedPitch[] = [
  // Opening frozen tremble
  ...repeatedNotes(0, NOTE.F5, 8, 0.25),
  ...repeatedNotes(2, NOTE.E5, 8, 0.25),

  ...repeatedNotes(4, NOTE.F5, 8, 0.25),
  ...repeatedNotes(6, NOTE.D5, 8, 0.25),

  // First sharp ascent and fall
  ...run(8, [
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
  ]),

  ...run(10, [
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.Cs5,
    NOTE.D5,
    NOTE.A4,
  ]),

  // Repeated bow-stroke figure
  ...repeatedNotes(12, NOTE.D5, 8, 0.25, 0.12),
  ...repeatedNotes(14, NOTE.A4, 8, 0.25, 0.115),

  // Storm run
  ...run(16, [
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.Bb5,
    NOTE.A5,
    NOTE.G5,
  ]),

  ...run(18, [
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.Bb5,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
  ]),

  ...run(20, [
    NOTE.D5,
    NOTE.F5,
    NOTE.A5,
    NOTE.D6,
    NOTE.Cs6,
    NOTE.Bb5,
    NOTE.A5,
    NOTE.G5,
  ]),

  ...run(22, [
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.Cs5,
    NOTE.D5,
    NOTE.A4,
    NOTE.F4,
    NOTE.D4,
  ]),

  // Brief held gestures
  { beat: 24, duration: 1, frequency: NOTE.A5, gain: 0.14, accent: true },
  { beat: 25, duration: 0.5, frequency: NOTE.G5, gain: 0.125 },
  { beat: 25.5, duration: 0.5, frequency: NOTE.F5, gain: 0.125 },
  { beat: 26, duration: 1, frequency: NOTE.E5, gain: 0.13 },
  { beat: 27, duration: 1, frequency: NOTE.D5, gain: 0.14, accent: true },

  // Shivering answer
  ...repeatedNotes(28, NOTE.F5, 8, 0.25),
  ...repeatedNotes(30, NOTE.E5, 8, 0.25),

  // Higher register sequence
  ...run(32, [
    NOTE.A5,
    NOTE.Bb5,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.F5,
  ]),

  ...run(34, [
    NOTE.G5,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
    NOTE.F5,
    NOTE.G5,
    NOTE.E5,
  ]),

  ...run(36, [
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.Bb5,
    NOTE.Cs6,
    NOTE.D6,
    NOTE.Cs6,
    NOTE.Bb5,
  ]),

  ...run(38, [
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.Cs5,
    NOTE.D5,
    NOTE.A4,
  ]),

  // Driving middle passage
  ...repeatedNotes(40, NOTE.D5, 8, 0.25, 0.12),
  ...repeatedNotes(42, NOTE.F5, 8, 0.25, 0.12),

  ...run(44, [
    NOTE.D5,
    NOTE.F5,
    NOTE.A5,
    NOTE.F5,
    NOTE.D5,
    NOTE.F5,
    NOTE.A5,
    NOTE.D6,
  ]),

  ...run(46, [
    NOTE.Cs6,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.Cs5,
    NOTE.A4,
  ]),

  // Final storm
  ...run(48, [
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.G5,
    NOTE.A5,
    NOTE.Bb5,
    NOTE.Cs6,
    NOTE.D6,
  ]),

  ...run(50, [
    NOTE.D6,
    NOTE.Cs6,
    NOTE.Bb5,
    NOTE.A5,
    NOTE.G5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
  ]),

  ...repeatedNotes(52, NOTE.A5, 8, 0.25, 0.125),
  ...repeatedNotes(54, NOTE.D5, 8, 0.25, 0.13),

  ...run(56, [
    NOTE.D5,
    NOTE.F5,
    NOTE.A5,
    NOTE.D6,
    NOTE.A5,
    NOTE.F5,
    NOTE.D5,
    NOTE.A4,
  ]),

  ...run(58, [
    NOTE.Bb4,
    NOTE.Cs5,
    NOTE.D5,
    NOTE.E5,
    NOTE.F5,
    NOTE.E5,
    NOTE.D5,
    NOTE.Cs5,
  ]),

  // Cadential return
  ...repeatedNotes(60, NOTE.D5, 6, 0.25, 0.135),

  { beat: 61.5, duration: 0.5, frequency: NOTE.A4, gain: 0.14 },
  { beat: 62, duration: 0.5, frequency: NOTE.Cs5, gain: 0.145 },
  { beat: 62.5, duration: 0.5, frequency: NOTE.D5, gain: 0.15 },
  { beat: 63, duration: 1, frequency: NOTE.D5, gain: 0.17, accent: true },
];

const stringPulses: readonly ChordEvent[] = [
  // D minor opening
  {
    beat: 0,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 1,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 2,
    duration: 0.35,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },
  {
    beat: 3,
    duration: 0.35,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },

  {
    beat: 4,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 5,
    duration: 0.35,
    frequencies: [NOTE.Bb3, NOTE.D4, NOTE.F4],
  },
  {
    beat: 6,
    duration: 0.35,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },
  {
    beat: 7,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },

  // Running section
  {
    beat: 8,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 10,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },
  {
    beat: 12,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 14,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },

  {
    beat: 16,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
    gain: 0.04,
  },
  {
    beat: 18,
    duration: 0.7,
    frequencies: [NOTE.G3, NOTE.Bb3, NOTE.D4],
    gain: 0.04,
  },
  {
    beat: 20,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
    gain: 0.04,
  },
  {
    beat: 22,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
    gain: 0.045,
  },

  // Central phrase
  {
    beat: 24,
    duration: 1.5,
    frequencies: [NOTE.F4, NOTE.A4, NOTE.D5],
    gain: 0.032,
  },
  {
    beat: 26,
    duration: 1.5,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
    gain: 0.032,
  },
  {
    beat: 28,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 30,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },

  // Higher sequence
  {
    beat: 32,
    duration: 0.7,
    frequencies: [NOTE.F4, NOTE.A4, NOTE.D5],
  },
  {
    beat: 34,
    duration: 0.7,
    frequencies: [NOTE.G4, NOTE.Bb4, NOTE.D5],
  },
  {
    beat: 36,
    duration: 0.7,
    frequencies: [NOTE.A4, NOTE.Cs5, NOTE.E5],
  },
  {
    beat: 38,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },

  // Driving return
  {
    beat: 40,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 42,
    duration: 0.35,
    frequencies: [NOTE.Bb3, NOTE.D4, NOTE.F4],
  },
  {
    beat: 44,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 46,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },

  // Final section
  {
    beat: 48,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
    gain: 0.045,
  },
  {
    beat: 50,
    duration: 0.7,
    frequencies: [NOTE.G3, NOTE.Bb3, NOTE.D4],
    gain: 0.045,
  },
  {
    beat: 52,
    duration: 0.35,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
    gain: 0.045,
  },
  {
    beat: 54,
    duration: 0.35,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
    gain: 0.05,
  },

  {
    beat: 56,
    duration: 0.7,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 58,
    duration: 0.7,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
  },
  {
    beat: 60,
    duration: 0.35,
    frequencies: [NOTE.A3, NOTE.Cs4, NOTE.E4],
    gain: 0.05,
  },
  {
    beat: 63,
    duration: 0.9,
    frequencies: [NOTE.D3, NOTE.F3, NOTE.A3, NOTE.D4],
    gain: 0.07,
  },
];

const bassLine: readonly TimedPitch[] = [
  { beat: 0, duration: 2, frequency: NOTE.D2, gain: 0.075 },
  { beat: 2, duration: 2, frequency: NOTE.A2, gain: 0.075 },
  { beat: 4, duration: 2, frequency: NOTE.D2, gain: 0.075 },
  { beat: 6, duration: 2, frequency: NOTE.A2, gain: 0.075 },

  { beat: 8, duration: 1, frequency: NOTE.D2 },
  { beat: 9, duration: 1, frequency: NOTE.A2 },
  { beat: 10, duration: 1, frequency: NOTE.D3 },
  { beat: 11, duration: 1, frequency: NOTE.A2 },

  { beat: 12, duration: 1, frequency: NOTE.D2 },
  { beat: 13, duration: 1, frequency: NOTE.F2 },
  { beat: 14, duration: 1, frequency: NOTE.A2 },
  { beat: 15, duration: 1, frequency: NOTE.Cs3 },

  { beat: 16, duration: 2, frequency: NOTE.D2 },
  { beat: 18, duration: 2, frequency: NOTE.G2 },
  { beat: 20, duration: 2, frequency: NOTE.A2 },
  { beat: 22, duration: 2, frequency: NOTE.D2 },

  { beat: 24, duration: 2, frequency: NOTE.D2 },
  { beat: 26, duration: 2, frequency: NOTE.A2 },
  { beat: 28, duration: 2, frequency: NOTE.D2 },
  { beat: 30, duration: 2, frequency: NOTE.A2 },

  { beat: 32, duration: 2, frequency: NOTE.D2 },
  { beat: 34, duration: 2, frequency: NOTE.G2 },
  { beat: 36, duration: 2, frequency: NOTE.A2 },
  { beat: 38, duration: 2, frequency: NOTE.D2 },

  { beat: 40, duration: 1, frequency: NOTE.D2 },
  { beat: 41, duration: 1, frequency: NOTE.A2 },
  { beat: 42, duration: 1, frequency: NOTE.Bb2 },
  { beat: 43, duration: 1, frequency: NOTE.F2 },

  { beat: 44, duration: 1, frequency: NOTE.D2 },
  { beat: 45, duration: 1, frequency: NOTE.F2 },
  { beat: 46, duration: 1, frequency: NOTE.A2 },
  { beat: 47, duration: 1, frequency: NOTE.Cs3 },

  { beat: 48, duration: 2, frequency: NOTE.D2, gain: 0.08 },
  { beat: 50, duration: 2, frequency: NOTE.G2, gain: 0.08 },
  { beat: 52, duration: 2, frequency: NOTE.A2, gain: 0.085 },
  { beat: 54, duration: 2, frequency: NOTE.D2, gain: 0.09 },

  { beat: 56, duration: 1, frequency: NOTE.D2 },
  { beat: 57, duration: 1, frequency: NOTE.F2 },
  { beat: 58, duration: 1, frequency: NOTE.A2 },
  { beat: 59, duration: 1, frequency: NOTE.Cs3 },

  { beat: 60, duration: 2, frequency: NOTE.A2, gain: 0.09 },
  { beat: 62, duration: 2, frequency: NOTE.D2, gain: 0.105 },
];

function buildSoloNotes(): SynthNote[] {
  return soloViolin.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration,
    gain: event.gain ?? 0.115,
    waveform: "sawtooth",
    attackSeconds: event.accent ? 0.002 : 0.004,
    releaseSeconds: event.accent ? 0.022 : 0.018,
  }));
}

function buildStringPulseNotes(): SynthNote[] {
  return stringPulses.flatMap((event) =>
    event.frequencies.map((frequency) => ({
      frequencyHz: frequency,
      startBeat: event.beat,
      durationBeats: event.duration,
      gain: event.gain ?? 0.034,
      waveform: "square" as const,
      attackSeconds: 0.003,
      releaseSeconds: 0.025,
    })),
  );
}

function buildBassNotes(): SynthNote[] {
  return bassLine.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration * 0.9,
    gain: event.gain ?? 0.068,
    waveform: "triangle",
    attackSeconds: 0.005,
    releaseSeconds: 0.045,
  }));
}

/**
 * Antonio Vivaldi:
 * The Four Seasons — Winter, RV 297
 * I. Allegro non molto
 *
 * Condensed synth arrangement:
 * - Sawtooth solo violin
 * - Detached square-wave string chords
 * - Triangle-wave continuo bass
 *
 * This is a short looping adaptation of the first movement's primary
 * textures and gestures, not a complete transcription.
 */
export const VIVALDI_WINTER_TRACK: MusicTrack = {
  id: "vivaldi-winter",
  title: "The Four Seasons: Winter — I. Allegro non molto",
  composer: "Antonio Vivaldi",
  tempoBpm: 144,
  lengthBeats: 64,
  loop: true,
  notes: [
    ...buildSoloNotes(),
    ...buildStringPulseNotes(),
    ...buildBassNotes(),
  ],
};