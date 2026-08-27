import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const config = readFileSync(resolve(process.cwd(), "netlify.toml"), "utf8");

describe("Simurgh public edge", () => {
  it("proxies the hosted Emissary surface to Railway before the catch-all", () => {
    const rule = `[[redirects]]
  from = "/simurgh/*"
  to = "https://egregore-production-55f2.up.railway.app/simurgh/:splat"
  status = 200
  force = true`;

    const first = config.indexOf(rule);
    expect(first).toBeGreaterThan(-1);
    expect(config.indexOf(rule, first + 1)).toBe(-1);
    expect(first).toBeLessThan(config.indexOf('from = "/*"'));
  });

  it("keeps Simurgh data calls behind the existing same-origin API proxy", () => {
    expect(config).toContain(`from = "/api/v1/*"
  to = "https://egregore-production-55f2.up.railway.app/api/v1/:splat"`);
  });
});
