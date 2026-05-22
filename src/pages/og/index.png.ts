import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { generateOG } from '../../lib/og';
import { ALL_TYPES } from '../../lib/types';

export const GET: APIRoute = async () => {
  const allEntries = (await Promise.all(
    ALL_TYPES.map(t => getCollection(t, ({ data }) => data.status === 'published'))
  )).flat();

  const count = allEntries.length;
  const png = await generateOG({
    title: 'Systems notes & runtime investigations.',
    subtitle: 'Engineering lab documenting architecture decisions, runtime research, and performance investigations.',
    meta: `${count} ${count === 1 ? 'entry' : 'entries'} indexed`,
  });

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
