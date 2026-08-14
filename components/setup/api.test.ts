import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { consumeGitHubAuthReturn, getGitHubAuthUrl } from "./api";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  get length() { return this.values.size; }
}

describe("GitHub auth return", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { origin: "https://egregore.xyz" } },
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "sessionStorage");
  });

  it("returns to the exact artifact editor after OAuth", () => {
    const target = "/edit?org=alpha&id=launch-note";
    const authUrl = getGitHubAuthUrl(target);

    expect(authUrl).toContain("github.com/login/oauth/authorize");
    expect(authUrl).toContain(encodeURIComponent("https://egregore.xyz/callback"));
    expect(consumeGitHubAuthReturn()).toBe(target);
    expect(consumeGitHubAuthReturn()).toBeNull();
  });

  it("does not persist a cross-origin return target", () => {
    getGitHubAuthUrl("//attacker.example/path");
    expect(consumeGitHubAuthReturn()).toBeNull();
  });
});
