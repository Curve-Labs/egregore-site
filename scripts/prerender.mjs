// Post-build prerenderer: generates per-route HTML files with real content in <div id="root">.
// Runs AFTER vite build. The edge function still handles meta tag injection at the edge,
// but this ensures Google's first crawl pass sees actual page content (not an empty div).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DIST = join(root, "dist");
const SITE_URL = "https://egregore.xyz";

const { POSTS } = await import(resolve(root, "src/posts.js"));
const { ARTICLE_CONTENT } = await import(resolve(root, "src/content.js"));
const { DOCS_NAV, DOCS } = await import(resolve(root, "src/docs-content.js"));

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Convert content blocks to semantic HTML
function blocksToHtml(blocks) {
  const parts = [];
  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        parts.push(`<h2>${escapeHtml(block.text)}</h2>`);
        break;
      case "h3":
        parts.push(`<h3>${escapeHtml(block.text)}</h3>`);
        break;
      case "lead":
        parts.push(`<p><em>${escapeHtml(block.text)}</em></p>`);
        break;
      case "p":
        parts.push(`<p>${escapeHtml(block.text).replace(/\n/g, "<br/>")}</p>`);
        break;
      case "quote":
        parts.push(`<blockquote>${escapeHtml(block.text).replace(/\n/g, "<br/>")}</blockquote>`);
        break;
      case "code":
        parts.push(`<pre><code>${escapeHtml(block.text)}</code></pre>`);
        break;
      case "list":
        parts.push(`<ul>${block.items.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`);
        break;
      case "note":
        parts.push(`<p><strong>Note:</strong> ${escapeHtml(block.text)}</p>`);
        break;
      case "table":
        if (block.rows && block.rows.length > 0) {
          const rows = block.rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("");
          parts.push(`<table>${rows}</table>`);
        }
        break;
      case "divider":
        parts.push("<hr/>");
        break;
    }
  }
  return parts.join("\n");
}

function buildJsonLd(meta) {
  if (meta.type === "article") {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      image: meta.ogImage,
      url: meta.canonical,
      author: meta.author ? { "@type": "Person", name: meta.author } : undefined,
      publisher: { "@type": "Organization", name: "Egregore", url: SITE_URL },
    });
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Egregore",
    description: meta.description,
    url: meta.canonical,
  });
}

function buildMetaTags(meta) {
  const lines = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${meta.canonical}" />`,
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="Egregore" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${meta.canonical}" />`,
    `<meta property="og:image" content="${meta.ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${meta.ogImage}" />`,
    `<script type="application/ld+json">${buildJsonLd(meta)}</script>`,
  ];
  return lines.join("\n    ");
}

// --- Build route definitions ---

const routes = {};

// Homepage
routes["/"] = {
  meta: {
    title: "Egregore — Shared Cognition for Teams and Agents",
    description: "A terminal-native platform where humans and AI agents share persistent context and work together as a single organizational mind.",
    ogImage: `${SITE_URL}/og/default.png`,
    canonical: SITE_URL,
    type: "website",
  },
  body: `<h1>Egregore — Shared Cognition for Teams and Agents</h1>
<p>A terminal-native platform where humans and AI agents share persistent context and work together as a single organizational mind. Built on Claude Code, Git-based shared memory, and a Neo4j knowledge graph.</p>
<h2>Research</h2>
<ul>
${POSTS.map(p => `  <li><a href="/research/${p.slug}">${escapeHtml(p.title)}</a> — ${escapeHtml(p.excerpt)}</li>`).join("\n")}
</ul>
<h2>Documentation</h2>
<p><a href="/docs">Read the docs</a> — installation, commands, architecture, and configuration.</p>`,
};

