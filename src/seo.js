import { POSTS } from './posts.js';

const SITE_URL = 'https://egregore.xyz';

const STATIC_PAGES = {
  '/': {
    title: 'Egregore — Shared Cognition for Teams and Agents',
    description: 'A terminal-native platform where humans and AI agents share persistent context and work together as a single organizational mind.',
    ogImage: `${SITE_URL}/og/default.png`,
  },
  '/research': {
    title: 'Research — Egregore',
    description: 'Dispatches on shared cognition, coordination infrastructure, and what emerges when organizations develop memory.',
    ogImage: `${SITE_URL}/og/default.png`,
  },
  '/docs': {
    title: 'Documentation — Egregore',
    description: 'Architecture, setup, and usage documentation for Egregore — the shared intelligence layer for organizations using Claude Code.',
    ogImage: `${SITE_URL}/og/default.png`,
  },
};

const ARTICLE_PAGES = {};
for (const post of POSTS) {
  ARTICLE_PAGES[`/research/${post.slug}`] = {
    title: `${post.title} — Egregore`,
    description: post.excerpt,
    ogImage: `${SITE_URL}/og/${post.slug}.png`,
  };
}

const ALL_PAGES = { ...STATIC_PAGES, ...ARTICLE_PAGES };

export function getPageMeta(pathname) {
  const meta = ALL_PAGES[pathname];
  if (meta) {
    return {
      ...meta,
      canonicalUrl: `${SITE_URL}${pathname === '/' ? '' : pathname}`,
    };
  }
  return {
    ...STATIC_PAGES['/'],
    canonicalUrl: `${SITE_URL}${pathname}`,
  };
}
