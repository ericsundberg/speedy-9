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
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  B2: 123.47,

  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,

  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,

  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,

  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
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
  stepBeats: number,
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
  stepBeats: number,
  gain = 0.12,
): TimedPitch[] {
  return Array.from({ length: count }, (_, index) => ({
    beat: startBeat + index * stepBeats,
    duration: stepBeats * 0.78,
    frequency,
    gain,
    accent: index % 4 === 0,
  }));
}

/**
 * Condensed version of the famous finale theme.
 *
 * The original overture uses a rapid 2/4 gallop. Here, eighth-note movement
 * is represented as half-beat values within the shared beat-based sequencer.
 */
const lead: readonly TimedPitch[] = [
  // Opening call
  { beat: 0, duration: 0.5, frequency: NOTE.E5, accent: true },
  { beat: 0.5, duration: 0.5, frequency: NOTE.E5 },
  { beat: 1, duration: 1, frequency: NOTE.E5, accent: true },
  { beat: 2, duration: 0.5, frequency: NOTE.E5 },
  { beat: 2.5, duration: 0.5, frequency: NOTE.Fs5 },
  { beat: 3, duration: 1, frequency: NOTE.G5, accent: true },

  { beat: 4, duration: 0.5, frequency: NOTE.G5 },
  { beat: 4.5, duration: 0.5, frequency: NOTE.Fs5 },
  { beat: 5, duration: 0.5, frequency: NOTE.E5 },
  { beat: 5.5, duration: 0.5, frequency: NOTE.D5 },
  { beat: 6, duration: 1, frequency: NOTE.C5 },
  { beat: 7, duration: 1, frequency: NOTE.B4 },

  // Galloping main theme
  ...sequence(
    8,
    [
      NOTE.E5,
      NOTE.E5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.G5,
      NOTE.G5,
      NOTE.A5,
    ],
    0.5,
    0.13,
  ),

  ...sequence(
    12,
    [
      NOTE.B5,
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.E5,
    ],
    0.5,
    0.13,
  ),

  ...sequence(
    16,
    [
      NOTE.D5,
      NOTE.D5,
      NOTE.D5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.Fs5,
      NOTE.Fs5,
      NOTE.G5,
    ],
    0.5,
    0.13,
  ),

  ...sequence(
    20,
    [
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.D5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.D5,
    ],
    0.5,
    0.13,
  ),

  // Bright answering phrase
  { beat: 24, duration: 1, frequency: NOTE.B5, accent: true },
  { beat: 25, duration: 0.5, frequency: NOTE.A5 },
  { beat: 25.5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 26, duration: 1, frequency: NOTE.Fs5 },
  { beat: 27, duration: 1, frequency: NOTE.E5 },

  { beat: 28, duration: 1, frequency: NOTE.A5, accent: true },
  { beat: 29, duration: 0.5, frequency: NOTE.G5 },
  { beat: 29.5, duration: 0.5, frequency: NOTE.Fs5 },
  { beat: 30, duration: 1, frequency: NOTE.E5 },
  { beat: 31, duration: 1, frequency: NOTE.D5 },

  // Rapid string-like run
  ...sequence(
    32,
    [
      NOTE.B4,
      NOTE.C5,
      NOTE.D5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.A5,
      NOTE.B5,
      NOTE.C6,
      NOTE.B5,
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.D5,
      NOTE.C5,
    ],
    0.25,
    0.115,
  ),

  ...sequence(
    36,
    [
      NOTE.B4,
      NOTE.D5,
      NOTE.E5,
      NOTE.G5,
      NOTE.B5,
      NOTE.G5,
      NOTE.E5,
      NOTE.D5,
      NOTE.C5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.A5,
      NOTE.C6,
      NOTE.A5,
      NOTE.Fs5,
      NOTE.E5,
    ],
    0.25,
    0.12,
  ),

  // Main theme returns higher
  ...sequence(
    40,
    [
      NOTE.E5,
      NOTE.E5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.G5,
      NOTE.G5,
      NOTE.A5,
    ],
    0.5,
    0.14,
  ),

  ...sequence(
    44,
    [
      NOTE.B5,
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.Fs5,
      NOTE.G5,
      NOTE.B5,
    ],
    0.5,
    0.14,
  ),

  // Trumpet-call fragments
  ...repeated(48, NOTE.B5, 4, 0.5, 0.145),

  { beat: 50, duration: 0.5, frequency: NOTE.A5, accent: true },
  { beat: 50.5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 51, duration: 1, frequency: NOTE.Fs5 },

  ...repeated(52, NOTE.E5, 4, 0.5, 0.145),

  { beat: 54, duration: 0.5, frequency: NOTE.Fs5 },
  { beat: 54.5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 55, duration: 1, frequency: NOTE.A5, accent: true },

  // Final sprint
  ...sequence(
    56,
    [
      NOTE.B5,
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.G5,
      NOTE.B5,
      NOTE.E6,
      NOTE.D6,
      NOTE.C6,
      NOTE.B5,
      NOTE.A5,
      NOTE.G5,
      NOTE.Fs5,
      NOTE.E5,
      NOTE.D5,
    ],
    0.25,
    0.14,
  ),

  { beat: 60, duration: 0.5, frequency: NOTE.E5, accent: true },
  { beat: 60.5, duration: 0.5, frequency: NOTE.G5, accent: true },
  { beat: 61, duration: 0.5, frequency: NOTE.B5, accent: true },
  { beat: 61.5, duration: 0.5, frequency: NOTE.E6, accent: true },

  { beat: 62, duration: 0.5, frequency: NOTE.B5 },
  { beat: 62.5, duration: 0.5, frequency: NOTE.G5 },
  { beat: 63, duration: 1, frequency: NOTE.E5, gain: 0.18, accent: true },
];

