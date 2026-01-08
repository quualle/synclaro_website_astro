import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://synclaro.de',
  // SEO: Konsistente URLs ohne trailing slash (vermeidet Duplikate in GSC)
  trailingSlash: 'never',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => !page.includes('/api/'),
    })
  ],
  server: {
    port: 4322
  },
  // Use 'server' mode with prerendering for hybrid behavior
  // API routes use `export const prerender = false` to opt-out of static generation
  output: 'server',
  adapter: netlify(),
  build: {
    assets: 'assets'
  }
});
