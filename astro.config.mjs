// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://octa.page',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/page/1/'),
    }),
  ],
  server: {
    port: 4325,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['octa.test'],
    },
  },
});
