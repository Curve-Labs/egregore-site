import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrgs } from "./api";

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
});
