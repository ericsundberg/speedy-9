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
  Cs2: 69.3,
  D2: 73.42,
  Eb2: 77.78,
  E2: 82.41,
  F2: 87.31,
  Fs2: 92.5,
  G2: 98.0,
  Ab2: 103.83,
  A2: 110.0,
  Bb2: 116.54,
  B2: 123.47,

  C3: 130.81,
  Cs3: 138.59,
  D3: 146.83,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  Ab3: 207.65,
  A3: 220.0,
  Bb3: 233.08,
  B3: 246.94,

  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  Ab4: 415.3,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,

  C5: 523.25,
  Cs5: 554.37,
  D5: 587.33,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  Ab5: 830.61,
  A5: 880.0,
  Bb5: 932.33,
  B5: 987.77,

  C6: 1046.5,
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

function sequence(
  startBeat: number,
  frequencies: readonly number[],
  stepBeats = 0.25,
  gain = 0.12,
): TimedPitch[] {
  return frequencies.map((frequency, index) => ({
    beat: startBeat + index * stepBeats,
    duration: stepBeats * 0.8,
    frequency,
    gain,
    accent: index === 0,
  }));
}

function repeated(
  startBeat: number,
  frequency: number,
  count: number,
  stepBeats = 0.5,
  gain = 0.125,
): TimedPitch[] {
  return Array.from({ length: count }, (_, index) => ({
    beat: startBeat + index * stepBeats,
    duration: stepBeats * 0.78,
    frequency,
    gain,
    accent: index % 4 === 0,
  }));
}

