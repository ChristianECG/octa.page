import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articleSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  series: z.string().optional(),
  project: z.string().optional(),
  pinned: z.boolean().default(false),
  status: z.enum(['published', 'draft']).default('draft'),
});

const makeCollection = (base: string) =>
  defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base }),
    schema: articleSchema,
  });

export const collections = {
  architecture: makeCollection('./content/architecture'),
  runtime: makeCollection('./content/runtime'),
  systems: makeCollection('./content/systems'),
  notes: makeCollection('./content/notes'),
  timezone: makeCollection('./content/timezone'),
};
