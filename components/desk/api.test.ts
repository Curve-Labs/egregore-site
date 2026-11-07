import { afterEach, describe, expect, it, vi } from "vitest";
import { approvePlan, completeTask, getMemberships, retryTask, type Task } from "./api";

const task = {
  id: "task-3",
  org_slug: "curvelabs",
  title: "Ship the desk",
  description: "Complete the hosted task lifecycle.",
  kind: "code",
  status: "awaiting_plan_approval",
  priority: 50,
  network_policy: "off",
  plan_version: 2,
  plan_content_hash: "plan-hash",
  row_version: 7,
} satisfies Task;

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

  it("sends the selected live executor with plan approval", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => task });
    vi.stubGlobal("fetch", fetchMock);

    await approvePlan(null, task, "claude");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tasks/task-3/approve-plan",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          plan_version: 2,
          plan_content_hash: "plan-hash",
          channel: "desk",
          executor: "claude",
        }),
      }),
    );
  });

  it("completes a reviewed task with row-version fencing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...task, status: "done" }) });
    vi.stubGlobal("fetch", fetchMock);

    await completeTask(null, { ...task, status: "ready_for_you" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tasks/task-3/complete",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ expected_row_version: 7, channel: "desk" }),
      }),
    );
  });

  it("retries a failed task with row-version fencing and selected executor", async () => {
    const failed = { ...task, status: "failed" as const };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...failed, status: "queued" }) });
    vi.stubGlobal("fetch", fetchMock);

    await retryTask(null, failed, "codex");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/tasks/task-3/retry",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          expected_row_version: 7,
          executor: "codex",
          channel: "desk",
        }),
      }),
    );
  });
});