// Research listing
routes["/research"] = {
  meta: {
    title: "Research — Egregore",
    description: "Dispatches on shared cognition, coordination infrastructure, and what emerges when organizations develop memory.",
    ogImage: `${SITE_URL}/og/default.png`,
    canonical: `${SITE_URL}/research`,
    type: "website",
  },
  body: `<h1>Research</h1>
<p>Dispatches on shared cognition, coordination infrastructure, and what emerges when organizations develop memory.</p>
${POSTS.map(p => `<article>
  <h2><a href="/research/${p.slug}">${escapeHtml(p.title)}</a></h2>
  <p>${escapeHtml(p.excerpt)}</p>
  <p>${p.author ? escapeHtml(p.author) + " · " : ""}${p.date}</p>
</article>`).join("\n")}`,
};

// Article pages
for (const post of POSTS) {
  const content = ARTICLE_CONTENT[post.slug];
  const bodyHtml = content
    ? `<article>
  <h1>${escapeHtml(post.title)}</h1>
  <p>${post.author ? escapeHtml(post.author) + " · " : ""}${post.date}</p>
  ${blocksToHtml(content)}
</article>`
    : `<article>
  <h1>${escapeHtml(post.title)}</h1>
  <p>${post.author ? escapeHtml(post.author) + " · " : ""}${post.date}</p>
  <p>${escapeHtml(post.excerpt)}</p>
</article>`;

  routes[`/research/${post.slug}`] = {
    meta: {
      title: `${post.title} — Egregore`,
      description: post.excerpt,
      ogImage: `${SITE_URL}/og/${post.slug}.png`,
      canonical: `${SITE_URL}/research/${post.slug}`,
      type: "article",
      author: post.author,
    },
    body: bodyHtml,
  };
}

// Docs page
const docsBody = [];
docsBody.push("<h1>Documentation</h1>");
for (const group of DOCS_NAV) {
  docsBody.push(`<h2>${escapeHtml(group.group)}</h2>`);
  for (const item of group.items) {
    const doc = DOCS[item.id];
    if (!doc) continue;
    docsBody.push(`<h3>${escapeHtml(doc.title)}</h3>`);
    docsBody.push(blocksToHtml(doc.blocks));
  }
}

routes["/docs"] = {
  meta: {
    title: "Documentation — Egregore",
    description: "Architecture, setup, and usage documentation for Egregore — the shared intelligence layer for organizations using Claude Code.",
    ogImage: `${SITE_URL}/og/default.png`,
    canonical: `${SITE_URL}/docs`,
    type: "website",
  },
  body: docsBody.join("\n"),
};

// --- Generate HTML files ---

const template = readFileSync(join(DIST, "index.html"), "utf-8");

console.log("Prerendering routes...");

let count = 0;
for (const [path, route] of Object.entries(routes)) {
  let html = template;

  // Replace <head> meta block: strip existing title, description, OG, twitter, canonical tags
  html = html.replace(/<title>[^<]*<\/title>/, "");
  html = html.replace(/<meta\s+name="description"[^>]*\/>/, "");
  html = html.replace(/<link\s+rel="canonical"[^>]*\/>\s*/g, "");
  html = html.replace(/\s*<!-- Open Graph -->/, "");
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/>\s*/g, "");
  html = html.replace(/\s*<!-- Twitter -->\s*/, "\n    ");
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/>\s*/g, "");
  html = html.replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, "");

  // Insert our meta tags after viewport
  const metaTags = buildMetaTags(route.meta);
  html = html.replace(
    /(<meta\s+name="viewport"[^>]*\/>)/,
    `$1\n    ${metaTags}`
  );

  // Put real content inside <div id="root"> (React's createRoot will replace it on hydration)
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${route.body}</div>`
  );

  // Write to correct path
  const outDir = path === "/" ? DIST : join(DIST, ...path.split("/").filter(Boolean));
  if (path !== "/") {
    mkdirSync(outDir, { recursive: true });
  }

  writeFileSync(join(outDir, "index.html"), html);
  count++;
  console.log(`  ✓ ${path}`);
}

console.log(`Prerendered ${count} routes.`);
