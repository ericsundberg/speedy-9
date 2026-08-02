const MILLISECONDS_PER_SECOND = 1_000;
const MILLISECONDS_PER_MINUTE = 60_000;
const MILLISECONDS_PER_HOUR = 3_600_000;

function normalizeDurationMs(milliseconds: number): number {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return 0;
  }

  return Math.floor(milliseconds);
}

function pad(
  value: number,
  length: number,
): string {
  return value.toString().padStart(length, '0');
}

export function formatDurationMs(milliseconds: number): string {
  const totalMilliseconds = normalizeDurationMs(milliseconds);

  const hours = Math.floor(
    totalMilliseconds / MILLISECONDS_PER_HOUR,
  );

  const minutes = Math.floor(
    totalMilliseconds % MILLISECONDS_PER_HOUR
    / MILLISECONDS_PER_MINUTE,
  );

  const seconds = Math.floor(
    totalMilliseconds % MILLISECONDS_PER_MINUTE
    / MILLISECONDS_PER_SECOND,
  );

  const centiseconds = Math.floor(
    totalMilliseconds % MILLISECONDS_PER_SECOND / 10,
  );

  if (hours > 0) {
    return (
      `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`
      + `.${pad(centiseconds, 2)}`
    );
  }

  const totalMinutes = Math.floor(
    totalMilliseconds / MILLISECONDS_PER_MINUTE,
  );

  return (
    `${totalMinutes}:${pad(seconds, 2)}`
    + `.${pad(centiseconds, 2)}`
  );
}

export function formatDeltaMs(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) {
    return '—';
  }

  const absoluteSeconds = Math.abs(milliseconds) / 1_000;

  if (absoluteSeconds < 0.05) {
    return '0.0';
  }

  const sign = milliseconds < 0 ? '−' : '+';

  return `${sign}${absoluteSeconds.toFixed(1)}`;
}
