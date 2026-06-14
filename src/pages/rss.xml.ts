import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { marked } from 'marked';
import type { APIContext } from 'astro';
import { NAV_TYPES } from '../lib/types';

function firstParagraph(body: string): string {
  for (const chunk of body.split(/\n\n+/)) {
    const t = chunk.trim();
    if (t && !t.startsWith('#') && !t.startsWith('```') && !t.startsWith('|')) {
      return t
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .slice(0, 280);
    }
  }
  return '';
}

export async function GET(context: APIContext) {
  const allEntries = (await Promise.all(
    NAV_TYPES.map(async t => {
      const entries = await getCollection(t, ({ data }) => data.status === 'published');
      return entries.map(e => ({ entry: e, type: t as string }));
    })
  )).flat().sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());

  const feedUrl = new URL('/rss.xml', context.site!).toString();

  return rss({
    title: 'Octa',
    description: 'Systems notes & runtime investigations. Engineering lab documenting architecture decisions, runtime research, and performance investigations.',
    site: context.site!,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      `<language>en-us</language>`,
      `<managingEditor>contacto@christianecg.com (Christian Elías)</managingEditor>`,
      `<atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
    ].join('\n'),
    items: allEntries.map(({ entry, type }) => ({
      title:       entry.data.title,
      pubDate:     entry.data.date,
      link:        `/doc/${entry.id}/`,
      categories:  [...new Set([type, ...(entry.data.tags ?? [])])],
      description: entry.data.description ?? firstParagraph(entry.body ?? ''),
      content:     marked.parse(entry.body ?? '') as string,
    })),
  });
}
