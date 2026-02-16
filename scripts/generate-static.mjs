// Generate llms.txt, llms-full.txt, robots.txt, and sitemap.xml from content sources.
// Runs at build time before vite build — outputs to public/ so Vite copies them to dist/.

import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Dynamic imports from src/ (ES modules)
const { POSTS } = await import(resolve(root, "src/posts.js"));
const { ARTICLE_CONTENT } = await import(resolve(root, "src/content.js"));
const { DOCS_NAV, DOCS } = await import(resolve(root, "src/docs-content.js"));

const SITE = "https://egregore.xyz";
const DESCRIPTION = "Egregore is a shared intelligence layer for organizations using Claude Code. It gives teams persistent memory, async handoffs, and accumulated knowledge across sessions and people.";

// --- Block-to-markdown converter ---

function blocksToMarkdown(blocks) {
  const lines = [];
  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        lines.push(`## ${block.text}`, "");
        break;
      case "h3":
        lines.push(`### ${block.text}`, "");
        break;
      case "p":
        lines.push(block.text, "");
        break;
      case "quote":
        lines.push(...block.text.split("\n").map(l => `> ${l}`), "");
        break;
      case "code":
        lines.push("```", block.text, "```", "");
        break;
      case "list":
        for (const item of block.items) {
          lines.push(`- ${item}`);
        }
        lines.push("");
        break;
      case "table":
        if (block.rows.length > 0) {
          lines.push(`| ${block.rows[0].map(() => "---").join(" | ")} |`);
          for (const row of block.rows) {
            lines.push(`| ${row.join(" | ")} |`);
          }
          lines.push("");
        }
        break;
      case "note":
        lines.push(`> **Note:** ${block.text}`, "");
        break;
      case "divider":
        lines.push("---", "");
        break;
    }
  }
  return lines.join("\n").trim();
}

function firstSentence(text) {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 120).trim();
}

// --- Gather all doc items in nav order ---

const allDocs = [];
for (const group of DOCS_NAV) {
  for (const item of group.items) {
    const doc = DOCS[item.id];
    if (!doc) continue;
    const firstBlock = doc.blocks.find(b => b.type === "p");
    allDocs.push({
      id: item.id,
      title: doc.title,
      description: firstBlock ? firstSentence(firstBlock.text) : "",
      blocks: doc.blocks,
    });
  }
}

// --- llms.txt ---

function generateLlmsTxt() {
  const lines = [
    "# Egregore",
    `> ${DESCRIPTION}`,
    "",
    "## Docs",
  ];

  for (const doc of allDocs) {
    lines.push(`- [${doc.title}](${SITE}/docs#${doc.id}): ${doc.description}`);
  }

  lines.push("", "## Research");
  for (const post of POSTS) {
    lines.push(`- [${post.title}](${SITE}/research/${post.slug}): ${firstSentence(post.excerpt)}`);
  }

  lines.push("", "## Optional", `- [Full content](${SITE}/llms-full.txt)`);

  return lines.join("\n") + "\n";
}

// --- llms-full.txt ---

function generateLlmsFullTxt() {
  const lines = [
    "# Egregore",
    `> ${DESCRIPTION}`,
    "",
    "Terminal-native platform where humans and AI agents share persistent context and work together as a single organizational mind. Built on Claude Code, Git-based shared memory, and a Neo4j knowledge graph.",
    "",
    "---",
    "",
    "# Documentation",
    "",
  ];

  for (const doc of allDocs) {
    lines.push(`## ${doc.title}`, "", blocksToMarkdown(doc.blocks), "", "");
  }

  lines.push("---", "", "# Research", "");

  for (const post of POSTS) {
    const content = ARTICLE_CONTENT[post.slug];
    lines.push(`## ${post.title}`);
    lines.push(`By ${post.author} | ${post.date}`, "");
    if (content) {
      lines.push(blocksToMarkdown(content));
    } else {
      lines.push(post.excerpt);
    }
    lines.push("", "");
  }

  return lines.join("\n").trim() + "\n";
}

// --- robots.txt ---

function generateRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE}/sitemap.xml`,
    "",
  ].join("\n");
}

// --- sitemap.xml ---

function generateSitemapXml() {
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: SITE + "/", priority: "1.0" },
    { loc: SITE + "/research", priority: "0.8" },
    { loc: SITE + "/docs", priority: "0.8" },
  ];

  for (const post of POSTS) {
    urls.push({ loc: `${SITE}/research/${post.slug}`, priority: "0.7" });
  }

  const entries = urls.map(u =>
    `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

// --- Write all files ---

mkdirSync(resolve(root, "public"), { recursive: true });

const files = [
  ["public/llms.txt", generateLlmsTxt()],
  ["public/llms-full.txt", generateLlmsFullTxt()],
  ["public/robots.txt", generateRobotsTxt()],
  ["public/sitemap.xml", generateSitemapXml()],
];

console.log("Generating static files...");
for (const [path, content] of files) {
  writeFileSync(resolve(root, path), content);
  console.log(`  ✓ ${path}`);
}
console.log("Done.");
