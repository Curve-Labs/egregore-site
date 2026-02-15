import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "fs";

const POSTS = [
  { slug: "towards-shared-minds", title: "Towards Shared Minds", excerpt: "Magical times are upon us. Yet it somehow feels atomised. Everyone with their workflows, their agents, their terminals — all they can share is stories of their single-player adventures.", tag: "Philosophy", date: "Feb 2026" },
  { slug: "machinations-of-egregore", title: "Machinations of Egregore", excerpt: "Not a tool Claude connects to — an environment Claude operates within. Each group receives a self-contained workspace distributed through GitHub.", tag: "Architecture", date: "Feb 2026" },
  { slug: "context-gardening", title: "Context Gardening", excerpt: "Engineering is top-down. Gardening is bottom-up. The best context engineering is already being delegated to AI — the right move is to let it do the engineering.", tag: "Philosophy", date: "Feb 2026" },
  { slug: "interface-of-desire", title: "Interface of Desire", excerpt: "People create workarounds when tools don't match their natural workflow — copying conversation logs, writing 'here's what I tried' messages.", tag: "Research", date: "Feb 2026" },
  { slug: "emergent-governance", title: "Can Systems Learn How Organizations Should Work?", excerpt: "Most tools force organizations to pre-configure their governance. But optimal structure emerges through practice.", tag: "Governance", date: "Feb 2026" },
  { slug: "from-retrieval-to-synthesis", title: "From Retrieval to Synthesis", excerpt: "Current AI retrieval finds documents. Synthesis is harder — insight that emerges only from seeing patterns across many contexts simultaneously.", tag: "Research", date: "Feb 2026" },
  { slug: "async-handoffs-replace-standups", title: "Async Handoffs Replace Standups", excerpt: "The standup exists for one reason: context sync. When the system holds persistent state, the ritual can evolve.", tag: "Practice", date: "Jan 2026" },
  { slug: "economics-of-context", title: "The Economics of Organizational Memory", excerpt: "Why flat team pricing, what drives our costs, and how we think about building a sustainable business around context infrastructure.", tag: "Economics", date: "Jan 2026" },
];

// Fetch Courier Prime from Google Fonts
async function loadFont() {
  const url = "https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap";
  const css = await fetch(url).then((r) => r.text());
  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1];
  if (!fontUrl) throw new Error("Could not find font URL");
  const fontData = await fetch(fontUrl).then((r) => r.arrayBuffer());
  return fontData;
}

function card(post) {
  return {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        background: "#F4F1EA",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 70px",
        fontFamily: "Courier Prime",
      },
      children: [
        // Top: tag
        {
          type: "div",
          props: {
            style: {
              fontSize: "16px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#c8a55a",
            },
            children: post.tag,
          },
        },
        // Middle: title + excerpt
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "20px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "#1a1714",
                    lineHeight: 1.2,
                  },
                  children: post.title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "20px",
                    color: "#8a8578",
                    lineHeight: 1.6,
                  },
                  children: post.excerpt,
                },
              },
            ],
          },
        },
        // Bottom: site name + date
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #d4cfc5",
              paddingTop: "20px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "18px",
                    color: "#7A0F1B",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                  },
                  children: "Egregore",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "16px",
                    color: "#8a8578",
                  },
                  children: post.date,
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function main() {
  console.log("Generating OG images...");
  const fontData = await loadFont();

  mkdirSync("public/og", { recursive: true });

  for (const post of POSTS) {
    const svg = await satori(card(post), {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Courier Prime", data: fontData, weight: 400, style: "normal" },
        { name: "Courier Prime", data: fontData, weight: 700, style: "normal" },
      ],
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
    });
    const png = resvg.render().asPng();
    writeFileSync(`public/og/${post.slug}.png`, png);
    console.log(`  ✓ ${post.slug}.png`);
  }

  // Default OG image for homepage
  const defaultCard = {
    type: "div",
    props: {
      style: {
        width: "1200px",
        height: "630px",
        background: "#F4F1EA",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "24px",
        fontFamily: "Courier Prime",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: "64px",
              fontWeight: 700,
              color: "#1a1714",
              letterSpacing: "4px",
            },
            children: "EGREGORE",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: "22px",
              color: "#8a8578",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.6,
            },
            children: "Shared cognition for teams and agents.",
          },
        },
      ],
    },
  };

  const svg = await satori(defaultCard, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Courier Prime", data: fontData, weight: 400, style: "normal" },
      { name: "Courier Prime", data: fontData, weight: 700, style: "normal" },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  writeFileSync("public/og/default.png", resvg.render().asPng());
  console.log("  ✓ default.png");
  console.log("Done.");
}

main();
