import { describe, expect, it, vi } from "vitest";
import { pollTelegramConnection } from "./telegram-polling";

describe("pollTelegramConnection", () => {
  it("returns connected as soon as Telegram reports the group", async () => {
    const check = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const result = await pollTelegramConnection({
      check,
      signal: new AbortController().signal,
      intervalMs: 0,
    });

    expect(result).toBe("connected");
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("stops polling after the attempt limit", async () => {
    const check = vi.fn<() => Promise<boolean>>().mockResolvedValue(false);

    const result = await pollTelegramConnection({
      check,
      signal: new AbortController().signal,
      intervalMs: 0,
      maxAttempts: 4,
    });

    expect(result).toBe("delayed");
    expect(check).toHaveBeenCalledTimes(4);
  });

  it("surfaces repeated status API failures", async () => {
    const check = vi.fn<() => Promise<boolean>>().mockRejectedValue(new Error("offline"));

    const result = await pollTelegramConnection({
      check,
      signal: new AbortController().signal,
      intervalMs: 0,
      maxConsecutiveErrors: 3,
    });

    expect(result).toBe("error");
    expect(check).toHaveBeenCalledTimes(3);
  });

  it("stops when its caller is unmounted", async () => {
    const controller = new AbortController();
    controller.abort();
    const check = vi.fn<() => Promise<boolean>>();

    const result = await pollTelegramConnection({
      check,
      signal: controller.signal,
      intervalMs: 0,
    });

    expect(result).toBe("cancelled");
    expect(check).not.toHaveBeenCalled();
  });
});
