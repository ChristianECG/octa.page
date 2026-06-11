import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { generateOG } from '../../../lib/og';
import { NAV_TYPES } from '../../../lib/types';

const TYPES = NAV_TYPES;

const descriptions: Record<string, string> = {
  architecture: 'System design decisions, tradeoffs, and architectural reasoning.',
  runtime:      'Browser and runtime behavior research and investigation.',
  systems:      'Long-form systems essays and infrastructure reasoning.',
  notes:        'Short-form technical notes and observations.',
  timezone:     'Deep dives into timezone systems, IANA tzdb, and propagation.',
};

export const getStaticPaths: GetStaticPaths = async () => {
  return TYPES.map(type => ({ params: { type } }));
};

export const GET: APIRoute = async ({ params }) => {
  const type  = params.type as string;
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const count = (await getCollection(type as any, ({ data }) => data.status === 'published')).length;

  const png = await generateOG({
    title:    label,
    subtitle: descriptions[type] ?? '',
    meta:     `${count} ${count === 1 ? 'entry' : 'entries'}`,
  });

  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
