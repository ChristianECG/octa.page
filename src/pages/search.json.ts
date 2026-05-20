import { getCollection } from 'astro:content';

export async function GET() {
  const types = ['architecture', 'runtime', 'pulse', 'systems', 'notes', 'investigations'] as const;

  const allTyped = (await Promise.all(
    types.map(async t => {
      const entries = await getCollection(t, ({ data }) => data.status === 'published');
      return entries.map(e => ({ entry: e, type: t as string }));
    })
  )).flat().sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());

  const index = allTyped.map(({ entry, type }, i) => ({
    n: i + 1,
    slug:    entry.id,
    title:   entry.data.title,
    type,
    tags:    entry.data.tags,
    project: entry.data.project ?? null,
    date:    entry.data.date.toISOString().split('T')[0],
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
