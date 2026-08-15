import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeGitHubAuthReturn,
  getEditableArtifact,
  getGitHubAuthUrl,
  saveEditableArtifact,
} from "./api";

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

describe("artifact editor API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads a handoff through its canonical editor route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: "handoff-1",
      org: "",
      kind: "handoff",
      title: "Review",
      artifact_type: "handoff",
      html: "<html></html>",
      sha256: "a".repeat(64),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await getEditableArtifact("token", "", "handoff-1", "handoff");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/artifacts/edit/handoff/handoff-1"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends visible text changes when saving canonical artifacts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: "saved",
      id: "handoff-1",
      url: "https://egregore.xyz/h/handoff-1",
      html: "<html>New</html>",
      sha256: "b".repeat(64),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await saveEditableArtifact(
      "token",
      {
        id: "handoff-1",
        org: "",
        kind: "handoff",
        title: "Review",
        artifact_type: "handoff",
        html: "<html>Old</html>",
        sha256: "a".repeat(64),
      },
      "<html>New</html>",
      [{ before: "Old", after: "New" }],
    );

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("PUT");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      text_changes: [{ before: "Old", after: "New" }],
    });
  });
});