const lead: readonly TimedPitch[] = [
  // Opening chromatic flourish
  ...sequence(
    0,
    [
      NOTE.C5,
      NOTE.Cs5,
      NOTE.D5,
      NOTE.Eb5,
      NOTE.E5,
      NOTE.F5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.Ab5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.F5,
      NOTE.E5,
      NOTE.Eb5,
      NOTE.D5,
      NOTE.Cs5,
    ],
    0.25,
    0.115,
  ),

  // Principal march statement
  { beat: 4, duration: 0.5, frequency: NOTE.C5, accent: true },
  { beat: 4.5, duration: 0.5, frequency: NOTE.E5 },
  { beat: 5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 5.5, duration: 0.5, frequency: NOTE.C6, accent: true },

  { beat: 6, duration: 0.5, frequency: NOTE.B5 },
  { beat: 6.5, duration: 0.5, frequency: NOTE.Bb5 },
  { beat: 7, duration: 0.5, frequency: NOTE.A5 },
  { beat: 7.5, duration: 0.5, frequency: NOTE.Ab5 },

  { beat: 8, duration: 0.5, frequency: NOTE.G5, accent: true },
  { beat: 8.5, duration: 0.5, frequency: NOTE.E5 },
  { beat: 9, duration: 0.5, frequency: NOTE.C5 },
  { beat: 9.5, duration: 0.5, frequency: NOTE.G4 },

  { beat: 10, duration: 0.5, frequency: NOTE.C5 },
  { beat: 10.5, duration: 0.5, frequency: NOTE.D5 },
  { beat: 11, duration: 1, frequency: NOTE.E5, accent: true },

  // Repeated fanfare tones
  ...repeated(12, NOTE.G5, 4, 0.5, 0.135),

  { beat: 14, duration: 0.5, frequency: NOTE.Ab5 },
  { beat: 14.5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 15, duration: 0.5, frequency: NOTE.F5 },
  { beat: 15.5, duration: 0.5, frequency: NOTE.E5 },

  // Second phrase
  { beat: 16, duration: 0.5, frequency: NOTE.D5, accent: true },
  { beat: 16.5, duration: 0.5, frequency: NOTE.F5 },
  { beat: 17, duration: 0.5, frequency: NOTE.A5 },
  { beat: 17.5, duration: 0.5, frequency: NOTE.C6 },

  { beat: 18, duration: 0.5, frequency: NOTE.B5 },
  { beat: 18.5, duration: 0.5, frequency: NOTE.Bb5 },
  { beat: 19, duration: 0.5, frequency: NOTE.A5 },
  { beat: 19.5, duration: 0.5, frequency: NOTE.Ab5 },

  ...sequence(
    20,
    [
      NOTE.G5,
      NOTE.Fs5,
      NOTE.F5,
      NOTE.E5,
      NOTE.Eb5,
      NOTE.D5,
      NOTE.Cs5,
      NOTE.C5,
      NOTE.B4,
      NOTE.C5,
      NOTE.Cs5,
      NOTE.D5,
      NOTE.Eb5,
      NOTE.E5,
      NOTE.F5,
      NOTE.Fs5,
    ],
    0.25,
    0.12,
  ),

  // Broad middle phrase
  { beat: 24, duration: 1, frequency: NOTE.G5, gain: 0.14, accent: true },
  { beat: 25, duration: 0.5, frequency: NOTE.E5 },
  { beat: 25.5, duration: 0.5, frequency: NOTE.C5 },

  { beat: 26, duration: 1, frequency: NOTE.F5 },
  { beat: 27, duration: 0.5, frequency: NOTE.D5 },
  { beat: 27.5, duration: 0.5, frequency: NOTE.B4 },

  { beat: 28, duration: 1, frequency: NOTE.E5 },
  { beat: 29, duration: 0.5, frequency: NOTE.C5 },
  { beat: 29.5, duration: 0.5, frequency: NOTE.G4 },

  { beat: 30, duration: 0.5, frequency: NOTE.C5 },
  { beat: 30.5, duration: 0.5, frequency: NOTE.E5 },
  { beat: 31, duration: 1, frequency: NOTE.G5, accent: true },

  // Theme returns in brighter register
  ...sequence(
    32,
    [
      NOTE.C5,
      NOTE.E5,
      NOTE.G5,
      NOTE.C6,
      NOTE.B5,
      NOTE.Bb5,
      NOTE.A5,
      NOTE.Ab5,
    ],
    0.5,
    0.14,
  ),

  ...sequence(
    36,
    [
      NOTE.G5,
      NOTE.E5,
      NOTE.C5,
      NOTE.G4,
      NOTE.C5,
      NOTE.D5,
      NOTE.E5,
      NOTE.G5,
    ],
    0.5,
    0.14,
  ),

  // Rapid circus-like chromatic passage
  ...sequence(
    40,
    [
      NOTE.G5,
      NOTE.Ab5,
      NOTE.A5,
      NOTE.Bb5,
      NOTE.B5,
      NOTE.C6,
      NOTE.B5,
      NOTE.Bb5,
      NOTE.A5,
      NOTE.Ab5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.F5,
      NOTE.E5,
      NOTE.Eb5,
      NOTE.D5,
    ],
    0.25,
    0.125,
  ),

  ...sequence(
    44,
    [
      NOTE.Cs5,
      NOTE.D5,
      NOTE.Eb5,
      NOTE.E5,
      NOTE.F5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.Ab5,
      NOTE.A5,
      NOTE.Bb5,
      NOTE.B5,
      NOTE.C6,
      NOTE.G5,
      NOTE.E5,
      NOTE.C5,
      NOTE.G4,
    ],
    0.25,
    0.13,
  ),

  // Trumpet-call fragments
  ...repeated(48, NOTE.C6, 4, 0.5, 0.15),

  { beat: 50, duration: 0.5, frequency: NOTE.B5 },
  { beat: 50.5, duration: 0.5, frequency: NOTE.A5 },
  { beat: 51, duration: 1, frequency: NOTE.G5, accent: true },

  ...repeated(52, NOTE.E5, 4, 0.5, 0.145),

  { beat: 54, duration: 0.5, frequency: NOTE.F5 },
  { beat: 54.5, duration: 0.5, frequency: NOTE.Fs5 },
  { beat: 55, duration: 1, frequency: NOTE.G5, accent: true },

  // Final flourish
  ...sequence(
    56,
    [
      NOTE.C5,
      NOTE.Cs5,
      NOTE.D5,
      NOTE.Eb5,
      NOTE.E5,
      NOTE.F5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.Ab5,
      NOTE.A5,
      NOTE.Bb5,
      NOTE.B5,
      NOTE.C6,
      NOTE.G5,
      NOTE.E5,
      NOTE.C5,
    ],
    0.25,
    0.145,
  ),

  { beat: 60, duration: 0.5, frequency: NOTE.G5, accent: true },
  { beat: 60.5, duration: 0.5, frequency: NOTE.E5, accent: true },
  { beat: 61, duration: 0.5, frequency: NOTE.C5, accent: true },
  { beat: 61.5, duration: 0.5, frequency: NOTE.G4, accent: true },

  { beat: 62, duration: 0.5, frequency: NOTE.B4 },
  { beat: 62.5, duration: 0.5, frequency: NOTE.D5 },
  { beat: 63, duration: 1, frequency: NOTE.C5, gain: 0.18, accent: true },
];

/**
 * Alternating bass notes and upper chords form the march's oom-pah pulse.
 */
