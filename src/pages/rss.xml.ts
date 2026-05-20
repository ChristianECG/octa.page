import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

const ALL_TYPES = ['architecture', 'runtime', 'pulse', 'systems', 'notes'] as const;

export async function GET(context: APIContext) {
  const allEntries = (await Promise.all(
    ALL_TYPES.map(async t => {
      const entries = await getCollection(t, ({ data }) => data.status === 'published');
      return entries.map(e => ({ entry: e, type: t as string }));
    })
  )).flat().sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());

  return rss({
    title: 'Octa',
    description: 'Systems notes & runtime investigations. Engineering lab documenting architecture decisions, runtime research, and performance investigations.',
    site: context.site!,
    items: allEntries.map(({ entry, type }) => ({
      title:       entry.data.title,
      pubDate:     entry.data.date,
      link:        `/doc/${entry.id}/`,
      categories:  [...new Set([type, ...(entry.data.tags ?? [])])],
    })),
    customData: `<language>en-us</language>`,
  });
}
