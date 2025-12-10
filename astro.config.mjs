import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
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
