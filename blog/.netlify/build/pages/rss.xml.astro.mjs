import rss from '@astrojs/rss';
import { g as getCollection } from '../chunks/_astro_content_CiI689C0.mjs';
export { renderers } from '../renderers.mjs';

async function GET(context) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return rss({
    title: "Curve Labs Blog",
    description: "Research notes, project updates, and dispatches from Curve Labs.",
    site: context.site,
    items: posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()).map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.subtitle,
      author: post.data.author,
      link: `/${post.slug}/`,
      categories: [post.data.category, ...post.data.tags]
    })),
    customData: `<language>en-us</language>`
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
