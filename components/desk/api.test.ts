import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemberships } from "./api";

describe("Agent Desk API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the same-origin HttpOnly session when no setup token exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ memberships: [{ org_slug: "curvelabs", org_name: "Curve Labs" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMemberships(null)).resolves.toEqual([
      { org_slug: "curvelabs", org_name: "Curve Labs" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tasks/desk/session",
      expect.objectContaining({
        credentials: "include",
        headers: expect.not.objectContaining({ Authorization: expect.anything() }),
      }),
    );
  });
});
