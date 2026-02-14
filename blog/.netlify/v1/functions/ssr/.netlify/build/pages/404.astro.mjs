import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_B_xQNr3j.mjs';
import 'piccolore';
import { $ as $$Base } from '../chunks/Base_DgxGlGnX.mjs';
/* empty css                               */
export { renderers } from '../renderers.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "Not Found", "data-astro-cid-zetdm5md": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="container" data-astro-cid-zetdm5md> <div class="error-page" data-astro-cid-zetdm5md> <h1 class="error-code" data-astro-cid-zetdm5md>404</h1> <p class="error-message" data-astro-cid-zetdm5md>Page not found</p> <p class="error-desc" data-astro-cid-zetdm5md>The page you're looking for doesn't exist or has been moved.</p> <a href="/" class="back-link" data-astro-cid-zetdm5md> <span class="back-arrow" data-astro-cid-zetdm5md>←</span> <span data-astro-cid-zetdm5md>Back to home</span> </a> </div> </div> ` })} `;
}, "C:/curve_v2/egregore-curve-labs/blog/src/pages/404.astro", void 0);

const $$file = "C:/curve_v2/egregore-curve-labs/blog/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
