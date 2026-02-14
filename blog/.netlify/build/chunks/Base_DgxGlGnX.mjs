import { c as createComponent, m as maybeRenderHead, b as addAttribute, a as renderTemplate, e as createAstro, g as renderHead, r as renderComponent, h as renderSlot } from './astro/server_B_xQNr3j.mjs';
import 'piccolore';
/* empty css                          */
import 'clsx';

const $$Nav = createComponent(($$result, $$props, $$slots) => {
  const navItems = [
    { label: "Archive", href: "/#archive", num: "01" },
    { label: "Explore", href: "/#explore", num: "02" },
    { label: "Social", href: "/#social", num: "03" },
    { label: "Connect", href: "/#connect", num: "04" }
  ];
  return renderTemplate`${maybeRenderHead()}<nav class="nav" data-astro-cid-dmqpwcec> <div class="nav-inner" data-astro-cid-dmqpwcec> <a href="/" class="logo" data-astro-cid-dmqpwcec> <img src="/curve_labs_logo_white.png" alt="Curve Labs" class="logo-icon" data-astro-cid-dmqpwcec> <span class="logo-text" data-astro-cid-dmqpwcec>Curve Labs</span> </a> <ul class="nav-links" data-astro-cid-dmqpwcec> ${navItems.map((item) => renderTemplate`<li data-astro-cid-dmqpwcec> <a${addAttribute(item.href, "href")} class="nav-link" data-astro-cid-dmqpwcec> <span class="nav-num" data-astro-cid-dmqpwcec>[${item.num}]</span> <span class="nav-label" data-astro-cid-dmqpwcec>${item.label}</span> </a> </li>`)} </ul> </div> </nav> `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/Nav.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<footer class="footer" data-astro-cid-sz7xmlte> <div class="footer-inner" data-astro-cid-sz7xmlte> <div class="footer-brand" data-astro-cid-sz7xmlte> <span class="footer-logo" data-astro-cid-sz7xmlte>CURVE LABS</span> <div class="footer-address" data-astro-cid-sz7xmlte> <span data-astro-cid-sz7xmlte>c/o Factory Works GmbH</span> <span data-astro-cid-sz7xmlte>Rheinsberger Str. 76/77</span> <span data-astro-cid-sz7xmlte>10115 Berlin</span> </div> </div> <div class="footer-links" data-astro-cid-sz7xmlte> <div class="footer-section" data-astro-cid-sz7xmlte> <span class="footer-heading" data-astro-cid-sz7xmlte>Product</span> <a href="/" data-astro-cid-sz7xmlte>Blog</a> <a href="https://curvelabs.eu" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>Main Site</a> </div> <div class="footer-section" data-astro-cid-sz7xmlte> <span class="footer-heading" data-astro-cid-sz7xmlte>Connect</span> <a href="https://x.com/curvelabs" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>Twitter</a> <a href="https://www.linkedin.com/company/curve-labs/" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>LinkedIn</a> <a href="https://github.com/Curve-Labs" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>GitHub</a> <a href="https://blog.curvelabs.eu/" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>Medium</a> </div> </div> </div> <div class="footer-bottom" data-astro-cid-sz7xmlte> <span data-astro-cid-sz7xmlte>© 2020 CL Cybernetix GmbH.</span> </div> </footer> `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/components/Footer.astro", void 0);

const $$Astro = createAstro("https://blog.curvelabs.eu");
const $$Base = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Base;
  const {
    title,
    description = "Research notes, project updates, and dispatches from Curve Labs.",
    image = "/og-default.png",
    keywords = "Curve Labs, knowledge graphs, AI agents, multi-agent systems, distributed systems, cybernetics, protocol design",
    type = "website",
    publishedTime,
    author
  } = Astro2.props;
  const canonicalURL = new URL(Astro2.url.pathname, Astro2.site);
  const imageURL = new URL(image, Astro2.site);
  return renderTemplate`<html lang="en" data-astro-cid-5hce7sga> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="icon" type="image/png" href="/curve_labs_logo_white.png"><link rel="sitemap" href="/sitemap-index.xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet"><link rel="alternate" type="application/rss+xml" title="Curve Labs Blog" href="/rss.xml"><title>${title} | Curve Labs</title><meta name="description"${addAttribute(description, "content")}><meta name="keywords"${addAttribute(keywords, "content")}><meta name="author"${addAttribute(author || "Curve Labs", "content")}><link rel="canonical"${addAttribute(canonicalURL, "href")}><!-- Open Graph --><meta property="og:type"${addAttribute(type, "content")}><meta property="og:site_name" content="Curve Labs Blog"><meta property="og:url"${addAttribute(canonicalURL, "content")}><meta property="og:title"${addAttribute(`${title} | Curve Labs`, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:image"${addAttribute(imageURL, "content")}><meta property="og:image:alt"${addAttribute(title, "content")}><meta property="og:locale" content="en_US">${publishedTime && renderTemplate`<meta property="article:published_time"${addAttribute(publishedTime, "content")}>`}${author && renderTemplate`<meta property="article:author"${addAttribute(author, "content")}>`}<!-- Twitter --><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@curvelabs"><meta name="twitter:creator" content="@curvelabs"><meta name="twitter:title"${addAttribute(`${title} | Curve Labs`, "content")}><meta name="twitter:description"${addAttribute(description, "content")}><meta name="twitter:image"${addAttribute(imageURL, "content")}><meta name="twitter:image:alt"${addAttribute(title, "content")}><!-- Additional SEO --><meta name="robots" content="index, follow"><meta name="googlebot" content="index, follow"><meta name="theme-color" content="#09090B">${renderHead()}</head> <body data-astro-cid-5hce7sga> ${renderComponent($$result, "Nav", $$Nav, { "data-astro-cid-5hce7sga": true })} <main data-astro-cid-5hce7sga> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, { "data-astro-cid-5hce7sga": true })} </body></html>`;
}, "C:/curve_v2/egregore-curve-labs/blog/src/layouts/Base.astro", void 0);

export { $$Base as $ };
