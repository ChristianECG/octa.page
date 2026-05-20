import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { generateOG } from '../../../lib/og';

const ALL_TYPES = ['architecture', 'runtime', 'pulse', 'systems', 'notes', 'investigations'] as const;

export const getStaticPaths: GetStaticPaths = async () => {
  const allEntries = (await Promise.all(
    ALL_TYPES.map(t => getCollection(t, ({ data }) => data.status === 'published'))
  )).flat();

  const projects = [...new Set(allEntries.map(e => e.data.project).filter(Boolean))] as string[];
  return projects.map(project => ({ params: { project } }));
};

export const GET: APIRoute = async ({ params, props }) => {
  const project = params.project as string;

  const allEntries = (await Promise.all(
    ALL_TYPES.map(t => getCollection(t, ({ data }) => data.status === 'published' && data.project === project))
  )).flat();

  const count = allEntries.length;

  const png = await generateOG({
    label: 'project',
    title: project.charAt(0).toUpperCase() + project.slice(1),
    meta:  `${count} ${count === 1 ? 'entry' : 'entries'}`,
  });

  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
