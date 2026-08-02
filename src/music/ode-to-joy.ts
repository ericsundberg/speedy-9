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

/**
 * Equal-temperament frequencies used by this arrangement.
 *
 * The melody is placed primarily in octave 4, with triangle-wave bass
 * underneath it. Frequencies are expressed directly in hertz so the track
 * remains readable by a generic Web Audio sequencer.
 */
const FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,

  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
} as const;

interface MelodyEvent {
  readonly frequencyHz: number;
  readonly durationBeats: number;
}

interface BassEvent {
  readonly frequencyHz: number;
  readonly startBeat: number;
  readonly durationBeats: number;
}

const melody: readonly MelodyEvent[] = [
  // Phrase A
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.E4, durationBeats: 1.5 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 2 },

  // Phrase A, varied ending
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.D4, durationBeats: 1.5 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 2 },

  // Phrase B
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.G3, durationBeats: 2 },

  // Final phrase
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.G4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.F4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.D4, durationBeats: 1 },
  { frequencyHz: FREQUENCIES.E4, durationBeats: 1 },

  { frequencyHz: FREQUENCIES.D4, durationBeats: 1.5 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 0.5 },
  { frequencyHz: FREQUENCIES.C4, durationBeats: 2 },
];

/**
 * One sustained bass note per measure.
 *
 * The harmony is intentionally simple so the arrangement remains clear,
 * inexpensive to synthesize, and compatible with the vector-arcade style.
 */
const bass: readonly BassEvent[] = [
  { frequencyHz: FREQUENCIES.C3, startBeat: 0, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 4, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 8, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 12, durationBeats: 4 },

  { frequencyHz: FREQUENCIES.C3, startBeat: 16, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 20, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 24, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 28, durationBeats: 4 },

  { frequencyHz: FREQUENCIES.G3, startBeat: 32, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 36, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 40, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 44, durationBeats: 4 },

  { frequencyHz: FREQUENCIES.C3, startBeat: 48, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.G3, startBeat: 52, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 56, durationBeats: 4 },
  { frequencyHz: FREQUENCIES.C3, startBeat: 60, durationBeats: 4 },
];

function buildMelodyNotes(): SynthNote[] {
  const notes: SynthNote[] = [];
  let startBeat = 0;

  for (const event of melody) {
    notes.push({
      frequencyHz: event.frequencyHz,
      startBeat,
      durationBeats: event.durationBeats * 0.9,
      gain: 0.12,
      waveform: 'square',
      attackSeconds: 0.008,
      releaseSeconds: 0.035,
    });

    startBeat += event.durationBeats;
  }

  return notes;
}

function buildBassNotes(): SynthNote[] {
  return bass.map((event) => ({
    frequencyHz: event.frequencyHz,
    startBeat: event.startBeat,
    durationBeats: event.durationBeats * 0.94,
    gain: 0.055,
    waveform: 'triangle',
    attackSeconds: 0.025,
    releaseSeconds: 0.08,
  }));
}

/**
 * Public-domain melody by Ludwig van Beethoven.
 *
 * This arrangement contains:
 * - A square-wave lead
 * - A quiet triangle-wave bass
 * - A complete 64-beat loop
 */
export const ODE_TO_JOY_TRACK: MusicTrack = {
  id: 'ode-to-joy',
  title: 'Ode to Joy',
  composer: 'Ludwig van Beethoven',
  tempoBpm: 152,
  lengthBeats: 64,
  loop: true,
  notes: [...buildMelodyNotes(), ...buildBassNotes()],
};