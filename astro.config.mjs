// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://egregore.xyz',
  integrations: [
    react(),
    starlight({
      title: 'Egregore Docs',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: true,
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Curve-Labs/egregore-core' },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'What is Egregore?', slug: 'getting-started' },
            { label: 'Setup', slug: 'getting-started/setup' },
          ],
        },
        {
          label: 'Commands',
          items: [
            { label: 'Command Reference', slug: 'commands' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Core Concepts', slug: 'concepts' },
          ],
        },
        { label: 'FAQ', slug: 'faq' },
      ],
      customCss: ['./src/styles/docs.css'],
    }),
    mdx(),
  ],
});