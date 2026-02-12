import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  site: 'https://blog.curvelabs.eu',
  integrations: [mdx(), sitemap()],
  output: isDev ? 'static' : 'server',
  adapter: isDev ? undefined : netlify(),
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
    },
  },
  vite: {
    css: {
      preprocessorOptions: {
        css: {
          additionalData: `@import "../packages/design-system/tokens.css";`
        }
      }
    }
  }
});
