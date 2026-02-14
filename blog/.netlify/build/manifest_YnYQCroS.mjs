import '@astrojs/internal-helpers/path';
import '@astrojs/internal-helpers/remote';
import 'piccolore';
import { N as NOOP_MIDDLEWARE_HEADER, l as decodeKey } from './chunks/astro/server_B_xQNr3j.mjs';
import 'clsx';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///C:/curve_v2/egregore-curve-labs/blog/","cacheDir":"file:///C:/curve_v2/egregore-curve-labs/blog/node_modules/.astro/","outDir":"file:///C:/curve_v2/egregore-curve-labs/blog/dist/","srcDir":"file:///C:/curve_v2/egregore-curve-labs/blog/src/","publicDir":"file:///C:/curve_v2/egregore-curve-labs/blog/public/","buildClientDir":"file:///C:/curve_v2/egregore-curve-labs/blog/dist/","buildServerDir":"file:///C:/curve_v2/egregore-curve-labs/blog/.netlify/build/","adapterName":"@astrojs/netlify","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_slug_.Bhyh8V5o.css"},{"type":"inline","content":".container[data-astro-cid-zetdm5md]{max-width:600px}.error-page[data-astro-cid-zetdm5md]{padding:var(--space-3xl) 0;text-align:center}.error-code[data-astro-cid-zetdm5md]{font-family:var(--font-gothic);font-size:8rem;color:var(--text-dim);line-height:1;margin-bottom:var(--space-lg)}.error-message[data-astro-cid-zetdm5md]{font-family:var(--font-mono);font-size:1.5rem;color:var(--text);text-transform:uppercase;letter-spacing:.1em;margin-bottom:var(--space-md)}.error-desc[data-astro-cid-zetdm5md]{font-size:1rem;color:var(--text-soft);margin-bottom:var(--space-2xl)}.back-link[data-astro-cid-zetdm5md]{display:inline-flex;align-items:center;gap:var(--space-sm);font-family:var(--font-mono);font-size:.875rem;color:var(--accent);text-decoration:none;transition:color var(--transition-fast)}.back-link[data-astro-cid-zetdm5md]:hover{color:var(--text)}.back-arrow[data-astro-cid-zetdm5md]{transition:transform var(--transition-fast)}.back-link[data-astro-cid-zetdm5md]:hover .back-arrow[data-astro-cid-zetdm5md]{transform:translate(-4px)}\n"}],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_slug_.Bhyh8V5o.css"},{"type":"external","src":"/_astro/explore.CjzS21EH.css"}],"routeData":{"route":"/explore","isIndex":false,"type":"page","pattern":"^\\/explore\\/?$","segments":[[{"content":"explore","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/explore.astro","pathname":"/explore","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/og/[slug].png","isIndex":false,"type":"endpoint","pattern":"^\\/og\\/([^/]+?)\\.png\\/?$","segments":[[{"content":"og","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false},{"content":".png","dynamic":false,"spread":false}]],"params":["slug"],"component":"src/pages/og/[slug].png.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/rss.xml","isIndex":false,"type":"endpoint","pattern":"^\\/rss\\.xml\\/?$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.ts","pathname":"/rss.xml","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_slug_.Bhyh8V5o.css"},{"type":"external","src":"/_astro/_slug_.CuC5ytmJ.css"}],"routeData":{"route":"/[slug]","isIndex":false,"type":"page","pattern":"^\\/([^/]+?)\\/?$","segments":[[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_slug_.Bhyh8V5o.css"},{"type":"external","src":"/_astro/index.BU_xnkDk.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"site":"https://blog.curvelabs.eu","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["C:/curve_v2/egregore-curve-labs/blog/src/pages/404.astro",{"propagation":"none","containsHead":true}],["C:/curve_v2/egregore-curve-labs/blog/src/pages/[slug].astro",{"propagation":"in-tree","containsHead":true}],["C:/curve_v2/egregore-curve-labs/blog/src/pages/explore.astro",{"propagation":"in-tree","containsHead":true}],["C:/curve_v2/egregore-curve-labs/blog/src/pages/index.astro",{"propagation":"in-tree","containsHead":true}],["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/[slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astrojs-ssr-virtual-entry",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/explore@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/index@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/curve_v2/egregore-curve-labs/blog/src/pages/og/[slug].png.ts",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/og/[slug].png@_@ts",{"propagation":"in-tree","containsHead":false}],["C:/curve_v2/egregore-curve-labs/blog/src/pages/rss.xml.ts",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/rss.xml@_@ts",{"propagation":"in-tree","containsHead":false}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/explore@_@astro":"pages/explore.astro.mjs","\u0000@astro-page:src/pages/og/[slug].png@_@ts":"pages/og/_slug_.png.astro.mjs","\u0000@astro-page:src/pages/rss.xml@_@ts":"pages/rss.xml.astro.mjs","\u0000@astro-page:src/pages/[slug]@_@astro":"pages/_slug_.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_YnYQCroS.mjs","C:/curve_v2/egregore-curve-labs/blog/node_modules/unstorage/drivers/netlify-blobs.mjs":"chunks/netlify-blobs_DM36vZAS.mjs","C:\\curve_v2\\egregore-curve-labs\\blog\\.astro\\content-assets.mjs":"chunks/content-assets_DleWbedO.mjs","\u0000astro:assets":"chunks/_astro_assets_DRNP453i.mjs","C:\\curve_v2\\egregore-curve-labs\\blog\\.astro\\content-modules.mjs":"chunks/content-modules_BAkCaFRu.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_V5xKE1-v.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/async-handoffs-replace-standups.mdx?astroPropagatedAssets":"chunks/async-handoffs-replace-standups_iz7zuFqT.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/building-curve-labs.mdx?astroPropagatedAssets":"chunks/building-curve-labs_DjuY7Bo8.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/egregore.mdx?astroPropagatedAssets":"chunks/egregore_BqhSUXG_.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/emergent-governance.mdx?astroPropagatedAssets":"chunks/emergent-governance_CLdnH3BW.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/from-retrieval-to-synthesis.mdx?astroPropagatedAssets":"chunks/from-retrieval-to-synthesis_RSHeYS25.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/how-egregore-works.mdx?astroPropagatedAssets":"chunks/how-egregore-works_B9otk3J8.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/the-economics-of-context.mdx?astroPropagatedAssets":"chunks/the-economics-of-context_BDeUwGnR.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/async-handoffs-replace-standups.mdx":"chunks/async-handoffs-replace-standups_Cy7Xg863.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/building-curve-labs.mdx":"chunks/building-curve-labs_CrHHn2E4.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/egregore.mdx":"chunks/egregore_Bhw1s4x0.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/emergent-governance.mdx":"chunks/emergent-governance_BHBjMpfI.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/from-retrieval-to-synthesis.mdx":"chunks/from-retrieval-to-synthesis_Dl197Jb1.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/how-egregore-works.mdx":"chunks/how-egregore-works_C_WnT4fb.mjs","C:/curve_v2/egregore-curve-labs/blog/src/content/posts/the-economics-of-context.mdx":"chunks/the-economics-of-context_B-T6OnnX.mjs","C:/curve_v2/egregore-curve-labs/blog/src/components/Newsletter.astro?astro&type=script&index=0&lang.ts":"_astro/Newsletter.astro_astro_type_script_index_0_lang.D4iB26c9.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["C:/curve_v2/egregore-curve-labs/blog/src/components/Newsletter.astro?astro&type=script&index=0&lang.ts","const t=document.querySelector(\".newsletter-form\");t?.addEventListener(\"submit\",async n=>{n.preventDefault();const r=new FormData(t),e=t.querySelector(\".newsletter-btn\"),o=e.textContent;e.textContent=\"Sending...\",e.disabled=!0;try{if((await fetch(\"/\",{method:\"POST\",headers:{\"Content-Type\":\"application/x-www-form-urlencoded\"},body:new URLSearchParams(r).toString()})).ok)e.textContent=\"✓ Subscribed!\",t.querySelector(\".newsletter-input\").value=\"\";else throw new Error(\"Failed\")}catch{e.textContent=\"Error - try again\",e.disabled=!1}setTimeout(()=>{e.textContent=o,e.disabled=!1},3e3)});"]],"assets":["/_astro/_slug_.Bhyh8V5o.css","/_astro/explore.CjzS21EH.css","/_astro/_slug_.CuC5ytmJ.css","/_astro/index.BU_xnkDk.css","/curve_labs_logo_white.png","/favicon.svg","/robots.txt","/fonts/Gotham_Book.otf"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"5CSMzr7XWVr1TPkSzt+pFnwtz1CSLBqFJiXZpcEJqIA=","sessionConfig":{"driver":"netlify-blobs","options":{"name":"astro-sessions","consistency":"strong"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/netlify-blobs_DM36vZAS.mjs');

export { manifest };
