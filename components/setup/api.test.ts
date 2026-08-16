import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumeGitHubAuthReturn,
  getEditableArtifact,
  getGitHubAuthUrl,
  getOrgs,
  inviteTeammate,
  saveEditableArtifact,
  searchGithubUsers,
} from "./api";

describe("setup organization API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards an abort signal to organization discovery", async () => {
    const payload = {
      user: { login: "person", name: "Person" },
      orgs: [],
      personal: { login: "person", has_egregore: false },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(getOrgs("github-token", controller.signal)).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/org/setup/orgs"),
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
      }),
    );
  });

  it("searches GitHub users within the selected organization", async () => {
    const payload = { users: [{ login: "mia", avatar_url: "https://avatars.example/mia" }] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(
      searchGithubUsers("github-token", "mia studio", "Curve-Labs", controller.signal),
    ).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/github/users/search?q=mia+studio&org=Curve-Labs"),
      expect.objectContaining({
        method: "GET",
        signal: controller.signal,
        headers: expect.objectContaining({ Authorization: "Bearer github-token" }),
      }),
    );
  });

  it("creates an Egregore invite for the generated repo", async () => {
    const payload = {
      invite_url: "https://egregore.xyz/join?invite=inv_test",
      invited_username: "mia",
      github_invite: { status: "collaborator_invited" },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(inviteTeammate("github-token", {
      github_org: "Curve-Labs",
      github_username: "mia",
      repo_name: "egregore-studio",
      slug: "curvelabs-studio",
    })).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/org/invite"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          github_org: "Curve-Labs",
          github_username: "mia",
          repo_name: "egregore-studio",
          slug: "curvelabs-studio",
        }),
      }),
    );
  });

  it("returns from GitHub OAuth to the Desk without entering setup", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      location: { origin: "https://egregore.xyz" },
      sessionStorage: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    vi.stubGlobal("sessionStorage", window.sessionStorage);

    expect(getGitHubAuthUrl("/desk")).toContain("github.com/login/oauth/authorize");
    expect(consumeGitHubAuthReturn()).toBe("/desk");
    expect(consumeGitHubAuthReturn()).toBeNull();
  });

  it("returns from GitHub OAuth to the exact artifact editor", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      location: { origin: "https://egregore.xyz" },
      sessionStorage: {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    vi.stubGlobal("sessionStorage", window.sessionStorage);

    const target = "/edit?org=alpha&id=launch-note";
    const authUrl = getGitHubAuthUrl(target);

    expect(authUrl).toContain(encodeURIComponent("https://egregore.xyz/callback"));
    expect(consumeGitHubAuthReturn()).toBe(target);
  });

  it("rejects a cross-origin OAuth return target", () => {
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
