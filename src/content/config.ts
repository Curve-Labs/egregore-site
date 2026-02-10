import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

const docs = defineCollection({ schema: docsSchema() });

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    category: z.enum(['product', 'philosophy', 'guide', 'research']),
    featured: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { docs, posts };
