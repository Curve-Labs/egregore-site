import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Import the real edge handler without a bundler or dependency installation.
// No native network request is permitted, including during module loading.
globalThis.fetch = async () => {
  throw new Error("Network is disabled in deck tests");
};
const source = await readFile(new URL("../netlify/edge-functions/deck.js", import.meta.url));
const { default: deck } = await import(`data:text/javascript;base64,${source.toString("base64")}`);
const upstream = "https://egregore-production-55f2.up.railway.app/api/artifacts/curvelabs/egregore-raise-deck";

for (const viewport of [true, false]) {
  test(`deck isolates organization HTML and preserves rendering (viewport=${viewport})`, async (t) => {
    const content = "<script>window.deckLoaded = true</script><h1>Original deck</h1>";
    const html = `<html><head>${viewport ? '<meta name="viewport" content="width=device-width">' : ""}</head><body>${content}</body></html>`;
    const fetch = t.mock.method(globalThis, "fetch", async (url) => {
      return new Response(html, { headers: {
        "content-security-policy": "default-src *; script-src * 'unsafe-inline'",
        "set-cookie": "upstream-session=fixture-only",
      } });
    });

    const response = await deck();
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(fetch.mock.calls[0].arguments[0], upstream);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-security-policy"),
      "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox " +
      "allow-forms allow-modals allow-downloads; frame-ancestors 'none'");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(response.headers.get("cache-control"), "public, max-age=300");
    const rendered = await response.text();
    assert.ok(rendered.includes(content));
    assert.ok(rendered.includes('<meta property="og:url" content="https://egregore.xyz/deck" />'));
    assert.ok(rendered.includes('<meta property="og:title" content="Egregore — Raise Deck" />'));
  });
}

for (const failure of ["fetch", "status", "body"]) {
  test(`upstream ${failure} failure preserves the canonical redirect`, async (t) => {
    const fetch = t.mock.method(globalThis, "fetch", async (url) => {
      if (failure === "fetch") throw new Error("fixture unavailable");
      if (failure === "status") return new Response("unavailable", { status: 503 });
      return { ok: true, text: async () => { throw new Error("fixture unreadable"); } };
    });
    const response = await deck();
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(fetch.mock.calls[0].arguments[0], upstream);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://egregore.xyz/view/curvelabs/egregore-raise-deck");
  });
}
