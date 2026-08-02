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
  Bb2: 116.54,

  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,

  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
} as const;

interface TimedPitch {
  readonly beat: number;
  readonly duration: number;
  readonly frequency: number;
  readonly gain?: number;
}

interface ChordEvent {
  readonly beat: number;
  readonly duration: number;
  readonly frequencies: readonly number[];
  readonly gain?: number;
}

/**
 * A compact adaptation of the principal bass-register melody.
 *
 * The original piano piece frequently places the tune in the lower voice
 * while short chords answer above it. This arrangement preserves that
 * call-and-response character with separate melody and chord voices.
 */
const melody: readonly TimedPitch[] = [
  // Pickup and opening phrase
  { beat: 0, duration: 0.5, frequency: NOTE.C3 },

  { beat: 0.5, duration: 1, frequency: NOTE.F3 },
  { beat: 1.5, duration: 1, frequency: NOTE.A3 },
  { beat: 2.5, duration: 0.5, frequency: NOTE.C4 },
  { beat: 3, duration: 0.5, frequency: NOTE.D4 },
  { beat: 3.5, duration: 0.5, frequency: NOTE.C4 },

  { beat: 4, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 4.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 5, duration: 1, frequency: NOTE.G3 },
  { beat: 6, duration: 0.5, frequency: NOTE.F3 },
  { beat: 6.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 7, duration: 1, frequency: NOTE.F3 },

  // Repeated opening phrase
  { beat: 8, duration: 0.5, frequency: NOTE.C3 },
  { beat: 8.5, duration: 1, frequency: NOTE.F3 },
  { beat: 9.5, duration: 1, frequency: NOTE.A3 },
  { beat: 10.5, duration: 0.5, frequency: NOTE.C4 },
  { beat: 11, duration: 0.5, frequency: NOTE.D4 },
  { beat: 11.5, duration: 0.5, frequency: NOTE.C4 },

  { beat: 12, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 12.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 13, duration: 1, frequency: NOTE.G3 },
  { beat: 14, duration: 0.5, frequency: NOTE.F3 },
  { beat: 14.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 15, duration: 1, frequency: NOTE.F3 },

  // More lyrical middle phrase
  { beat: 16, duration: 1.5, frequency: NOTE.C4 },
  { beat: 17.5, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 18, duration: 1, frequency: NOTE.A3 },
  { beat: 19, duration: 1, frequency: NOTE.G3 },

  { beat: 20, duration: 0.5, frequency: NOTE.A3 },
  { beat: 20.5, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 21, duration: 1, frequency: NOTE.C4 },
  { beat: 22, duration: 0.5, frequency: NOTE.A3 },
  { beat: 22.5, duration: 0.5, frequency: NOTE.F3 },
  { beat: 23, duration: 1, frequency: NOTE.C3 },

  { beat: 24, duration: 1.5, frequency: NOTE.D3 },
  { beat: 25.5, duration: 0.5, frequency: NOTE.F3 },
  { beat: 26, duration: 1, frequency: NOTE.A3 },
  { beat: 27, duration: 1, frequency: NOTE.D4 },

  { beat: 28, duration: 0.5, frequency: NOTE.C4 },
  { beat: 28.5, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 29, duration: 1, frequency: NOTE.A3 },
  { beat: 30, duration: 0.5, frequency: NOTE.G3 },
  { beat: 30.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 31, duration: 1, frequency: NOTE.C3 },

  // Bright return
  { beat: 32, duration: 0.5, frequency: NOTE.C3 },
  { beat: 32.5, duration: 1, frequency: NOTE.F3 },
  { beat: 33.5, duration: 1, frequency: NOTE.A3 },
  { beat: 34.5, duration: 0.5, frequency: NOTE.C4 },
  { beat: 35, duration: 0.5, frequency: NOTE.D4 },
  { beat: 35.5, duration: 0.5, frequency: NOTE.C4 },

  { beat: 36, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 36.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 37, duration: 1, frequency: NOTE.G3 },
  { beat: 38, duration: 0.5, frequency: NOTE.F3 },
  { beat: 38.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 39, duration: 1, frequency: NOTE.F3 },

  // Rising answer
  { beat: 40, duration: 0.5, frequency: NOTE.F3 },
  { beat: 40.5, duration: 0.5, frequency: NOTE.G3 },
  { beat: 41, duration: 0.5, frequency: NOTE.A3 },
  { beat: 41.5, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 42, duration: 0.5, frequency: NOTE.C4 },
  { beat: 42.5, duration: 0.5, frequency: NOTE.D4 },
  { beat: 43, duration: 1, frequency: NOTE.C4 },

  { beat: 44, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 44.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 45, duration: 0.5, frequency: NOTE.G3 },
  { beat: 45.5, duration: 0.5, frequency: NOTE.F3 },
  { beat: 46, duration: 1, frequency: NOTE.E3 },
  { beat: 47, duration: 1, frequency: NOTE.C3 },

  // Final statement
  { beat: 48, duration: 0.5, frequency: NOTE.C3 },
  { beat: 48.5, duration: 1, frequency: NOTE.F3 },
  { beat: 49.5, duration: 1, frequency: NOTE.A3 },
  { beat: 50.5, duration: 0.5, frequency: NOTE.C4 },
  { beat: 51, duration: 0.5, frequency: NOTE.D4 },
  { beat: 51.5, duration: 0.5, frequency: NOTE.C4 },

  { beat: 52, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 52.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 53, duration: 1, frequency: NOTE.G3 },
  { beat: 54, duration: 0.5, frequency: NOTE.F3 },
  { beat: 54.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 55, duration: 1, frequency: NOTE.F3 },

  { beat: 56, duration: 0.5, frequency: NOTE.A3 },
  { beat: 56.5, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 57, duration: 1, frequency: NOTE.C4 },
  { beat: 58, duration: 0.5, frequency: NOTE.A3 },
  { beat: 58.5, duration: 0.5, frequency: NOTE.F3 },
  { beat: 59, duration: 1, frequency: NOTE.C3 },

  { beat: 60, duration: 0.5, frequency: NOTE.G3 },
  { beat: 60.5, duration: 0.5, frequency: NOTE.A3 },
  { beat: 61, duration: 0.5, frequency: NOTE.Bb3 },
  { beat: 61.5, duration: 0.5, frequency: NOTE.C4 },
  { beat: 62, duration: 0.5, frequency: NOTE.G3 },
  { beat: 62.5, duration: 0.5, frequency: NOTE.E3 },
  { beat: 63, duration: 1, frequency: NOTE.F3 },
];

