import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { ALL_TYPES } from '../../lib/types';

export async function getStaticPaths() {
  const types = ALL_TYPES;
  const paths = await Promise.all(
    types.map(async type => {
      const entries = await getCollection(type, ({ data }) => data.status === 'published');
      return entries.map(entry => ({
        params: { slug: entry.id },
        props:  { entry, type },
      }));
    })
  );
  return paths.flat();
}

export const GET: APIRoute = ({ props }) => {
  const { entry, type } = props as { entry: any; type: string };
  const d = entry.data;

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(d.title)}`,
    `date: ${d.date.toISOString().split('T')[0]}`,
    `type: ${type}`,
    ...(d.description ? [`description: ${JSON.stringify(d.description)}`] : []),
    ...(d.tags?.length ? [`tags: [${d.tags.join(', ')}]`] : []),
    ...(d.project ? [`project: ${d.project}`] : []),
    ...(d.series ? [`series: ${d.series}`] : []),
    `canonical: https://octa.page/doc/${entry.id}/`,
    '---',
  ].join('\n');

  return new Response(`${frontmatter}\n\n${entry.body ?? ''}`, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
