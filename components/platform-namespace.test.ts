import { afterEach, expect, it, vi } from "vitest";

import handler from "../netlify/edge-functions/platform-namespace.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("does not send an empty authorization header for a public address", async () => {
  let upstream: { url: string; headers: Headers } | undefined;
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    upstream = { url, headers: options.headers as Headers };
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }));

  const response = await handler(
    new Request("https://egregore.xyz/@cem/example"),
    { next: vi.fn() },
  );

  expect(response.status).toBe(200);
  expect(upstream?.url).toBe(
    "https://egregore-production-55f2.up.railway.app/@cem/example",
  );
  expect(upstream?.headers.has("authorization")).toBe(false);
});

it("keeps real bearer credentials and browser session cookies", async () => {
  let upstreamHeaders: Headers | undefined;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
    upstreamHeaders = options.headers as Headers;
    return new Response("ok", { status: 200 });
  }));

  await handler(new Request("https://egregore.xyz/@cem/example/raw", {
    headers: {
      authorization: "Bearer real-token",
      cookie: "eg_session=session-token",
    },
  }), { next: vi.fn() });

  expect(upstreamHeaders?.get("authorization")).toBe("Bearer real-token");
  expect(upstreamHeaders?.get("cookie")).toBe("eg_session=session-token");
});
