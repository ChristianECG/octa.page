// Content visibility filter: drafts render in `pnpm dev` (with DRAFT badges),
// but are always excluded from production builds.
export function isVisible({ data }: { data: { status: string } }): boolean {
  return data.status === 'published' || import.meta.env.DEV;
}

export function readingMinutes(body?: string): number | undefined {
  if (!body) return undefined;
  const text = body.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export function readingLabel(body?: string): string {
  const m = readingMinutes(body);
  return m !== undefined ? `${m}m` : '—';
}
