export function readingMinutes(body?: string): number | undefined {
  if (!body) return undefined;
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export function readingLabel(body?: string): string {
  const m = readingMinutes(body);
  return m !== undefined ? `${m}m` : '—';
}
