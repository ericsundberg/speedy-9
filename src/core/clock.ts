export interface Clock {
  nowMs(): number;
}

export class PerformanceClock implements Clock {
  public nowMs(): number {
    return performance.now();
  }
}

export function calculateElapsedMs(
  startedAtMs: number,
  effectiveNowMs: number,
  penaltyMs = 0,
): number {
  if (!Number.isFinite(startedAtMs)) {
    throw new RangeError('startedAtMs must be finite.');
  }

  if (!Number.isFinite(effectiveNowMs)) {
    throw new RangeError('effectiveNowMs must be finite.');
  }

  if (!Number.isFinite(penaltyMs) || penaltyMs < 0) {
    throw new RangeError('penaltyMs must be finite and non-negative.');
  }

  const wallClockElapsedMs = Math.max(
    0,
    effectiveNowMs - startedAtMs,
  );

  return wallClockElapsedMs + penaltyMs;
}