const marchBass: readonly TimedPitch[] = Array.from(
  { length: 16 },
  (_, measureIndex) => {
    const measureStart = measureIndex * 4;

    const roots = [
      NOTE.C2,
      NOTE.G2,
      NOTE.C2,
      NOTE.G2,
      NOTE.D2,
      NOTE.G2,
      NOTE.C2,
      NOTE.G2,
    ];

    const root = roots[measureIndex % roots.length]!;

    const fifth =
      root === NOTE.C2
        ? NOTE.G2
        : root === NOTE.D2
          ? NOTE.A2
          : NOTE.D3;

    return [
      {
        beat: measureStart,
        duration: 0.42,
        frequency: root,
        gain: 0.078,
        accent: true,
      },
      {
        beat: measureStart + 1,
        duration: 0.32,
        frequency: fifth,
        gain: 0.058,
      },
      {
        beat: measureStart + 2,
        duration: 0.42,
        frequency: root,
        gain: 0.074,
        accent: true,
      },
      {
        beat: measureStart + 3,
        duration: 0.32,
        frequency: fifth,
        gain: 0.058,
      },
    ];
  },
).flat();

const brassChords: readonly ChordEvent[] = [
  {
    beat: 0,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.04,
  },
  {
    beat: 2,
    duration: 0.4,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
    gain: 0.04,
  },

  {
    beat: 4,
    duration: 0.45,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },
  {
    beat: 6,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },
  {
    beat: 8,
    duration: 0.45,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },
  {
    beat: 10,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },

  {
    beat: 12,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.045,
  },
  {
    beat: 14,
    duration: 0.4,
    frequencies: [NOTE.F4, NOTE.A4, NOTE.C5],
    gain: 0.045,
  },

  {
    beat: 16,
    duration: 0.45,
    frequencies: [NOTE.D4, NOTE.F4, NOTE.A4],
  },
  {
    beat: 18,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },
  {
    beat: 20,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },
  {
    beat: 22,
    duration: 0.45,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },

  {
    beat: 24,
    duration: 1.6,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.034,
  },
  {
    beat: 26,
    duration: 1.6,
    frequencies: [NOTE.F4, NOTE.A4, NOTE.C5],
    gain: 0.034,
  },
  {
    beat: 28,
    duration: 1.6,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
    gain: 0.034,
  },
  {
    beat: 30,
    duration: 1.6,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.038,
  },

  {
    beat: 32,
    duration: 0.45,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.045,
  },
  {
    beat: 36,
    duration: 0.45,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
    gain: 0.045,
  },

  {
    beat: 40,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },
  {
    beat: 42,
    duration: 0.4,
    frequencies: [NOTE.F4, NOTE.A4, NOTE.C5],
  },
  {
    beat: 44,
    duration: 0.4,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
  },
  {
    beat: 46,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },

  {
    beat: 48,
    duration: 0.5,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5],
    gain: 0.052,
  },
  {
    beat: 52,
    duration: 0.5,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4, NOTE.G4],
    gain: 0.052,
  },

  {
    beat: 56,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.05,
  },
  {
    beat: 58,
    duration: 0.4,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
    gain: 0.05,
  },

  {
    beat: 60,
    duration: 0.4,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
    gain: 0.06,
  },
  {
    beat: 61,
    duration: 0.4,
    frequencies: [NOTE.G3, NOTE.B3, NOTE.D4],
    gain: 0.06,
  },
  {
    beat: 63,
    duration: 0.9,
    frequencies: [NOTE.C3, NOTE.E3, NOTE.G3, NOTE.C4],
    gain: 0.075,
  },
];

function buildLeadNotes(): SynthNote[] {
  return lead.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration,
    gain: event.gain ?? 0.12,
    waveform: "square",
    attackSeconds: event.accent ? 0.002 : 0.004,
    releaseSeconds: event.accent ? 0.025 : 0.02,
  }));
}

function buildMarchBassNotes(): SynthNote[] {
  return marchBass.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration,
    gain: event.gain ?? 0.065,
    waveform: "triangle",
    attackSeconds: 0.004,
    releaseSeconds: 0.03,
  }));
}

function buildBrassChordNotes(): SynthNote[] {
  return brassChords.flatMap((event) =>
    event.frequencies.map((frequency) => ({
      frequencyHz: frequency,
      startBeat: event.beat,
      durationBeats: event.duration,
      gain: event.gain ?? 0.038,
      waveform: "sawtooth" as const,
      attackSeconds: 0.003,
      releaseSeconds: 0.03,
    })),
  );
}

/**
 * Julius Fučík:
 * Entry of the Gladiators, Op. 68
 *
 * Condensed synth arrangement:
 * - Square-wave lead for the piercing march melody
 * - Triangle-wave bass for the oom-pah pulse
 * - Sawtooth brass chords for circus-band weight
 *
 * This is a short loop inspired by the march's best-known material rather
 * than a complete transcription.
 */
export const ENTRY_OF_THE_GLADIATORS_TRACK: MusicTrack = {
  id: "entry-of-the-gladiators",
  title: "Entry of the Gladiators",
  composer: "Julius Fučík",
  tempoBpm: 152,
  lengthBeats: 64,
  loop: true,
  notes: [
    ...buildLeadNotes(),
    ...buildMarchBassNotes(),
    ...buildBrassChordNotes(),
  ],
};