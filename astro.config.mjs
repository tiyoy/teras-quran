import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { swManifestIntegration } from './scripts/sw-manifest-integration.mjs';

export default defineConfig({
  site: 'https://terasquran.web.app',
  output: 'static',
  integrations: [preact({ compat: false }), swManifestIntegration()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      },
    },
  },
});
