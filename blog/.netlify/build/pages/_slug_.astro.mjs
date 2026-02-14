import { e as createAstro, c as createComponent, a as renderTemplate, r as renderComponent, m as maybeRenderHead, u as unescapeHTML, b as addAttribute } from '../chunks/astro/server_B_xQNr3j.mjs';
import 'piccolore';
import { g as getCollection } from '../chunks/_astro_content_CiI689C0.mjs';
import { $ as $$Base } from '../chunks/Base_DgxGlGnX.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a, _b;
const $$Astro = createAstro("https://blog.curvelabs.eu");
async function getStaticPaths() {
  const posts = await getCollection("posts");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  let post = Astro2.props.post;
  if (!post) {
    const posts = await getCollection("posts");
    post = posts.find((p) => p.slug === slug);
    if (!post) {
      return Astro2.redirect("/404");
    }
  }
  const { title, subtitle, date, readTime, category, author, tags } = post.data;
  const { Content, headings } = await post.render();
  const ogImage = "https://blog.curvelabs.eu/curve_labs_logo_white.png";
  const tocHeadings = headings.filter((h) => h.depth === 2 || h.depth === 3);
  const postDate = date instanceof Date ? date : new Date(date);
  if (isNaN(postDate.getTime())) {
    console.error(`[slug].astro: Invalid date for post ${post.slug}:`, date);
  }
  const articleUrl = `https://blog.curvelabs.eu/${post.slug}`;
  const hashtagString = tags && tags.length > 0 ? tags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ") : "";
  const twitterText = `${title}

${subtitle || ""}

${hashtagString}

via @curvelabs`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(articleUrl)}`;
  const articleKeywords = tags && tags.length > 0 ? tags.join(", ") + ", Curve Labs, research" : "Curve Labs, research";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: subtitle || title,
    image: ogImage,
    datePublished: postDate.toISOString(),
    dateModified: postDate.toISOString(),
    author: {
      "@type": "Person",
      name: author || "Curve Labs"
    },
    publisher: {
      "@type": "Organization",
      name: "Curve Labs",
      logo: {
        "@type": "ImageObject",
        url: "https://blog.curvelabs.eu/curve_labs_logo_white.png"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl
    },
    keywords: tags && tags.length > 0 ? tags.join(", ") : void 0
  };
  return renderTemplate(_b || (_b = __template(["", `   <script>
  // Highlight current section in TOC as user scrolls
  document.addEventListener('DOMContentLoaded', function() {
    const tocLinks = document.querySelectorAll('.toc-nav a');
    const headings = document.querySelectorAll('.post-content h2, .post-content h3');

    if (tocLinks.length === 0 || headings.length === 0) return;

    function updateActiveLink() {
      let current = '';

      headings.forEach(function(heading) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 150) {
          current = heading.id;
        }
      });

      tocLinks.forEach(function(link) {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
          link.classList.add('active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();

    // Copy link button
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        const shareText = copyBtn.dataset.shareText;
        navigator.clipboard.writeText(shareText).then(function() {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          setTimeout(function() {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
          }, 2000);
        });
      });
    }
  });
