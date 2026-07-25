export type TelegramConnectionPhase =
  | "waiting"
  | "connected"
  | "delayed"
  | "error"
  | "cancelled";

type PollTelegramConnectionOptions = {
  check: () => Promise<boolean>;
  signal: AbortSignal;
  intervalMs?: number;
  maxAttempts?: number;
  maxConsecutiveErrors?: number;
};

function waitForNextAttempt(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted || ms <= 0) {
      resolve();
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export async function pollTelegramConnection({
  check,
  signal,
  intervalMs = 3000,
  maxAttempts = 20,
  maxConsecutiveErrors = 3,
}: PollTelegramConnectionOptions): Promise<TelegramConnectionPhase> {
  let consecutiveErrors = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal.aborted) return "cancelled";

    try {
      if (await check()) return "connected";
      consecutiveErrors = 0;
    } catch {
      consecutiveErrors += 1;
      if (consecutiveErrors >= maxConsecutiveErrors) return "error";
    }

    if (attempt < maxAttempts - 1) {
      await waitForNextAttempt(intervalMs, signal);
    }
  }

  return signal.aborted ? "cancelled" : "delayed";
}
