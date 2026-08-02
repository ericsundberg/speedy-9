import { describe, expect, it } from 'vitest';
import {
  formatDeltaMs,
  formatDurationMs,
} from './time-format';

describe('time formatting', () => {
  it('formats an empty timer', () => {
    expect(formatDurationMs(0)).toBe('0:00.000');
  });

  it('formats minute-based durations', () => {
    expect(formatDurationMs(62_345)).toBe('1:02.345');
  });

  it('formats hour-based durations', () => {
    expect(formatDurationMs(3_723_004)).toBe('1:02:03.004');
  });

  it('safely normalizes invalid durations', () => {
    expect(formatDurationMs(-1)).toBe('0:00.000');
    expect(formatDurationMs(Number.NaN)).toBe('0:00.000');
  });

  it('formats favorable and unfavorable deltas', () => {
    expect(formatDeltaMs(-4_700)).toBe('−4.7');
    expect(formatDeltaMs(532)).toBe('+0.5');
    expect(formatDeltaMs(0)).toBe('0.0');
  });

  it('uses a neutral placeholder for invalid deltas', () => {
    expect(formatDeltaMs(Number.NaN)).toBe('—');
  });
});