<\/script>`])), renderComponent($$result, "Base", $$Base, { "title": title, "description": subtitle || title, "image": ogImage, "keywords": articleKeywords, "type": "article", "publishedTime": postDate.toISOString(), "author": author || "Curve Labs", "data-astro-cid-yvbahnfj": true }, { "default": async ($$result2) => renderTemplate(_a || (_a = __template([" ", '<div class="article-layout" data-astro-cid-yvbahnfj> <aside class="back-sidebar" data-astro-cid-yvbahnfj> <a href="/" class="back-link" data-astro-cid-yvbahnfj> <span class="back-arrow" data-astro-cid-yvbahnfj>\u2190</span> <span data-astro-cid-yvbahnfj>Back to blog</span> </a> </aside> <article class="post" data-astro-cid-yvbahnfj> <!-- Structured Data --> <script type="application/ld+json">', '<\/script> <!-- Post Header --> <header class="post-header" data-astro-cid-yvbahnfj> <div class="post-meta" data-astro-cid-yvbahnfj> <span class="category" data-astro-cid-yvbahnfj>', '</span> <span class="divider" data-astro-cid-yvbahnfj>\u2022</span> <time', " data-astro-cid-yvbahnfj> ", ' </time> <span class="divider" data-astro-cid-yvbahnfj>\u2022</span> <span class="read-time" data-astro-cid-yvbahnfj>', '</span> </div> <h1 class="post-title" data-astro-cid-yvbahnfj>', "</h1> ", ' <div class="post-author" data-astro-cid-yvbahnfj> <span class="author-label" data-astro-cid-yvbahnfj>by</span> <span class="author-name" data-astro-cid-yvbahnfj>', '</span> </div> </header> <!-- Post Content --> <div class="post-content" data-astro-cid-yvbahnfj> ', ' </div> <!-- Post Footer --> <footer class="post-footer" data-astro-cid-yvbahnfj> ', ' <div class="footer-divider" data-astro-cid-yvbahnfj> <div class="line" data-astro-cid-yvbahnfj></div> <div class="diamond" data-astro-cid-yvbahnfj></div> <div class="line" data-astro-cid-yvbahnfj></div> </div> <a href="/" class="back-link mobile-back" data-astro-cid-yvbahnfj> <span class="back-arrow" data-astro-cid-yvbahnfj>\u2190</span> <span data-astro-cid-yvbahnfj>Back to blog</span> </a> </footer> </article> <aside class="toc-sidebar" data-astro-cid-yvbahnfj> ', ' <div class="share-section" data-astro-cid-yvbahnfj> <span class="share-title" data-astro-cid-yvbahnfj>Share</span> <div class="share-buttons" data-astro-cid-yvbahnfj> <a', ' target="_blank" rel="noopener noreferrer" class="share-btn" title="Share on X" data-astro-cid-yvbahnfj> <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-yvbahnfj><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" data-astro-cid-yvbahnfj></path></svg> </a> <a', ' target="_blank" rel="noopener noreferrer" class="share-btn" title="Share on LinkedIn" data-astro-cid-yvbahnfj> <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-yvbahnfj><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" data-astro-cid-yvbahnfj></path></svg> </a> <button class="share-btn copy-btn" title="Copy link"', "", ' data-astro-cid-yvbahnfj> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" data-astro-cid-yvbahnfj><rect x="9" y="9" width="13" height="13" rx="2" ry="2" data-astro-cid-yvbahnfj></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" data-astro-cid-yvbahnfj></path></svg> </button> </div> </div> </aside> </div> '])), maybeRenderHead(), unescapeHTML(JSON.stringify(structuredData)), category, addAttribute(postDate.toISOString(), "datetime"), postDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), readTime, title, subtitle && renderTemplate`<p class="post-subtitle" data-astro-cid-yvbahnfj>${subtitle}</p>`, author || "Curve Labs", renderComponent($$result2, "Content", Content, { "data-astro-cid-yvbahnfj": true }), tags && tags.length > 0 && renderTemplate`<div class="post-tags" data-astro-cid-yvbahnfj> ${tags.map((tag) => renderTemplate`<a${addAttribute(`/?tag=${encodeURIComponent(tag)}#explore`, "href")} class="tag" data-astro-cid-yvbahnfj>#${tag}</a>`)} </div>`, tocHeadings.length > 0 && renderTemplate`<nav class="toc-nav" data-astro-cid-yvbahnfj> <span class="toc-title" data-astro-cid-yvbahnfj>Contents</span> <ul data-astro-cid-yvbahnfj> ${tocHeadings.map((heading) => renderTemplate`<li${addAttribute(heading.depth === 3 ? "toc-h3" : "", "class")} data-astro-cid-yvbahnfj> <a${addAttribute(`#${heading.slug}`, "href")} data-astro-cid-yvbahnfj>${heading.text}</a> </li>`)} </ul> </nav>`, addAttribute(twitterUrl, "href"), addAttribute(linkedinUrl, "href"), addAttribute(articleUrl, "data-url"), addAttribute(`${title}

${subtitle || ""}

${hashtagString}

${articleUrl}`, "data-share-text")) }));
}, "C:/curve_v2/egregore-curve-labs/blog/src/pages/[slug].astro", void 0);

const $$file = "C:/curve_v2/egregore-curve-labs/blog/src/pages/[slug].astro";
const $$url = "/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
