import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { generateOG } from '../../../lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const types = ['architecture', 'runtime', 'pulse', 'systems', 'notes', 'investigations'] as const;
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
};

export const GET: APIRoute = async ({ props }) => {
  const { entry, type } = props as any;

  const body: string | undefined = entry.body;
  const readTime = body ? Math.max(1, Math.round(body.split(/\s+/).length / 200)) : undefined;

  const label = entry.data.project ? `${type} · ${entry.data.project}` : type;
  const date  = entry.data.date.toISOString().split('T')[0];
  const metaParts = [date, readTime ? `${readTime} min read` : null].filter(Boolean);

  const png = await generateOG({
    title: entry.data.title,
    label,
    meta:  metaParts.join('  ·  '),
  });

  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
