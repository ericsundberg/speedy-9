export function formatMenuOptionLabel(
  label: string,
  selected: boolean,
): string {
  const normalizedLabel = label.trim();

  return selected
    ? `> ${normalizedLabel} <`
    : normalizedLabel;
}
