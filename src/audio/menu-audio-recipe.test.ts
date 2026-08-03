import {
  describe,
  expect,
  it,
} from "vitest";
import {
  RUN_COMPLETE_MUSIC_LOOP_SECONDS,
  RUN_COMPLETE_MUSIC_NOTES,
  STAGE_SELECT_MUSIC_LOOP_SECONDS,
  STAGE_SELECT_MUSIC_NOTES,
  TITLE_BOOT_STING,
} from "./menu-audio";

describe("title boot sound recipe", () => {
  it("defines a looping Run Complete victory score", () => {
    expect(RUN_COMPLETE_MUSIC_LOOP_SECONDS).toBeCloseTo(
      5.76,
    );

    expect(
      RUN_COMPLETE_MUSIC_NOTES.length,
    ).toBeGreaterThanOrEqual(40);

    const finalNoteEnd = Math.max(
      ...RUN_COMPLETE_MUSIC_NOTES.map(
        (note) =>
          note.startSeconds
          + note.durationSeconds,
      ),
    );

    expect(finalNoteEnd).toBeLessThanOrEqual(
      RUN_COMPLETE_MUSIC_LOOP_SECONDS,
    );
  });

  it("uses quiet valid values for Run Complete music", () => {
    for (const note of RUN_COMPLETE_MUSIC_NOTES) {
      expect(note.frequencyHz).toBeGreaterThan(0);
      expect(note.startSeconds).toBeGreaterThanOrEqual(0);
      expect(note.durationSeconds).toBeGreaterThan(0);
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(0.03);
      expect([
        "sine",
        "square",
        "triangle",
      ]).toContain(note.waveform);
    }
  });

  it("defines a complete looping Stage Select score", () => {
    expect(STAGE_SELECT_MUSIC_LOOP_SECONDS).toBeCloseTo(
      4.8,
    );

    expect(
      STAGE_SELECT_MUSIC_NOTES.length,
    ).toBeGreaterThanOrEqual(30);

    const finalNoteEnd = Math.max(
      ...STAGE_SELECT_MUSIC_NOTES.map(
        (note) =>
          note.startSeconds
          + note.durationSeconds,
      ),
    );

    expect(finalNoteEnd).toBeLessThanOrEqual(
      STAGE_SELECT_MUSIC_LOOP_SECONDS,
    );
  });

  it("uses quiet valid values for Stage Select music", () => {
    for (const note of STAGE_SELECT_MUSIC_NOTES) {
      expect(note.frequencyHz).toBeGreaterThan(0);
      expect(note.startSeconds).toBeGreaterThanOrEqual(0);
      expect(note.durationSeconds).toBeGreaterThan(0);
      expect(note.gain).toBeGreaterThan(0);
      expect(note.gain).toBeLessThanOrEqual(0.03);
      expect([
        "square",
        "triangle",
      ]).toContain(note.waveform);
    }
  });

  it("builds a short rising five-voice startup sting", () => {
    expect(TITLE_BOOT_STING).toHaveLength(5);

    const audibleEndSeconds = Math.max(
      ...TITLE_BOOT_STING.map(
        (step) =>
          (step.delaySeconds ?? 0)
          + step.durationSeconds,
      ),
    );

    expect(audibleEndSeconds).toBeLessThanOrEqual(0.6);

    expect(
      TITLE_BOOT_STING[0]?.frequencyHz,
    ).toBeLessThan(
      TITLE_BOOT_STING.at(-1)?.endFrequencyHz ?? 0,
    );
  });

  it("uses valid oscillator and gain values", () => {
    for (const step of TITLE_BOOT_STING) {
      expect(step.frequencyHz).toBeGreaterThan(0);
      expect(step.endFrequencyHz).toBeGreaterThan(0);
      expect(step.durationSeconds).toBeGreaterThan(0);
      expect(step.gain).toBeGreaterThan(0);
      expect(step.gain).toBeLessThanOrEqual(0.1);
      expect(step.delaySeconds ?? 0).toBeGreaterThanOrEqual(0);
    }
  });
});