/**
 * Alternating low and high notes create the horse-gallop accompaniment.
 */
const gallopBass: readonly TimedPitch[] = Array.from(
  { length: 32 },
  (_, measureIndex) => {
    const startBeat = measureIndex * 2;
    const roots = [
      NOTE.E2,
      NOTE.B2,
      NOTE.E2,
      NOTE.B2,
      NOTE.D2,
      NOTE.A2,
      NOTE.B2,
      NOTE.E2,
    ];

    const root = roots[measureIndex % roots.length]!;
    const fifth =
      root === NOTE.E2
        ? NOTE.B2
        : root === NOTE.D2
          ? NOTE.A2
          : root === NOTE.A2
            ? NOTE.E3
            : NOTE.Fs3;

    return [
      {
        beat: startBeat,
        duration: 0.42,
        frequency: root,
        gain: 0.075,
        accent: true,
      },
      {
        beat: startBeat + 0.5,
        duration: 0.2,
        frequency: fifth,
        gain: 0.055,
      },
      {
        beat: startBeat + 1,
        duration: 0.42,
        frequency: root,
        gain: 0.07,
        accent: true,
      },
      {
        beat: startBeat + 1.5,
        duration: 0.2,
        frequency: fifth,
        gain: 0.055,
      },
    ];
  },
).flat();

const brassChords: readonly ChordEvent[] = [
  {
    beat: 0,
    duration: 0.7,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.04,
  },
  {
    beat: 3,
    duration: 0.7,
    frequencies: [NOTE.G4, NOTE.B4, NOTE.E5],
    gain: 0.04,
  },

  {
    beat: 8,
    duration: 0.45,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
  },
  {
    beat: 12,
    duration: 0.45,
    frequencies: [NOTE.B3, NOTE.D4, NOTE.Fs4],
  },
  {
    beat: 16,
    duration: 0.45,
    frequencies: [NOTE.D4, NOTE.Fs4, NOTE.A4],
  },
  {
    beat: 20,
    duration: 0.45,
    frequencies: [NOTE.B3, NOTE.D4, NOTE.Fs4],
  },

  {
    beat: 24,
    duration: 1.5,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.035,
  },
  {
    beat: 28,
    duration: 1.5,
    frequencies: [NOTE.D4, NOTE.Fs4, NOTE.A4],
    gain: 0.035,
  },

  {
    beat: 32,
    duration: 0.5,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
  },
  {
    beat: 34,
    duration: 0.5,
    frequencies: [NOTE.C4, NOTE.E4, NOTE.G4],
  },
  {
    beat: 36,
    duration: 0.5,
    frequencies: [NOTE.B3, NOTE.D4, NOTE.Fs4],
  },
  {
    beat: 38,
    duration: 0.5,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
  },

  {
    beat: 40,
    duration: 0.45,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.045,
  },
  {
    beat: 44,
    duration: 0.45,
    frequencies: [NOTE.B3, NOTE.D4, NOTE.Fs4],
    gain: 0.045,
  },

  {
    beat: 48,
    duration: 0.7,
    frequencies: [NOTE.G4, NOTE.B4, NOTE.E5],
    gain: 0.05,
  },
  {
    beat: 52,
    duration: 0.7,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.05,
  },

  {
    beat: 56,
    duration: 0.5,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.048,
  },
  {
    beat: 58,
    duration: 0.5,
    frequencies: [NOTE.B3, NOTE.D4, NOTE.Fs4],
    gain: 0.048,
  },

  {
    beat: 60,
    duration: 0.45,
    frequencies: [NOTE.E4, NOTE.G4, NOTE.B4],
    gain: 0.055,
  },
  {
    beat: 61,
    duration: 0.45,
    frequencies: [NOTE.G4, NOTE.B4, NOTE.E5],
    gain: 0.055,
  },
  {
    beat: 62,
    duration: 0.45,
    frequencies: [NOTE.B4, NOTE.E5, NOTE.G5],
    gain: 0.06,
  },
  {
    beat: 63,
    duration: 0.9,
    frequencies: [NOTE.E3, NOTE.G3, NOTE.B3, NOTE.E4],
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

function buildGallopNotes(): SynthNote[] {
  return gallopBass.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration,
    gain: event.gain ?? 0.065,
    waveform: "triangle",
    attackSeconds: 0.003,
    releaseSeconds: 0.025,
  }));
}

function buildBrassNotes(): SynthNote[] {
  return brassChords.flatMap((event) =>
    event.frequencies.map((frequency) => ({
      frequencyHz: frequency,
      startBeat: event.beat,
      durationBeats: event.duration,
      gain: event.gain ?? 0.038,
      waveform: "sawtooth" as const,
      attackSeconds: 0.004,
      releaseSeconds: 0.035,
    })),
  );
}

/**
 * Gioachino Rossini:
 * William Tell Overture — Finale
 *
 * Condensed synth arrangement:
 * - Square-wave lead for the bright principal theme
 * - Triangle-wave bass for the galloping accompaniment
 * - Sawtooth brass chords for orchestral accents
 *
 * This adapts the famous finale rather than the complete overture.
 */
export const WILLIAM_TELL_OVERTURE_TRACK: MusicTrack = {
  id: "william-tell-overture",
  title: "William Tell Overture — Finale",
  composer: "Gioachino Rossini",
  tempoBpm: 168,
  lengthBeats: 64,
  loop: true,
  notes: [
    ...buildLeadNotes(),
    ...buildGallopNotes(),
    ...buildBrassNotes(),
  ],
};