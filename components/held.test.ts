import { afterEach, expect, it, vi } from "vitest";

import held from "../netlify/edge-functions/held.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const DETAIL = "Temporarily unavailable during security recovery.";

function hold(path: string) {
  return held(new Request(`https://egregore.xyz${path}`));
}

function expectHeldHeaders(response: Response) {
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("netlify-cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
}

it.each([
  "/h/abc",
  "/emissary/e/abc",
  "/emissary/dataroom",
  "/@cem",
  "/@cem/example",
  "/connect/device",
  "/account/connect",
  "/deck",
  "/view/_/abc",
  "/view/someorg/abc",
])("answers %s with the held page", async (path) => {
  const response = await hold(path);
  expectHeldHeaders(response);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  const html = await response.text();
  expect(html).toContain("<h1>Temporarily unavailable</h1>");
  expect(html).toContain(
    "Some Egregore services are paused during security recovery. This link has not been deleted.",
  );
  expect(html).toContain("Local Egregore memory and search keep working.");
  expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
});

it.each([
  "/api/v1/x",
  "/api/auth/github/callback",
  "/api/emissary-metrics",
  "/api/org/setup/orgs",
  "/oauth/authorize",
  "/.well-known/oauth-authorization-server",
  "/emissary/manifest.json",
  "/emissary/raw/skill.md",
  "/emissary/plugin.zip",
  "/h/abc/reply",
  "/emissary/e/abc/raw",
  "/@cem/example/raw",
])("answers %s with held JSON", async (path) => {
  const response = await hold(path);
  expectHeldHeaders(response);
  expect(response.headers.get("content-type")).toContain("application/json");
  await expect(response.json()).resolves.toEqual({ detail: DETAIL });
});

it("never reaches the network", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await hold("/h/abc");
  await hold("/api/v1/x");
  expect(fetchMock).not.toHaveBeenCalled();
});
