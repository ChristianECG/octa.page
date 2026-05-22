export function readingMinutes(body?: string): number | undefined {
  if (!body) return undefined;
  return Math.max(1, Math.round(body.split(/\s+/).length / 200));
}

export function readingLabel(body?: string): string {
  const m = readingMinutes(body);
  return m !== undefined ? `${m}m` : '—';
}
