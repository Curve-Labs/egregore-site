# SEO Setup - Pending Oz Review

**Status:** ⚠️ Needs review by Oz before production deployment

## What Was Implemented

### 1. Meta Tags
- ✅ Title, description, keywords for all pages
- ✅ Author meta tags for articles
- ✅ Robots meta tags (index, follow)
- ✅ Theme color for mobile browsers

### 2. Open Graph Tags (Social Sharing)
- ✅ `og:type` (article/website)
- ✅ `og:site_name` - "Curve Labs Blog"
- ✅ `og:image` with alt text
- ✅ `og:locale` - en_US
- ✅ `article:published_time` for blog posts
- ✅ `article:author` for blog posts

### 3. Twitter Card Tags
- ✅ `twitter:card` - summary_large_image
- ✅ `twitter:site` - @curvelabs
- ✅ `twitter:creator` - @curvelabs
- ✅ Image and alt text support

### 4. Structured Data (JSON-LD)
- ✅ Article schema for each blog post
- ✅ Includes headline, description, author, publisher, dates
- ✅ Helps Google understand content for rich snippets

### 5. Sitemap
- ✅ Auto-generates at `/sitemap-index.xml`

### 6. robots.txt
- ✅ Created at `/public/robots.txt`
- ✅ Allows all search engines
- ✅ Links to sitemap

### 7. Keywords
- ✅ Homepage: knowledge graphs, AI agents, multi-agent systems, distributed systems, cybernetics, protocol design, governance, coordination
- ✅ Articles: Dynamic keywords based on article tags

## Review Checklist for Oz

### Before Production:
- [ ] Verify all meta descriptions are accurate and compelling
- [ ] Check keywords match Curve Labs branding/positioning
- [ ] Confirm Twitter handle `@curvelabs` is correct
- [ ] Test Open Graph previews on:
  - [ ] Twitter/X
  - [ ] LinkedIn
  - [ ] Slack
- [ ] Validate structured data using [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Review sitemap at `/sitemap-index.xml`
- [ ] Check robots.txt at `/robots.txt`
- [ ] Confirm site URL is correct: `https://blog.curvelabs.eu`
- [ ] Add Google Search Console verification (if needed)
- [ ] Add Google Analytics (if needed)

## Files Modified

- `src/layouts/Base.astro` - Enhanced meta tags and Open Graph
- `src/pages/[slug].astro` - Article-specific SEO and structured data
- `src/pages/index.astro` - Homepage keywords
- `src/pages/explore.astro` - Explore page keywords
- `public/robots.txt` - Search engine directives

## Notes

Goal: When someone Googles "Curve Labs", the blog should rank high in results alongside the main site.

Current default OG image path: `/og-default.png` - **needs to be created** or update to existing logo.