/**
 * Short upper-register chord responses.
 *
 * Chords are deliberately detached and slightly quieter than the melody,
 * reflecting the crisp accompaniment pattern of the piano original.
 */
const chords: readonly ChordEvent[] = [
  // Opening
  { beat: 0.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 1.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 2.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.Bb4, NOTE.D5] },
  { beat: 3.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 4.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 5.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 6.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 7.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },

  // Repeat
  { beat: 8.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 9.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 10.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.Bb4, NOTE.D5] },
  { beat: 11.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 12.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 13.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 14.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 15.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },

  // Middle
  { beat: 16, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4] },
  { beat: 18, duration: 0.65, frequencies: [NOTE.E4, NOTE.G4, NOTE.Bb4] },
  { beat: 20, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 22, duration: 0.65, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 24, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4, NOTE.D5] },
  { beat: 26, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4, NOTE.D5] },
  { beat: 28, duration: 0.65, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 30, duration: 0.65, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  // Return
  { beat: 32.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 33.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 34.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.Bb4, NOTE.D5] },
  { beat: 35.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 36.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 37.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 38.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 39.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },

  // Rising answer
  { beat: 40, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 41, duration: 0.42, frequencies: [NOTE.G4, NOTE.Bb4, NOTE.D5] },
  { beat: 42, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 43, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 44, duration: 0.42, frequencies: [NOTE.F4, NOTE.Bb4, NOTE.D5] },
  { beat: 45, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 46, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 47, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  // Final phrase
  { beat: 48.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 49.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 50.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.Bb4, NOTE.D5] },
  { beat: 51.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  { beat: 52.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 53.5, duration: 0.42, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },
  { beat: 54.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 55.5, duration: 0.42, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },

  { beat: 56, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 58, duration: 0.65, frequencies: [NOTE.F4, NOTE.A4, NOTE.C5] },
  { beat: 60, duration: 0.65, frequencies: [NOTE.E4, NOTE.G4, NOTE.C5] },

  {
    beat: 63,
    duration: 0.9,
    frequencies: [NOTE.F3, NOTE.A3, NOTE.C4, NOTE.F4],
    gain: 0.075,
  },
];

const bassPulseRoots: readonly number[] = [
  NOTE.F2,
  NOTE.F2,
  NOTE.C2,
  NOTE.C2,
  NOTE.F2,
  NOTE.F2,
  NOTE.C2,
  NOTE.C2,

  NOTE.F2,
  NOTE.C2,
  NOTE.F2,
  NOTE.C2,
  NOTE.D2,
  NOTE.D2,
  NOTE.C2,
  NOTE.C2,
];

function buildMelodyNotes(): SynthNote[] {
  return melody.map((event) => ({
    frequencyHz: event.frequency,
    startBeat: event.beat,
    durationBeats: event.duration * 0.94,
    gain: event.gain ?? 0.12,
    waveform: "triangle",
    attackSeconds: 0.008,
    releaseSeconds: 0.045,
  }));
}

function buildChordNotes(): SynthNote[] {
  return chords.flatMap((event) =>
    event.frequencies.map((frequency) => ({
      frequencyHz: frequency,
      startBeat: event.beat,
      durationBeats: event.duration,
      gain: event.gain ?? 0.035,
      waveform: "square" as const,
      attackSeconds: 0.004,
      releaseSeconds: 0.025,
    })),
  );
}

function buildBassPulseNotes(): SynthNote[] {
  return bassPulseRoots.flatMap((root, measureIndex) => {
    const measureStart = measureIndex * 4;

    return [0, 2].map((offset) => ({
      frequencyHz: root,
      startBeat: measureStart + offset,
      durationBeats: 0.38,
      gain: 0.045,
      waveform: "triangle" as const,
      attackSeconds: 0.006,
      releaseSeconds: 0.035,
    }));
  });
}

/**
 * Robert Schumann:
 * Album für die Jugend, Op. 68, No. 10
 * "Fröhlicher Landmann, von der Arbeit zurückkehrend"
 *
 * Synth arrangement:
 * - Triangle-wave lower melody
 * - Short square-wave chord responses
 * - Light bass pulses
 */
export const HAPPY_FARMER_TRACK: MusicTrack = {
  id: "happy-farmer",
  title: "The Happy Farmer",
  composer: "Robert Schumann",
  tempoBpm: 112,
  lengthBeats: 64,
  loop: true,
  notes: [
    ...buildMelodyNotes(),
    ...buildChordNotes(),
    ...buildBassPulseNotes(),
  ],
};