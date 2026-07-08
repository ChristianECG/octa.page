import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { ALL_TYPES } from '../lib/types';

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');

  const allTyped = (await Promise.all(
    ALL_TYPES.map(async t => {
      const entries = await getCollection(t, ({ data }) => data.status === 'published');
      return entries.map(e => ({ entry: e, type: t as string }));
    })
  )).flat().sort((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());

  const byType = ALL_TYPES.map(type => {
    const items = allTyped.filter(x => x.type === type);
    if (!items.length) return '';
    const lines = items.map(({ entry }) => {
      const desc = entry.data.description ? `: ${entry.data.description}` : '';
      return `- [${entry.data.title}](${site}/doc/${entry.id}.md)${desc}`;
    });
    return `## ${type[0].toUpperCase()}${type.slice(1)}\n\n${lines.join('\n')}`;
  }).filter(Boolean);

  const body = [
    '# Octa',
    '',
    '> Systems notes & runtime investigations. Engineering lab documenting architecture decisions, runtime research, and performance investigations. By Christian Elías.',
    '',
    'Each article is available as raw Markdown at `/doc/{slug}.md` (linked below) and as HTML at `/doc/{slug}/`.',
    '',
    byType.join('\n\n'),
    '',
    '## Optional',
    '',
    `- [RSS feed](${site}/rss.xml)`,
    `- [Search index (JSON)](${site}/search.json)`,
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
