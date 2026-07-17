import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrgs, inviteTeammate, searchGithubUsers } from "./api";

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
});
