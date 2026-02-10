import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const sortedPosts = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Egregore Blog',
    description: 'Thoughts on shared cognition, context gardening, and building with AI',
    site: context.site,
    items: sortedPosts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
    })),
  });
}
